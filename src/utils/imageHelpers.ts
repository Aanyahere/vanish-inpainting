/**
 * Image processing utilities for canvas, downscaling, and mask conversion
 */

export const MAX_IMAGE_DIMENSION = 500;

export interface ResizedImageResult {
  imageData: ImageData;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  scale: number;
}

/**
 * Loads an image from URL or data URI and scales it to max dimension ~500px
 */
export async function loadAndDownscaleImage(src: string): Promise<ResizedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      let scale = 1;
      const maxDim = Math.max(origW, origH);
      if (maxDim > MAX_IMAGE_DIMENSION) {
        scale = MAX_IMAGE_DIMENSION / maxDim;
      }

      const targetW = Math.round(origW * scale);
      const targetH = Math.round(origH * scale);

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetW;
      offscreenCanvas.height = targetH;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      const imageData = ctx.getImageData(0, 0, targetW, targetH);

      resolve({
        imageData,
        width: targetW,
        height: targetH,
        originalWidth: origW,
        originalHeight: origH,
        scale,
      });
    };
    img.onerror = (e) => reject(new Error('Image failed to load: ' + String(e)));
    img.src = src;
  });
}

/**
 * Extracts binary mask (Uint8Array) from mask canvas context.
 * 1 = hole (to fill/remove), 0 = source/keep
 */
export function extractBinaryMask(
  maskCanvas: HTMLCanvasElement,
  threshold = 10
): Uint8Array {
  const width = maskCanvas.width;
  const height = maskCanvas.height;
  const ctx = maskCanvas.getContext('2d');
  if (!ctx) return new Uint8Array(width * height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    // Check alpha or RGB intensity in mask canvas
    const alpha = data[i * 4 + 3];
    const brightness = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    mask[i] = (alpha > threshold || brightness > threshold) ? 1 : 0;
  }

  return mask;
}

/**
 * Converts ImageData to a downloadable PNG file
 */
export function downloadImageDataAsPng(imageData: ImageData, filename = 'vanish-inpainted.png') {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
