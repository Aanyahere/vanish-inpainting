import React from 'react';
import { Paintbrush, Eraser, Trash2, Wand2, Settings2, AlertTriangle, Eye } from 'lucide-react';
import type { ToolMode } from './DarkroomCanvas';

interface ControlPanelProps {
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  onClearMask: () => void;
  onRunInpainting: () => void;
  isProcessing: boolean;
  maskPixelCount: number;
  totalPixelCount: number;
  patchRadius: number;
  setPatchRadius: (r: number) => void;
  searchMode: 'windowed' | 'full';
  setSearchMode: (m: 'windowed' | 'full') => void;
  useLab: boolean;
  setUseLab: (lab: boolean) => void;
  streamIntermediate: boolean;
  setStreamIntermediate: (stream: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  toolMode,
  setToolMode,
  brushSize,
  setBrushSize,
  onClearMask,
  onRunInpainting,
  isProcessing,
  maskPixelCount,
  totalPixelCount,
  patchRadius,
  setPatchRadius,
  searchMode,
  setSearchMode,
  useLab,
  setUseLab,
  streamIntermediate,
  setStreamIntermediate,
}) => {
  const maskPercent = totalPixelCount > 0 ? (maskPixelCount / totalPixelCount) * 100 : 0;
  const isLargeHole = maskPercent > 25;
  const patchDimension = 2 * patchRadius + 1;

  return (
    <div className="flex flex-col gap-4 bg-[#15171D] border border-white/8 rounded-2xl p-4 sm:p-5">
      {/* 1. Tool Selection (Brush / Eraser / Clear) */}
      <div>
        <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
          Mask Painting Tools
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setToolMode('brush')}
            disabled={isProcessing}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              toolMode === 'brush'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Brush</span>
          </button>

          <button
            type="button"
            onClick={() => setToolMode('eraser')}
            disabled={isProcessing}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              toolMode === 'eraser'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-bold'
                : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>

          <button
            type="button"
            onClick={onClearMask}
            disabled={isProcessing || maskPixelCount === 0}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-neutral-400 hover:text-rose-400 bg-white/5 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 2. Brush Size Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-neutral-400">Brush Radius:</span>
          <span className="text-xs font-semibold text-amber-400 font-mono">{brushSize}px</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={8}
            max={80}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            disabled={isProcessing}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
          {/* Circular Brush Size Preview */}
          <div className="w-9 h-9 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center shrink-0">
            <div
              className="rounded-full bg-amber-400/80 border border-amber-300"
              style={{
                width: `${Math.max(4, Math.min(28, brushSize * 0.35))}px`,
                height: `${Math.max(4, Math.min(28, brushSize * 0.35))}px`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-3">
        {/* 3. Algorithm Parameters (Criminisi 2004) */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            Algorithm Parameters
          </label>
        </div>

        {/* Patch Size selector */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="text-neutral-400">Patch Window Ψ:</span>
            <span className="text-amber-400 font-mono font-semibold">
              {patchDimension}×{patchDimension} px
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { r: 3, label: '7×7' },
              { r: 4, label: '9×9' }, // Paper default
              { r: 6, label: '13×13' },
              { r: 8, label: '17×17' },
            ].map((item) => (
              <button
                key={item.r}
                type="button"
                onClick={() => setPatchRadius(item.r)}
                disabled={isProcessing}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all text-center ${
                  patchRadius === item.r
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-bold'
                    : 'bg-white/5 border border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
                {item.r === 4 && <span className="block text-[9px] text-amber-400/80">Default</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Search Mode */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="text-neutral-400">Source Search Range:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSearchMode('windowed')}
              disabled={isProcessing}
              className={`py-1.5 px-2.5 rounded-lg text-xs transition-all text-left ${
                searchMode === 'windowed'
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold'
                  : 'bg-white/5 border border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <span className="block font-medium">Windowed (Fast)</span>
              <span className="text-[10px] text-neutral-400">2.5× hole bounds</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode('full')}
              disabled={isProcessing}
              className={`py-1.5 px-2.5 rounded-lg text-xs transition-all text-left ${
                searchMode === 'full'
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-semibold'
                  : 'bg-white/5 border border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <span className="block font-medium">Full Image</span>
              <span className="text-[10px] text-neutral-400">Exhaustive search</span>
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2 mb-3 text-xs">
          <label className="flex items-center justify-between cursor-pointer text-neutral-300">
            <span>CIE L*a*b* Color Uniformity</span>
            <input
              type="checkbox"
              checked={useLab}
              onChange={(e) => setUseLab(e.target.checked)}
              disabled={isProcessing}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              Live Visual Progress Stream
            </span>
            <input
              type="checkbox"
              checked={streamIntermediate}
              onChange={(e) => setStreamIntermediate(e.target.checked)}
              disabled={isProcessing}
              className="accent-amber-500 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 4. Mask Statistics & Warnings */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-neutral-400">Selected Target Hole:</span>
          <span className="font-semibold text-white">
            {maskPixelCount.toLocaleString()} px ({maskPercent.toFixed(1)}%)
          </span>
        </div>

        {isLargeHole && (
          <div className="flex items-start gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              Large hole selected ({maskPercent.toFixed(1)}%). Windowed search mode and 9×9 or 13×13 patches are recommended for speed.
            </p>
          </div>
        )}
      </div>

      {/* 5. Big Action Button: ERASE OBJECT */}
      <button
        type="button"
        onClick={onRunInpainting}
        disabled={isProcessing || maskPixelCount === 0}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-amber-500/20 safelight-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wider"
      >
        <Wand2 className="w-4 h-4 stroke-[2.5]" />
        <span>{isProcessing ? 'Removing Object...' : 'Erase Object'}</span>
      </button>
    </div>
  );
};
