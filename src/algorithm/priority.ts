import type { GradientField } from './gradient';
import { getPatchMaxIsophote } from './gradient';
import { computeFrontNormal } from './normal';
import type { Point } from './types';

/**
 * Patch Priority computation: P(p) = C(p) * D(p)
 * Criminisi et al. (2004) Section III.1:
 *
 * C(p) = sum_{q in Ψ_p ∩ (I - Ω)} C(q) / |Ψ_p|
 * D(p) = |∇I⊥_p · n_p| / α
 */

export interface PatchPriorityResult {
  p: Point;
  confidence: number;
  dataTerm: number;
  priority: number;
}

/**
 * Compute confidence C(p) for a patch Ψ_p centered at (px, py)
 */
export function computePatchConfidence(
  px: number,
  py: number,
  radius: number,
  confidenceMap: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number
): number {
  const minX = Math.max(0, px - radius);
  const maxX = Math.min(width - 1, px + radius);
  const minY = Math.max(0, py - radius);
  const maxY = Math.min(height - 1, py + radius);

  const patchArea = (2 * radius + 1) * (2 * radius + 1);
  let confidenceSum = 0;

  for (let y = minY; y <= maxY; y++) {
    const rowOffset = y * width;
    for (let x = minX; x <= maxX; x++) {
      const idx = rowOffset + x;
      // Only sum over known / already filled pixels
      if (mask[idx] === 0) {
        confidenceSum += confidenceMap[idx];
      }
    }
  }

  return confidenceSum / patchArea;
}

/**
 * Compute data term D(p) = |∇I⊥_p · n_p| / α
 */
export function computePatchDataTerm(
  px: number,
  py: number,
  radius: number,
  gradients: GradientField,
  smoothedMask: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number,
  alpha = 255
): number {
  // 1. Get unit normal vector n_p
  const normal = computeFrontNormal(px, py, smoothedMask, width, height);

  // 2. Get patch isophote ∇I⊥_p
  const isophote = getPatchMaxIsophote(px, py, radius, gradients, mask, width, height);

  // 3. Dot product: |∇I⊥ · n_p|
  const dot = Math.abs(isophote.isophoteX * normal.nx + isophote.isophoteY * normal.ny);

  return dot / alpha;
}

/**
 * Compute priority for all fill-front points and find the point p̂ with maximum priority:
 * p̂ = arg max_{p ∈ δΩ} P(p)
 */
export function findMaxPriorityPatch(
  frontPoints: Point[],
  radius: number,
  confidenceMap: Float32Array,
  gradients: GradientField,
  smoothedMask: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number,
  epsilon = 0.001
): PatchPriorityResult | null {
  if (frontPoints.length === 0) return null;

  let bestPoint: Point = frontPoints[0];
  let maxPriority = -1;
  let bestC = 0;
  let bestD = 0;

  for (let i = 0; i < frontPoints.length; i++) {
    const pt = frontPoints[i];
    const C = computePatchConfidence(pt.x, pt.y, radius, confidenceMap, mask, width, height);
    const D = computePatchDataTerm(pt.x, pt.y, radius, gradients, smoothedMask, mask, width, height);

    // P(p) = C(p) * (D(p) + epsilon)
    // Adding epsilon prevents deadlock in regions with zero gradient,
    // smoothly falling back to concentric/confidence fill
    const P = C * (D + epsilon);

    if (P > maxPriority) {
      maxPriority = P;
      bestPoint = pt;
      bestC = C;
      bestD = D;
    }
  }

  return {
    p: bestPoint,
    confidence: bestC,
    dataTerm: bestD,
    priority: maxPriority,
  };
}
