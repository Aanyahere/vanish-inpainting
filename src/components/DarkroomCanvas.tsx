import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, InpaintingStats } from '../algorithm/types';

export type ToolMode = 'brush' | 'eraser';

interface DarkroomCanvasProps {
  imageElement: HTMLImageElement | null;
  width: number;
  height: number;
  brushSize: number;
  toolMode: ToolMode;
  onMaskChange: (maskCanvas: HTMLCanvasElement) => void;
  isProcessing: boolean;
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewImageData: ImageData | null;
  frontPoints?: Point[];
  progressStats?: InpaintingStats | null;
  patchRadius?: number;
}

export const DarkroomCanvas: React.FC<DarkroomCanvasProps> = ({
  imageElement,
  width,
  height,
  brushSize,
  toolMode,
  onMaskChange,
  isProcessing,
  maskCanvasRef,
  previewImageData,
  frontPoints,
  progressStats,
  patchRadius = 4,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isMouseOver, setIsMouseOver] = useState(false);

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 1. Render base image or live preview
  useEffect(() => {
    if (!imageCanvasRef.current) return;
    const ctx = imageCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (previewImageData) {
      ctx.putImageData(previewImageData, 0, 0);
    } else if (imageElement) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(imageElement, 0, 0, width, height);
    }
  }, [imageElement, previewImageData, width, height]);

  // 2. Cursor overlay ring & Live inpainting inspector overlay
  useEffect(() => {
    if (!cursorCanvasRef.current) return;
    const ctx = cursorCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (isProcessing) {
      // Draw glowing fill-front points (δΩ contour)
      if (frontPoints && frontPoints.length > 0) {
        ctx.fillStyle = '#F5A623';
        for (let i = 0; i < frontPoints.length; i++) {
          ctx.fillRect(frontPoints[i].x - 0.5, frontPoints[i].y - 0.5, 2, 2);
        }
      }

      // Draw active target patch Ψ_p (cyan)
      const r = patchRadius;
      if (progressStats?.currentPatchCenter) {
        const { x, y } = progressStats.currentPatchCenter;
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - r, y - r, 2 * r + 1, 2 * r + 1);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(x - r, y - r, 2 * r + 1, 2 * r + 1);
      }

      // Draw best matching source patch Ψ_q (emerald)
      if (progressStats?.bestSourceCenter) {
        const { x, y } = progressStats.bestSourceCenter;
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - r, y - r, 2 * r + 1, 2 * r + 1);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fillRect(x - r, y - r, 2 * r + 1, 2 * r + 1);

        if (progressStats.currentPatchCenter) {
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.moveTo(x, y);
          ctx.lineTo(progressStats.currentPatchCenter.x, progressStats.currentPatchCenter.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      return;
    }

    if (isMouseOver && cursorPos && !isProcessing) {
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);

      if (toolMode === 'brush') {
        ctx.strokeStyle = '#F5A623';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(245, 166, 35, 0.2)';
      } else {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      }

      ctx.fill();
      ctx.stroke();

      // Center crosshair dot
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }, [cursorPos, isMouseOver, brushSize, toolMode, isProcessing, width, height, frontPoints, progressStats, patchRadius]);

  // Coordinate conversion from client mouse to canvas coordinates
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(width, x)),
      y: Math.max(0, Math.min(height, y)),
    };
  };

  // Draw stroke on mask canvas
  const drawStroke = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      if (!maskCanvasRef.current) return;
      const ctx = maskCanvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (toolMode === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        // Semi-transparent warm amber safelight overlay
        ctx.strokeStyle = 'rgba(245, 166, 35, 0.7)';
        ctx.fillStyle = 'rgba(245, 166, 35, 0.7)';
      } else {
        // Eraser: cuts out existing mask
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Ensure dots at single click
      ctx.beginPath();
      ctx.arc(x2, y2, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
    [brushSize, toolMode, maskCanvasRef]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    lastPointRef.current = coords;
    drawStroke(coords.x, coords.y, coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (isDrawing && lastPointRef.current && !isProcessing) {
      drawStroke(lastPointRef.current.x, lastPointRef.current.y, coords.x, coords.y);
      lastPointRef.current = coords;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null;
      if (maskCanvasRef.current) {
        onMaskChange(maskCanvasRef.current);
      }
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black max-w-full inline-block cursor-none select-none"
      style={{
        width: `${width}px`,
        aspectRatio: `${width} / ${height}`,
      }}
      onMouseEnter={() => setIsMouseOver(true)}
      onMouseLeave={() => {
        setIsMouseOver(false);
        setIsDrawing(false);
      }}
    >
      {/* Layer 1: Base Image / Inpainted Result Preview */}
      <canvas
        ref={imageCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Layer 2: Mask Drawing Canvas (Semi-transparent Amber) */}
      <canvas
        ref={maskCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Layer 3: Interactive Pointer & Custom Cursor Overlay */}
      <canvas
        ref={cursorCanvasRef}
        width={width}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 w-full h-full block touch-none z-10"
      />
    </div>
  );
};
