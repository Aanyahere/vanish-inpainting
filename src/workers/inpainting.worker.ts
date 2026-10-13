import { runCriminisiInpainting } from '../algorithm/criminisi';
import type { WorkerInMessage, WorkerOutMessage } from '../algorithm/types';

let isCancelled = false;

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (msg.type === 'START') {
    isCancelled = false;
    const { imageData, maskData, config, streamIntermediate, streamIntervalMs } = msg;

    try {
      let lastStreamTime = performance.now();
      let lastReportedFilled = 0;

      const { resultImageData, stats } = runCriminisiInpainting(
        imageData,
        maskData,
        config,
        (progressData) => {
          if (isCancelled) {
            return false; // abort algorithm
          }

          const now = performance.now();
          const filledDelta = progressData.stats.filledPixels - lastReportedFilled;

          // Stream progress at requested interval or when notable chunk is filled
          if (streamIntermediate && (now - lastStreamTime >= streamIntervalMs || filledDelta >= 80)) {
            lastStreamTime = now;
            lastReportedFilled = progressData.stats.filledPixels;

            const progressMsg: WorkerOutMessage = {
              type: 'PROGRESS',
              stats: progressData.stats,
              frontPoints: progressData.frontPoints.slice(0, 500), // sample for UI display
            };
            self.postMessage(progressMsg);
          }

          return true;
        }
      );

      if (isCancelled) {
        return;
      }

      const completeMsg: WorkerOutMessage = {
        type: 'COMPLETE',
        resultImageData,
        stats,
      };
      self.postMessage(completeMsg);
    } catch (err: unknown) {
      const errorMsg: WorkerOutMessage = {
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMsg);
    }
  }
};
