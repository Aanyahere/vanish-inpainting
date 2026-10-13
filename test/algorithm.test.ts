import { describe, it, expect } from 'vitest';
import { rgbToLab } from '../src/algorithm/colorSpace';
import { identifyFillFront, smoothMask, computeFrontNormal } from '../src/algorithm/normal';
import { computeLuminanceGradients, getPatchMaxIsophote } from '../src/algorithm/gradient';
import { runCriminisiInpainting } from '../src/algorithm/criminisi';
import type { InpaintingConfig } from '../src/algorithm/types';

describe('Criminisi et al. (2004) Exemplar Inpainting Algorithm', () => {
  it('correctly converts RGB to perceptually uniform CIE L*a*b*', () => {
    const [LWhite] = rgbToLab(255, 255, 255);
    expect(LWhite).toBeCloseTo(100, 0);

    const [LBlack] = rgbToLab(0, 0, 0);
    expect(LBlack).toBeCloseTo(0, 1);
  });

  it('identifies fill front δΩ pixels on hole boundary', () => {
    const w = 20;
    const h = 20;
    const mask = new Uint8Array(w * h);

    // 4x4 square hole from (8,8) to (11,11)
    for (let y = 8; y <= 11; y++) {
      for (let x = 8; x <= 11; x++) {
        mask[y * w + x] = 1;
      }
    }

    const { frontPoints, isFront } = identifyFillFront(mask, w, h);
    expect(frontPoints.length).toBe(12);
    expect(isFront[8 * w + 8]).toBe(1);
    expect(isFront[0]).toBe(0);
  });

  it('computes unit normal vector np orthogonal to fill front', () => {
    const w = 20;
    const h = 20;
    const mask = new Uint8Array(w * h);
    for (let y = 8; y <= 11; y++) {
      for (let x = 8; x <= 11; x++) {
        mask[y * w + x] = 1;
      }
    }

    const smoothed = smoothMask(mask, w, h);
    const normalLeft = computeFrontNormal(8, 9, smoothed, w, h);

    expect(normalLeft.nx).toBeGreaterThan(0);
    expect(Math.hypot(normalLeft.nx, normalLeft.ny)).toBeCloseTo(1, 2);
  });

  it('computes image gradient and isophote ∇I⊥ perpendicular to gradient', () => {
    const w = 20;
    const h = 20;
    const mask = new Uint8Array(w * h);
    const rgba = new Uint8ClampedArray(w * h * 4);

    // Horizontal split: top half dark, bottom half light
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const val = y < 10 ? 50 : 200;
        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const gradients = computeLuminanceGradients(rgba, mask, w, h);
    const isophote = getPatchMaxIsophote(5, 9, 3, gradients, mask, w, h);

    // Gradient is vertical, so isophote (orthogonal) must have prominent horizontal component
    expect(Math.abs(isophote.isophoteX)).toBeGreaterThan(0);
  });

  it('executes full iterative Criminisi inpainting to completion', () => {
    const w = 24;
    const h = 24;
    const mask = new Uint8Array(w * h);
    const rgba = new Uint8ClampedArray(w * h * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        rgba[idx] = 100;
        rgba[idx + 1] = 150;
        rgba[idx + 2] = 200;
        rgba[idx + 3] = 255;
      }
    }

    // 4x4 hole
    for (let y = 10; y <= 13; y++) {
      for (let x = 10; x <= 13; x++) {
        mask[y * w + x] = 1;
      }
    }

    const imgData = {
      data: rgba,
      width: w,
      height: h,
    } as unknown as ImageData;

    const config: InpaintingConfig = {
      patchRadius: 2,
      searchWindowScale: 0,
      subsamplingStep: 1,
      colorSpace: 'lab',
      epsilon: 0.001,
    };

    const { resultImageData, stats } = runCriminisiInpainting(imgData, mask, config);

    expect(stats.remainingHolePixels).toBe(0);
    expect(stats.filledPixels).toBe(16);
    expect(resultImageData.data.length).toBe(w * h * 4);
  });
});
