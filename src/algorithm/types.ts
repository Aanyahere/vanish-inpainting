// Types for Exemplar-Based Image Inpainting (Criminisi et al., 2004)

export interface Point {
  x: number;
  y: number;
}

export interface InpaintingConfig {
  patchRadius: number; // e.g. 4 for 9x9 patch (size = 2*r + 1)
  searchWindowScale: number; // e.g. 0 for full image, or 2.5 for windowed search
  subsamplingStep: number; // stride for candidate source patches (e.g. 1 or 2)
  colorSpace: 'lab' | 'rgb'; // CIE Lab (paper standard) or RGB
  epsilon: number; // small stabilization term for D(p)
  maxIterations?: number; // safeguard limit
}

export interface InpaintingStats {
  totalHolePixels: number;
  remainingHolePixels: number;
  filledPixels: number;
  iterations: number;
  elapsedMs: number;
  percentComplete: number;
  currentPatchCenter?: Point;
  bestSourceCenter?: Point;
}

export interface WorkerStartMessage {
  type: 'START';
  imageData: ImageData;
  maskData: Uint8Array; // 1 for hole (to remove), 0 for known background
  config: InpaintingConfig;
  streamIntermediate: boolean;
  streamIntervalMs: number;
}

export interface WorkerCancelMessage {
  type: 'CANCEL';
}

export type WorkerInMessage = WorkerStartMessage | WorkerCancelMessage;

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  stats: InpaintingStats;
  previewImageData?: ImageData;
  frontPoints?: Point[];
}

export interface WorkerCompleteMessage {
  type: 'COMPLETE';
  resultImageData: ImageData;
  stats: InpaintingStats;
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage;
