import React, { useRef } from 'react';
import { SAMPLE_IMAGES, type SampleImage } from '../utils/sampleImages';
import { Upload, Wand2, Image as ImageIcon } from 'lucide-react';

interface SampleSelectorProps {
  onSelectSample: (sample: SampleImage, withPresetMask: boolean) => void;
  onUploadImage: (file: File) => void;
  selectedSampleId: string | null;
  isProcessing: boolean;
}

export const SampleSelector: React.FC<SampleSelectorProps> = ({
  onSelectSample,
  onUploadImage,
  selectedSampleId,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-[#15171D] border border-white/8 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            Sample Benchmark Photos
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Test classic Criminisi (2004) experiments or upload your own photo
          </p>
        </div>

        {/* Upload Custom Photo Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all disabled:opacity-40"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Your Own Photo
          </button>
        </div>
      </div>

      {/* Grid of 4 Sample Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAMPLE_IMAGES.map((sample) => {
          const isSelected = selectedSampleId === sample.id;

          return (
            <div
              key={sample.id}
              className={`group relative rounded-xl p-3 border transition-all text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-[#0E1117]/80 hover:bg-[#1A1D24] border-white/6 hover:border-white/15'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                    {sample.title}
                  </h3>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-amber-400/90 font-medium mb-1">
                  {sample.subtitle}
                </p>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 mt-auto">
                <button
                  type="button"
                  onClick={() => onSelectSample(sample, false)}
                  disabled={isProcessing}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40 text-center"
                >
                  Load Image
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSample(sample, true)}
                  disabled={isProcessing}
                  title="Load image with ready-to-erase mask preset"
                  className="py-1.5 px-2 rounded-lg text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Preset Mask</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
