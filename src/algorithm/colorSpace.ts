/**
 * Perceptually uniform CIE L*a*b* color space conversion
 * Implemented according to CIE standard (D65 standard illuminant)
 * Criminisi et al. (2004) Footnote 3:
 * "Euclidean distances in Lab colour space are more meaningful than in RGB space."
 */

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // 1. Normalize sRGB to [0, 1] and linearize (inverse gamma)
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;

  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  // 2. Convert sRGB to XYZ (using D65 reference white)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) / 1.00000;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;

  // 3. Convert XYZ to CIE L*a*b*
  const epsilon = 0.008856; // (6/29)^3
  const kappa = 903.3; // (29/3)^3

  const fx = x > epsilon ? Math.cbrt(x) : (kappa * x + 16) / 116;
  const fy = y > epsilon ? Math.cbrt(y) : (kappa * y + 16) / 116;
  const fz = z > epsilon ? Math.cbrt(z) : (kappa * z + 16) / 116;

  const L = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [L, a, bVal];
}

/**
 * Precompute CIE Lab channels for an entire RGBA image into a Float32Array
 * Buffer layout: [L0, a0, b0, L1, a1, b1, ...]
 */
export function imageToLabArray(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const pixelCount = width * height;
  const labArray = new Float32Array(pixelCount * 3);

  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const [L, a, bVal] = rgbToLab(r, g, b);

    const offset = i * 3;
    labArray[offset] = L;
    labArray[offset + 1] = a;
    labArray[offset + 2] = bVal;
  }

  return labArray;
}
