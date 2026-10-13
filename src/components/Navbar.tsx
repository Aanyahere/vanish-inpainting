import React from 'react';
import { Sparkles, BookOpen, ExternalLink, RotateCcw } from 'lucide-react';

interface NavbarProps {
  onOpenResearch: () => void;
  onReset: () => void;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenResearch,
  onReset,
  isProcessing,
}) => {
  return (
    <header className="border-b border-white/8 bg-[#0E1117]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center safelight-glow-sm">
            <Sparkles className="w-5 h-5 text-black stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                VANISH
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Studio Darkroom
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Exemplar-Based Object Removal · Criminisi et al. (IEEE TIP 2004)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenResearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-white/10 transition-colors"
            title="Read Paper & Algorithm Explanation"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">How It Works</span>
            <span className="sm:hidden">Theory</span>
          </button>

          <a
            href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/criminisi_tip2004.pdf"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
            title="View original Microsoft Research paper PDF"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Paper (PDF)</span>
          </a>

          <button
            onClick={onReset}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-rose-300 bg-neutral-900/60 hover:bg-rose-950/30 border border-white/5 hover:border-rose-900/40 disabled:opacity-40 transition-colors"
            title="Reset Canvas and Image"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
