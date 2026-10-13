import type { Point } from './types';

/**
 * Exemplar Patch Search
 * Criminisi et al. (2004) Section III.2:
 * Ψ_q̂ = arg min_{Ψ_q ∈ Φ} d(Ψ_p̂, Ψ_q)
 * where d(Ψ_a, Ψ_b) = sum over already filled pixels in Ψ_p̂ of ||I(a_k) - I(b_k)||^2
 * Valid candidate patches Ψ_q must be entirely contained in the source region Φ (mask === 0).
 */

export interface PatchSearchOptions {
  patchRadius: number;
  useLab: boolean;
  searchWindowScale: number; // 0 for full image, >0 for hole bounding-box window
  stride: number; // 1 for exhaustive, 2 for coarse-to-fine
}

export function findBestMatchingPatch(
  px: number,
  py: number,
  mask: Uint8Array,
  _initialMask: Uint8Array,
  rgba: Uint8ClampedArray,
  labData: Float32Array,
  width: number,
  height: number,
  holeBounds: { minX: number; maxX: number; minY: number; maxY: number },
  options: PatchSearchOptions
): Point | null {
  const r = options.patchRadius;

  // 1. Gather all relative offsets of known pixels in template Ψ_p
  // To optimize the inner loop, pre-pack offsets into flat typed arrays
  const maxPatchPixels = (2 * r + 1) * (2 * r + 1);
  const knownOffsetsX = new Int32Array(maxPatchPixels);
  const knownOffsetsY = new Int32Array(maxPatchPixels);
  let knownCount = 0;

  for (let dy = -r; dy <= r; dy++) {
    const y = py + dy;
    if (y < 0 || y >= height) continue;
    const rowOffset = y * width;
    for (let dx = -r; dx <= r; dx++) {
      const x = px + dx;
      if (x < 0 || x >= width) continue;
      const idx = rowOffset + x;
      // Only include pixels that are already known
      if (mask[idx] === 0) {
        knownOffsetsX[knownCount] = dx;
        knownOffsetsY[knownCount] = dy;
        knownCount++;
      }
    }
  }

  // If there are no known pixels in the patch, cannot compute distance
  if (knownCount === 0) return null;

  // 2. Determine search bounding box
  let searchMinX = r;
  let searchMaxX = width - 1 - r;
  let searchMinY = r;
  let searchMaxY = height - 1 - r;

  if (options.searchWindowScale > 0) {
    const holeW = holeBounds.maxX - holeBounds.minX + 1;
    const holeH = holeBounds.maxY - holeBounds.minY + 1;
    const padX = Math.round((holeW * options.searchWindowScale) / 2);
    const padY = Math.round((holeH * options.searchWindowScale) / 2);

    searchMinX = Math.max(r, holeBounds.minX - padX);
    searchMaxX = Math.min(width - 1 - r, holeBounds.maxX + padX);
    searchMinY = Math.max(r, holeBounds.minY - padY);
    searchMaxY = Math.min(height - 1 - r, holeBounds.maxY + padY);
  }

  const stride = options.stride > 0 ? options.stride : 1;
  const useLab = options.useLab;

  let bestSSD = Infinity;
  let bestQx = -1;
  let bestQy = -1;

  // Helper to check if a candidate patch Ψ_q is entirely contained in Φ (no hole pixels)
  function isCandidatePatchValid(cx: number, cy: number): boolean {
    for (let dy = -r; dy <= r; dy++) {
      const rowOffset = (cy + dy) * width;
      for (let dx = -r; dx <= r; dx++) {
        const idx = rowOffset + (cx + dx);
        // Patch must only sample from originally known pixels or current known pixels
        if (mask[idx] !== 0) return false;
      }
    }
    return true;
  }

  // Helper to evaluate SSD between template Ψ_p and candidate Ψ_q
  function computeSSD(cx: number, cy: number): number {
    let ssd = 0;

    if (useLab) {
      for (let i = 0; i < knownCount; i++) {
        const dx = knownOffsetsX[i];
        const dy = knownOffsetsY[i];

        const pIdx = (py + dy) * width + (px + dx);
        const qIdx = (cy + dy) * width + (cx + dx);

        const pLab = pIdx * 3;
        const qLab = qIdx * 3;

        const dL = labData[pLab] - labData[qLab];
        const da = labData[pLab + 1] - labData[qLab + 1];
        const db = labData[pLab + 2] - labData[qLab + 2];

        ssd += dL * dL + da * da + db * db;

        // Early bailout: if current ssd already exceeds best known, terminate early
        if (ssd >= bestSSD) return ssd;
      }
    } else {
      for (let i = 0; i < knownCount; i++) {
        const dx = knownOffsetsX[i];
        const dy = knownOffsetsY[i];

        const pIdx = ((py + dy) * width + (px + dx)) * 4;
        const qIdx = ((cy + dy) * width + (cx + dx)) * 4;

        const dr = rgba[pIdx] - rgba[qIdx];
        const dg = rgba[pIdx + 1] - rgba[qIdx + 1];
        const db = rgba[pIdx + 2] - rgba[qIdx + 2];

        ssd += dr * dr + dg * dg + db * db;

        if (ssd >= bestSSD) return ssd;
      }
    }

    return ssd;
  }

  // Pass 1: Scan candidates in the search window using stride
  for (let qy = searchMinY; qy <= searchMaxY; qy += stride) {
    for (let qx = searchMinX; qx <= searchMaxX; qx += stride) {
      // Don't choose a patch identical to center if it contains hole
      if (isCandidatePatchValid(qx, qy)) {
        const ssd = computeSSD(qx, qy);
        if (ssd < bestSSD) {
          bestSSD = ssd;
          bestQx = qx;
          bestQy = qy;
        }
      }
    }
  }

  // If no candidate found in the window, fallback to full image
  if (bestQx === -1 && (searchMinX > r || searchMinY > r || searchMaxX < width - 1 - r || searchMaxY < height - 1 - r)) {
    for (let qy = r; qy <= height - 1 - r; qy += 2) {
      for (let qx = r; qx <= width - 1 - r; qx += 2) {
        if (isCandidatePatchValid(qx, qy)) {
          const ssd = computeSSD(qx, qy);
          if (ssd < bestSSD) {
            bestSSD = ssd;
            bestQx = qx;
            bestQy = qy;
          }
        }
      }
    }
  }

  // Pass 2: Local fine refinement around best candidate if stride > 1
  if (bestQx !== -1 && stride > 1) {
    const refineRadius = stride;
    const rMinX = Math.max(r, bestQx - refineRadius);
    const rMaxX = Math.min(width - 1 - r, bestQx + refineRadius);
    const rMinY = Math.max(r, bestQy - refineRadius);
    const rMaxY = Math.min(height - 1 - r, bestQy + refineRadius);

    for (let ry = rMinY; ry <= rMaxY; ry++) {
      for (let rx = rMinX; rx <= rMaxX; rx++) {
        if (isCandidatePatchValid(rx, ry)) {
          const ssd = computeSSD(rx, ry);
          if (ssd < bestSSD) {
            bestSSD = ssd;
            bestQx = rx;
            bestQy = ry;
          }
        }
      }
    }
  }

  if (bestQx === -1) return null;
  return { x: bestQx, y: bestQy };
}
