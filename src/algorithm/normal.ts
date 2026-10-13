import type { Point } from './types';

/**
 * Normal vector np to the fill front δΩ
 * Criminisi et al. (2004) Section III.1:
 * "n_p is a unit vector orthogonal to the front δΩ in the point p"
 */

/**
 * Identify all pixels on the fill front δΩ.
 * A pixel belongs to δΩ if it is inside the hole (mask === 1)
 * and has at least one 4-connected (or 8-connected) neighbor outside the hole (mask === 0).
 */
export function identifyFillFront(
  mask: Uint8Array,
  width: number,
  height: number
): { frontPoints: Point[]; isFront: Uint8Array } {
  const pixelCount = width * height;
  const isFront = new Uint8Array(pixelCount);
  const frontPoints: Point[] = [];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      if (mask[idx] !== 1) continue; // Only hole pixels can be on the front

      // Check 4-connected neighbors for known pixels
      let hasKnownNeighbor = false;
      if (x > 0 && mask[idx - 1] === 0) hasKnownNeighbor = true;
      else if (x + 1 < width && mask[idx + 1] === 0) hasKnownNeighbor = true;
      else if (y > 0 && mask[idx - width] === 0) hasKnownNeighbor = true;
      else if (y + 1 < height && mask[idx + width] === 0) hasKnownNeighbor = true;

      if (hasKnownNeighbor) {
        isFront[idx] = 1;
        frontPoints.push({ x, y });
      }
    }
  }

  return { frontPoints, isFront };
}

/**
 * Computes a smoothed version of the binary mask using a separable 5x5 Gaussian kernel
 */
export function smoothMask(
  mask: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const pixelCount = width * height;
  const temp = new Float32Array(pixelCount);
  const smoothed = new Float32Array(pixelCount);

  // 1D Gaussian kernel [1, 4, 6, 4, 1] / 16
  const k = [0.0625, 0.25, 0.375, 0.25, 0.0625];

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ki = -2; ki <= 2; ki++) {
        const nx = Math.min(Math.max(x + ki, 0), width - 1);
        sum += mask[rowOffset + nx] * k[ki + 2];
      }
      temp[rowOffset + x] = sum;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ki = -2; ki <= 2; ki++) {
        const ny = Math.min(Math.max(y + ki, 0), height - 1);
        sum += temp[ny * width + x] * k[ki + 2];
      }
      smoothed[rowOffset + x] = sum;
    }
  }

  return smoothed;
}

/**
 * Computes unit normal vector np = ∇M_smooth / ||∇M_smooth|| at point p
 */
export function computeFrontNormal(
  px: number,
  py: number,
  smoothedMask: Float32Array,
  width: number,
  height: number
): { nx: number; ny: number } {
  const idx = py * width + px;

  // Central difference on smoothed mask
  const left = px > 0 ? smoothedMask[idx - 1] : smoothedMask[idx];
  const right = px + 1 < width ? smoothedMask[idx + 1] : smoothedMask[idx];
  const top = py > 0 ? smoothedMask[idx - width] : smoothedMask[idx];
  const bottom = py + 1 < height ? smoothedMask[idx + width] : smoothedMask[idx];

  const dx = (right - left) * 0.5;
  const dy = (bottom - top) * 0.5;

  const length = Math.hypot(dx, dy);
  if (length > 1e-5) {
    return {
      nx: dx / length,
      ny: dy / length,
    };
  }

  // Fallback: point towards center or arbitrary unit normal
  return { nx: 0, ny: 1 };
}
