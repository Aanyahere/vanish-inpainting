import React from 'react';
import type { InpaintingStats } from '../algorithm/types';
import { Square, Timer, Activity, Percent } from 'lucide-react';

interface ProgressBarProps {
  stats: InpaintingStats | null;
  onCancel: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ stats, onCancel }) => {
  if (!stats) return null;

  const percent = Math.min(100, Math.max(0, Math.round(stats.percentComplete)));
  const elapsedSec = (stats.elapsedMs / 1000).toFixed(1);

  return (
    <div className="bg-[#15171D] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-500/5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Inpainting in Progress...
          </h3>
        </div>

        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 transition-all"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </button>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3.5 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 mb-3">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 rounded-full transition-all duration-150 safelight-glow-sm"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Numerical Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <Percent className="w-3.5 h-3.5 text-amber-400" />
          <span>Filled:</span>
          <span className="font-semibold text-white">{percent}%</span>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Pixels:</span>
          <span className="font-semibold text-white">
            {stats.filledPixels} / {stats.totalHolePixels}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="font-mono text-amber-400 font-bold text-xs">#</span>
          <span>Iters:</span>
          <span className="font-semibold text-white">{stats.iterations}</span>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <span>Time:</span>
          <span className="font-semibold text-white">{elapsedSec}s</span>
        </div>
      </div>
    </div>
  );
};
