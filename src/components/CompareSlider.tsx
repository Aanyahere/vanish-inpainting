import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Sliders, Columns, Eye, EyeOff, Layers } from 'lucide-react';
import { downloadImageDataAsPng } from '../utils/imageHelpers';

interface CompareSliderProps {
  originalImageData: ImageData;
  resultImageData: ImageData;
  maskCanvas: HTMLCanvasElement | null;
  onDownload: () => void;
}

type ViewMode = 'split' | 'sideBySide' | 'result' | 'original' | 'mask';

export const CompareSlider: React.FC<CompareSliderProps> = ({
  originalImageData,
  resultImageData,
  maskCanvas,
  onDownload,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 to 100
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);

  const width = originalImageData.width;
  const height = originalImageData.height;

  // Render original and result to canvases
  useEffect(() => {
    if (origCanvasRef.current) {
      const ctx = origCanvasRef.current.getContext('2d');
      if (ctx) ctx.putImageData(originalImageData, 0, 0);
    }
    if (resultCanvasRef.current) {
      const ctx = resultCanvasRef.current.getContext('2d');
      if (ctx) ctx.putImageData(resultImageData, 0, 0);
    }
  }, [originalImageData, resultImageData]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleWindowMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };
    const handleWindowTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const handleWindowTouchEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl px-2">
        <div className="flex items-center gap-1 bg-[#15171D] p-1 rounded-xl border border-white/8">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>

          <button
            onClick={() => setViewMode('sideBySide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'sideBySide'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side by Side</span>
          </button>

          <button
            onClick={() => setViewMode('result')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'result'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Result</span>
          </button>

          <button
            onClick={() => setViewMode('original')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'original'
                ? 'bg-amber-500 text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Original</span>
          </button>

          {maskCanvas && (
            <button
              onClick={() => setViewMode('mask')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'mask'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mask</span>
            </button>
          )}
        </div>

        {/* Download Button */}
        <button
          onClick={() => {
            downloadImageDataAsPng(resultImageData, 'vanish-inpainted.png');
            onDownload();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Download className="w-4 h-4 stroke-[2.2]" />
          <span>Export Result PNG</span>
        </button>
      </div>

      {/* Main Display Area */}
      {viewMode === 'split' && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black select-none cursor-ew-resize max-w-full"
          style={{ width: `${width}px`, aspectRatio: `${width}/${height}` }}
        >
          {/* Bottom Layer: Inpainted Result */}
          <canvas
            ref={resultCanvasRef}
            width={width}
            height={height}
            className="w-full h-full object-contain block"
          />

          {/* Top Layer: Original Image (Clipped by slider position) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <canvas
              ref={origCanvasRef}
              width={width}
              height={height}
              className="max-w-none block"
              style={{ width: `${width}px`, height: `${height}px` }}
            />
          </div>

          {/* Draggable Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-[10px] shadow-lg shadow-black/80 border-2 border-white pointer-events-auto cursor-ew-resize">
              ◀ ▶
            </div>
          </div>

          {/* Labels */}
          <span className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white/90 border border-white/10">
            BEFORE (ORIGINAL)
          </span>
          <span className="absolute top-3 right-3 px-2 py-1 rounded bg-amber-500/90 backdrop-blur-sm text-[10px] font-semibold text-black shadow-sm">
            AFTER (INPAINTED)
          </span>
        </div>
      )}

      {viewMode === 'sideBySide' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-neutral-400 mb-2">Original Photo</span>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <canvas
                ref={origCanvasRef}
                width={width}
                height={height}
                className="max-w-full h-auto block"
              />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-amber-400 mb-2">Inpainted Result</span>
            <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-black shadow-lg shadow-amber-500/10">
              <canvas
                ref={resultCanvasRef}
                width={width}
                height={height}
                className="max-w-full h-auto block"
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'result' && (
        <div className="rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-black">
          <canvas
            ref={resultCanvasRef}
            width={width}
            height={height}
            className="max-w-full h-auto block"
          />
        </div>
      )}

      {viewMode === 'original' && (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <canvas
            ref={origCanvasRef}
            width={width}
            height={height}
            className="max-w-full h-auto block"
          />
        </div>
      )}

      {viewMode === 'mask' && maskCanvas && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <canvas
            ref={origCanvasRef}
            width={width}
            height={height}
            className="max-w-full h-auto block"
          />
          <img
            src={maskCanvas.toDataURL()}
            alt="Mask Overlay"
            className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
          />
        </div>
      )}
    </div>
  );
};
