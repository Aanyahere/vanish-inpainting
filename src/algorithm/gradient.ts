/**
 * Gradient and Isophote calculations
 * Criminisi et al. (2004) Section III.1:
 * "∇I⊥_p is the isophote (direction of constant intensity, i.e. perpendicular to the local image gradient)
 *  at point p. The gradient ∇I_p is computed as the maximum value of the image gradient in Ψ_p ∩ (I - Ω)."
 */

export interface GradientField {
  gx: Float32Array;
  gy: Float32Array;
  mag: Float32Array;
}

/**
 * Compute image gradients on known pixels using Sobel-like kernels
 */
export function computeLuminanceGradients(
  rgba: Uint8ClampedArray,
  mask: Uint8Array,
  width: number,
  height: number
): GradientField {
  const pixelCount = width * height;
  const gx = new Float32Array(pixelCount);
  const gy = new Float32Array(pixelCount);
  const mag = new Float32Array(pixelCount);

  // Helper to get luminance (0-255)
  function getLuminance(idx: number): number {
    const r = rgba[idx * 4];
    const g = rgba[idx * 4 + 1];
    const b = rgba[idx * 4 + 2];
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Only compute gradients on known pixels
      if (mask[idx] === 1) {
        gx[idx] = 0;
        gy[idx] = 0;
        mag[idx] = 0;
        continue;
      }

      // X derivative
      let dx = 0;
      let countX = 0;
      if (x + 1 < width && mask[idx + 1] === 0) {
        dx += getLuminance(idx + 1) - getLuminance(idx);
        countX++;
      }
      if (x - 1 >= 0 && mask[idx - 1] === 0) {
        dx += getLuminance(idx) - getLuminance(idx - 1);
        countX++;
      }
      const gradX = countX > 0 ? dx / countX : 0;

      // Y derivative
      let dy = 0;
      let countY = 0;
      if (y + 1 < height && mask[idx + width] === 0) {
        dy += getLuminance(idx + width) - getLuminance(idx);
        countY++;
      }
      if (y - 1 >= 0 && mask[idx - width] === 0) {
        dy += getLuminance(idx) - getLuminance(idx - width);
        countY++;
      }
      const gradY = countY > 0 ? dy / countY : 0;

      gx[idx] = gradX;
      gy[idx] = gradY;
      mag[idx] = Math.hypot(gradX, gradY);
    }
  }

  return { gx, gy, mag };
}

/**
 * Finds the maximum gradient in Ψ_p ∩ (I - Ω) and returns the orthogonal isophote:
 * ∇I⊥_p = (-gy, gx)
 */
export function getPatchMaxIsophote(
  px: number,
  py: number,
  radius: number,
  gradients: GradientField,
  mask: Uint8Array,
  width: number,
  height: number
): { isophoteX: number; isophoteY: number; magnitude: number } {
  let maxMag = -1;
  let bestGx = 0;
  let bestGy = 0;

  const minX = Math.max(0, px - radius);
  const maxX = Math.min(width - 1, px + radius);
  const minY = Math.max(0, py - radius);
  const maxY = Math.min(height - 1, py + radius);

  for (let y = minY; y <= maxY; y++) {
    const rowOffset = y * width;
    for (let x = minX; x <= maxX; x++) {
      const idx = rowOffset + x;
      if (mask[idx] === 0) {
        const m = gradients.mag[idx];
        if (m > maxMag) {
          maxMag = m;
          bestGx = gradients.gx[idx];
          bestGy = gradients.gy[idx];
        }
      }
    }
  }

  if (maxMag <= 0) {
    return { isophoteX: 0, isophoteY: 0, magnitude: 0 };
  }

  // Isophote is perpendicular to gradient: ∇I⊥ = (-gy, gx)
  return {
    isophoteX: -bestGy,
    isophoteY: bestGx,
    magnitude: maxMag,
  };
}
