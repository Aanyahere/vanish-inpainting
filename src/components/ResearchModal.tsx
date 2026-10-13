import React from 'react';
import { X, ExternalLink, Cpu, Sparkles, BookOpen } from 'lucide-react';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#12141A] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161822]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                How It Works: Exemplar-Based Image Inpainting
              </h2>
              <p className="text-xs text-neutral-400">
                Criminisi, Pérez & Toyama — IEEE Transactions on Image Processing (2004)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm leading-relaxed text-neutral-300">
          {/* Plain English Summary Box */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h3 className="text-amber-300 font-semibold text-sm mb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Plain-English Overview
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This tool finds similar-looking texture patches elsewhere in your photo and copies them into the erased
              area — prioritizing strong edges and lines first so boundaries (such as horizons, roads, or poles) connect up
              naturally without bending or breaking. It delivers the sensation of Google Photos&apos; Magic Eraser, but using
              a classical 2004 non-AI algorithm that runs <strong>100% client-side in your browser</strong> — zero models,
              zero training weights, and zero data sent to any server.
            </p>
          </div>

          {/* Mathematical Foundations */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">
              The Mathematical Engine
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              The algorithm operates iteratively on the boundary (the <em>fill front</em> <span className="font-mono text-amber-300">δΩ</span>) between the hole <span className="font-mono text-amber-300">Ω</span> and the known image <span className="font-mono text-amber-300">Φ</span>.
            </p>

            <div className="space-y-4">
              {/* Priority Equation */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400 uppercase tracking-wide">
                    1. Patch Priority Function
                  </span>
                  <span className="font-mono text-xs text-neutral-400">Equation (1)</span>
                </div>
                <div className="text-center py-2 font-mono text-sm text-white bg-white/5 rounded-lg my-2">
                  P(p) = C(p) · D(p)
                </div>
                <p className="text-xs text-neutral-400">
                  Each border pixel <span className="font-mono">p</span> is assigned a priority composed of two competing terms: the Confidence Term <span className="font-mono text-amber-300">C(p)</span> and the Data Term <span className="font-mono text-amber-300">D(p)</span>.
                </p>
              </div>

              {/* Confidence Term */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400 uppercase tracking-wide">
                    2. Confidence Term C(p)
                  </span>
                </div>
                <div className="text-center py-2 font-mono text-xs text-white bg-white/5 rounded-lg my-2">
                  C(p) = [ Σ C(q) for q ∈ Ψp ∩ (I - Ω) ] / |Ψp|
                </div>
                <p className="text-xs text-neutral-400">
                  Measures the proportion of reliable, already-known information surrounding <span className="font-mono">p</span>. It enforces a smooth, roughly circular inward fill order and rapidly eliminates sharp corners and narrow tendrils.
                </p>
              </div>

              {/* Data Term */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400 uppercase tracking-wide">
                    3. Data Term D(p) (Isophotes & Normals)
                  </span>
                </div>
                <div className="text-center py-2 font-mono text-xs text-white bg-white/5 rounded-lg my-2">
                  D(p) = | ∇I⊥p · np | / α
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Boosts priority where an image edge hits the hole perpendicularly. <span className="font-mono text-amber-300">∇I⊥p</span> is the isophote (orthogonal to the local image gradient), and <span className="font-mono text-amber-300">np</span> is the boundary unit normal. When an edge strikes the contour head-on, their dot product is maximized, forcing linear structures (like poles, table edges, and horizon lines) to synthesize into the hole first!
                </p>
              </div>

              {/* Patch Matching SSD */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400 uppercase tracking-wide">
                    4. Exemplar Search (CIE L*a*b* SSD)
                  </span>
                  <span className="font-mono text-xs text-neutral-400">Equation (2)</span>
                </div>
                <div className="text-center py-2 font-mono text-xs text-white bg-white/5 rounded-lg my-2">
                  Ψq̂ = arg min d(Ψp̂, Ψq) = Σ || I(k) - I(qk) ||²
                </div>
                <p className="text-xs text-neutral-400">
                  Finds the source patch minimizing Sum of Squared Differences (SSD) restricted to known pixels. Using the CIE L*a*b* color space ensures Euclidean distance corresponds to human perceptual uniformity.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              Exemplar Inpainting vs Other Methods
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-white/10 rounded-xl overflow-hidden">
                <thead className="bg-white/5 text-neutral-300 font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Linear Edges</th>
                    <th className="p-2.5">Textures</th>
                    <th className="p-2.5">Blurring</th>
                    <th className="p-2.5">Client-Side</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-neutral-400">
                  <tr className="bg-amber-500/5 text-amber-200">
                    <td className="p-2.5 font-semibold">Criminisi (2004)</td>
                    <td className="p-2.5 text-emerald-400">Preserved via Isophotes</td>
                    <td className="p-2.5 text-emerald-400">Sampled from Photo</td>
                    <td className="p-2.5 text-emerald-400">None (Sharp Patches)</td>
                    <td className="p-2.5 text-emerald-400">Instant in Web Worker</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-white">PDE Diffusion (2000)</td>
                    <td className="p-2.5 text-emerald-400">Good for tiny scratches</td>
                    <td className="p-2.5 text-rose-400">Fails (No texture)</td>
                    <td className="p-2.5 text-rose-400">Severe blur on large holes</td>
                    <td className="p-2.5">Fast</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-white">Neural / Generative AI</td>
                    <td className="p-2.5 text-emerald-400">Hallucinated</td>
                    <td className="p-2.5 text-emerald-400">High quality</td>
                    <td className="p-2.5">None</td>
                    <td className="p-2.5 text-rose-400">Heavy GBs / Server GPU required</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reference Paper Link */}
          <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Read the full publication at Microsoft Research:
            </span>
            <a
              href="https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/criminisi_tip2004.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              <span>Download PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#161822] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
