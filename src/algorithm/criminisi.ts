import { imageToLabArray } from './colorSpace';
import { computeLuminanceGradients } from './gradient';
import { identifyFillFront, smoothMask } from './normal';
import { findBestMatchingPatch } from './patchSearch';
import { findMaxPriorityPatch } from './priority';
import type { InpaintingConfig, InpaintingStats, Point } from './types';

/**
 * Criminisi, Pérez & Toyama (IEEE TIP 2004)
 * "Region Filling and Object Removal by Exemplar-Based Image Inpainting"
 */

export interface StepCallbackData {
  stats: InpaintingStats;
  currentPatch?: Point;
  sourcePatch?: Point;
  frontPoints: Point[];
  shouldYield?: boolean;
}

export type StepCallback = (data: StepCallbackData) => boolean; // return false to cancel

export function runCriminisiInpainting(
  inputImageData: ImageData,
  maskArray: Uint8Array,
  config: InpaintingConfig,
  onProgress?: StepCallback
): { resultImageData: ImageData; stats: InpaintingStats } {
  const width = inputImageData.width;
  const height = inputImageData.height;
  const pixelCount = width * height;

  // Clone RGBA buffer so we do not mutate original
  const rgba = new Uint8ClampedArray(inputImageData.data);
  const mask = new Uint8Array(maskArray);
  const initialMask = new Uint8Array(maskArray);

  // Precompute CIE Lab colors
  const labData = imageToLabArray(rgba, width, height);

  // Initialize confidence map C(p)
  // C(p) = 0 for p in hole, 1 for p in known image
  const confidence = new Float32Array(pixelCount);
  let initialHoleCount = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (mask[i] === 1) {
      confidence[i] = 0;
      initialHoleCount++;
    } else {
      confidence[i] = 1;
    }
  }

  const startTime = performance.now();
  let remainingHole = initialHoleCount;
  let iterations = 0;
  const maxIters = config.maxIterations ?? initialHoleCount + 500;

  if (initialHoleCount === 0) {
    const resultImageData =
      typeof ImageData !== 'undefined'
        ? new ImageData(rgba, width, height)
        : ({ data: rgba, width, height } as unknown as ImageData);
    return {
      resultImageData,
      stats: {
        totalHolePixels: 0,
        remainingHolePixels: 0,
        filledPixels: 0,
        iterations: 0,
        elapsedMs: 0,
        percentComplete: 100,
      },
    };
  }

  // Iterative inpainting loop
  while (remainingHole > 0 && iterations < maxIters) {
    iterations++;

    // Step 1: Identify fill front δΩ
    const { frontPoints } = identifyFillFront(mask, width, height);
    if (frontPoints.length === 0) break;

    // Compute bounding box of current hole (for windowed search option)
    let minHx = width;
    let maxHx = 0;
    let minHy = height;
    let maxHy = 0;
    for (let i = 0; i < frontPoints.length; i++) {
      const pt = frontPoints[i];
      if (pt.x < minHx) minHx = pt.x;
      if (pt.x > maxHx) maxHx = pt.x;
      if (pt.y < minHy) minHy = pt.y;
      if (pt.y > maxHy) maxHy = pt.y;
    }

    // Step 2: Compute smoothed mask for normal np computation
    const smoothedMask = smoothMask(mask, width, height);

    // Compute luminance gradients on known pixels
    const gradients = computeLuminanceGradients(rgba, mask, width, height);

    // Compute priorities P(p) and find patch with highest priority
    const bestPatch = findMaxPriorityPatch(
      frontPoints,
      config.patchRadius,
      confidence,
      gradients,
      smoothedMask,
      mask,
      width,
      height,
      config.epsilon
    );

    if (!bestPatch) break;

    const targetCenter = bestPatch.p;
    const patchRadius = config.patchRadius;

    // Step 3: Find best matching exemplar source patch Ψ_q̂
    const sourceCenter = findBestMatchingPatch(
      targetCenter.x,
      targetCenter.y,
      mask,
      initialMask,
      rgba,
      labData,
      width,
      height,
      { minX: minHx, maxX: maxHx, minY: minHy, maxY: maxHy },
      {
        patchRadius: config.patchRadius,
        useLab: config.colorSpace === 'lab',
        searchWindowScale: config.searchWindowScale,
        stride: config.subsamplingStep,
      }
    );

    if (!sourceCenter) {
      // Fallback: if no valid patch was found, fill with local average of known pixels
      fillPatchFallback(
        targetCenter.x,
        targetCenter.y,
        patchRadius,
        rgba,
        mask,
        confidence,
        labData,
        bestPatch.confidence,
        width,
        height
      );
    } else {
      // Step 4: Copy patch data and update confidence
      // For each pixel in Ψ_p̂ ∩ Ω:
      // Copy RGB and Lab from Ψ_q̂
      // Update C(p) = C(p̂)
      // Clear mask[p] = 0
      const targetC = bestPatch.confidence;

      for (let dy = -patchRadius; dy <= patchRadius; dy++) {
        const ty = targetCenter.y + dy;
        const sy = sourceCenter.y + dy;
        if (ty < 0 || ty >= height || sy < 0 || sy >= height) continue;

        const targetRow = ty * width;
        const sourceRow = sy * width;

        for (let dx = -patchRadius; dx <= patchRadius; dx++) {
          const tx = targetCenter.x + dx;
          const sx = sourceCenter.x + dx;
          if (tx < 0 || tx >= width || sx < 0 || sx >= width) continue;

          const tIdx = targetRow + tx;
          const sIdx = sourceRow + sx;

          // Only overwrite pixels that are inside the hole
          if (mask[tIdx] === 1) {
            // Copy RGBA
            const tRgba = tIdx * 4;
            const sRgba = sIdx * 4;
            rgba[tRgba] = rgba[sRgba];
            rgba[tRgba + 1] = rgba[sRgba + 1];
            rgba[tRgba + 2] = rgba[sRgba + 2];
            rgba[tRgba + 3] = 255;

            // Copy Lab
            const tLab = tIdx * 3;
            const sLab = sIdx * 3;
            labData[tLab] = labData[sLab];
            labData[tLab + 1] = labData[sLab + 1];
            labData[tLab + 2] = labData[sLab + 2];

            // Update confidence: C(p) = C(p̂)
            confidence[tIdx] = targetC;

            // Remove from hole
            mask[tIdx] = 0;
            remainingHole--;
          }
        }
      }
    }

    // Progress update
    if (onProgress) {
      const now = performance.now();
      const filled = initialHoleCount - remainingHole;
      const stats: InpaintingStats = {
        totalHolePixels: initialHoleCount,
        remainingHolePixels: remainingHole,
        filledPixels: filled,
        iterations,
        elapsedMs: now - startTime,
        percentComplete: Math.min(100, (filled / initialHoleCount) * 100),
        currentPatchCenter: targetCenter,
        bestSourceCenter: sourceCenter ?? undefined,
      };

      const continueRun = onProgress({
        stats,
        currentPatch: targetCenter,
        sourcePatch: sourceCenter ?? undefined,
        frontPoints,
      });

      if (!continueRun) break;
    }
  }

  const finalDuration = performance.now() - startTime;
  const finalFilled = initialHoleCount - remainingHole;
  const resultImageData =
    typeof ImageData !== 'undefined'
      ? new ImageData(rgba, width, height)
      : ({ data: rgba, width, height } as unknown as ImageData);

  return {
    resultImageData,
    stats: {
      totalHolePixels: initialHoleCount,
      remainingHolePixels: remainingHole,
      filledPixels: finalFilled,
      iterations,
      elapsedMs: finalDuration,
      percentComplete: initialHoleCount > 0 ? (finalFilled / initialHoleCount) * 100 : 100,
    },
  };
}

/**
 * Fallback filling if no valid exemplar patch exists (rare edge case)
 */
function fillPatchFallback(
  cx: number,
  cy: number,
  radius: number,
  rgba: Uint8ClampedArray,
  mask: Uint8Array,
  confidence: Float32Array,
  _labData: Float32Array,
  targetConfidence: number,
  width: number,
  height: number
) {
  let avgR = 0, avgG = 0, avgB = 0, count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= height) continue;
    const row = y * width;
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= width) continue;
      const idx = row + x;
      if (mask[idx] === 0) {
        const off = idx * 4;
        avgR += rgba[off];
        avgG += rgba[off + 1];
        avgB += rgba[off + 2];
        count++;
      }
    }
  }

  if (count > 0) {
    avgR = Math.round(avgR / count);
    avgG = Math.round(avgG / count);
    avgB = Math.round(avgB / count);

    for (let dy = -radius; dy <= radius; dy++) {
      const y = cy + dy;
      if (y < 0 || y >= height) continue;
      const row = y * width;
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        if (x < 0 || x >= width) continue;
        const idx = row + x;
        if (mask[idx] === 1) {
          const off = idx * 4;
          rgba[off] = avgR;
          rgba[off + 1] = avgG;
          rgba[off + 2] = avgB;
          confidence[idx] = targetConfidence;
          mask[idx] = 0;
        }
      }
    }
  }
}
