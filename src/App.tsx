import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { SampleSelector } from './components/SampleSelector';
import { DarkroomCanvas, type ToolMode } from './components/DarkroomCanvas';
import { ControlPanel } from './components/ControlPanel';
import { CompareSlider } from './components/CompareSlider';
import { ProgressBar } from './components/ProgressBar';
import { ResearchModal } from './components/ResearchModal';
import { SAMPLE_IMAGES, type SampleImage } from './utils/sampleImages';
import {
  extractBinaryMask,
  loadAndDownscaleImage,
  MAX_IMAGE_DIMENSION,
} from './utils/imageHelpers';
import type {
  Point,
  InpaintingConfig,
  InpaintingStats,
  WorkerInMessage,
  WorkerOutMessage,
} from './algorithm/types';

export const App: React.FC = () => {
  // Image & Canvas state
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(440);
  const [canvasHeight, setCanvasHeight] = useState<number>(330);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [resultImageData, setResultImageData] = useState<ImageData | null>(null);
  const [previewImageData, setPreviewImageData] = useState<ImageData | null>(null);

  // Mask state
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maskPixelCount, setMaskPixelCount] = useState<number>(0);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('beach-buoy');

  // Tools & Algorithm settings
  const [toolMode, setToolMode] = useState<ToolMode>('brush');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [patchRadius, setPatchRadius] = useState<number>(4); // 9x9 default from paper
  const [searchMode, setSearchMode] = useState<'windowed' | 'full'>('windowed');
  const [useLab, setUseLab] = useState<boolean>(true);
  const [streamIntermediate, setStreamIntermediate] = useState<boolean>(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressStats, setProgressStats] = useState<InpaintingStats | null>(null);
  const [frontPoints, setFrontPoints] = useState<Point[]>([]);
  const [isResearchOpen, setIsResearchOpen] = useState<boolean>(false);

  // Worker reference
  const workerRef = useRef<Worker | null>(null);

  // Helper to re-count mask pixels
  const updateMaskCount = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const binaryMask = extractBinaryMask(maskCanvasRef.current);
    let count = 0;
    for (let i = 0; i < binaryMask.length; i++) {
      if (binaryMask[i] === 1) count++;
    }
    setMaskPixelCount(count);
  }, []);

  // Load a sample image procedurally
  const loadSample = useCallback(
    (sample: SampleImage, withPresetMask: boolean) => {
      setSelectedSampleId(sample.id);
      setResultImageData(null);
      setPreviewImageData(null);
      setProgressStats(null);

      // 1. Draw procedural sample image to offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = sample.width;
      offscreen.height = sample.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      sample.render(ctx);
      const dataUrl = offscreen.toDataURL('image/png');

      const img = new Image();
      img.onload = () => {
        setImageElement(img);
        setCanvasWidth(sample.width);
        setCanvasHeight(sample.height);

        const imgCtx = offscreen.getContext('2d');
        if (imgCtx) {
          const imgData = imgCtx.getImageData(0, 0, sample.width, sample.height);
          setOriginalImageData(imgData);
        }

        // 2. Clear or paint preset mask on mask canvas
        if (maskCanvasRef.current) {
          const maskCanvas = maskCanvasRef.current;
          maskCanvas.width = sample.width;
          maskCanvas.height = sample.height;
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            maskCtx.clearRect(0, 0, sample.width, sample.height);

            if (withPresetMask) {
              maskCtx.save();
              // Amber safelight overlay
              maskCtx.fillStyle = 'rgba(245, 166, 35, 0.7)';
              sample.renderMask(maskCtx);
              maskCtx.restore();
            }
          }
          updateMaskCount();
        }
      };
      img.src = dataUrl;
    },
    [updateMaskCount]
  );

  // Initial load: Load default "beach-buoy" sample with preset mask ready to erase
  useEffect(() => {
    const defaultSample = SAMPLE_IMAGES[0];
    loadSample(defaultSample, true);
  }, [loadSample]);

  // Handle custom image upload
  const handleUploadImage = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!e.target?.result) return;
        const resized = await loadAndDownscaleImage(e.target.result as string);

        const img = new Image();
        img.onload = () => {
          setSelectedSampleId(null);
          setResultImageData(null);
          setPreviewImageData(null);
          setProgressStats(null);

          setImageElement(img);
          setCanvasWidth(resized.width);
          setCanvasHeight(resized.height);
          setOriginalImageData(resized.imageData);

          if (maskCanvasRef.current) {
            maskCanvasRef.current.width = resized.width;
            maskCanvasRef.current.height = resized.height;
            const maskCtx = maskCanvasRef.current.getContext('2d');
            if (maskCtx) maskCtx.clearRect(0, 0, resized.width, resized.height);
            updateMaskCount();
          }
        };
        img.src = e.target.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Could not process this image. Please try another file.');
    }
  };

  // Clear mask
  const handleClearMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      updateMaskCount();
    }
    setResultImageData(null);
    setPreviewImageData(null);
    setProgressStats(null);
  };

  // Run inpainting in Web Worker
  const handleRunInpainting = () => {
    if (!originalImageData || !maskCanvasRef.current || maskPixelCount === 0) return;

    const binaryMask = extractBinaryMask(maskCanvasRef.current);
    setIsProcessing(true);
    setResultImageData(null);
    setPreviewImageData(null);

    // Initialize Web Worker
    const worker = new Worker(
      new URL('./workers/inpainting.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      if (msg.type === 'PROGRESS') {
        setProgressStats(msg.stats);
        if (msg.frontPoints) {
          setFrontPoints(msg.frontPoints);
        }
        if (msg.previewImageData) {
          setPreviewImageData(msg.previewImageData);
        }
      } else if (msg.type === 'COMPLETE') {
        setResultImageData(msg.resultImageData);
        setProgressStats(msg.stats);
        setFrontPoints([]);
        setIsProcessing(false);
        worker.terminate();
        workerRef.current = null;

        // Celebrate completion!
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#F5A623', '#FBBF24', '#8B7CF6'],
        });
      } else if (msg.type === 'ERROR') {
        console.error('Inpainting error:', msg.error);
        alert('An error occurred during inpainting: ' + msg.error);
        setFrontPoints([]);
        setIsProcessing(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    const config: InpaintingConfig = {
      patchRadius,
      searchWindowScale: searchMode === 'windowed' ? 2.5 : 0,
      subsamplingStep: 1, // exhaustive precision
      colorSpace: useLab ? 'lab' : 'rgb',
      epsilon: 0.001,
    };

    const startMsg: WorkerInMessage = {
      type: 'START',
      imageData: originalImageData,
      maskData: binaryMask,
      config,
      streamIntermediate,
      streamIntervalMs: 80,
    };

    worker.postMessage(startMsg);
  };

  // Cancel inpainting
  const handleCancelInpainting = () => {
    if (workerRef.current) {
      const cancelMsg: WorkerInMessage = { type: 'CANCEL' };
      workerRef.current.postMessage(cancelMsg);
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setFrontPoints([]);
    setIsProcessing(false);
  };

  // Reset workspace
  const handleReset = () => {
    handleCancelInpainting();
    const defaultSample = SAMPLE_IMAGES[0];
    loadSample(defaultSample, true);
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#E9E9EC] film-grain flex flex-col selection:bg-amber-500/30">
      {/* Top Navigation */}
      <Navbar
        onOpenResearch={() => setIsResearchOpen(true)}
        onReset={handleReset}
        isProcessing={isProcessing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Sample Photos Bar */}
        <SampleSelector
          onSelectSample={loadSample}
          onUploadImage={handleUploadImage}
          selectedSampleId={selectedSampleId}
          isProcessing={isProcessing}
        />

        {/* Progress Bar (Visible while inpainting) */}
        {isProcessing && (
          <ProgressBar
            stats={progressStats}
            onCancel={handleCancelInpainting}
          />
        )}

        {/* Inpainted Result View: If complete, show Interactive Compare Slider! */}
        {resultImageData && originalImageData && !isProcessing && (
          <div className="bg-[#15171D] border border-amber-500/40 rounded-2xl p-5 shadow-2xl safelight-glow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Object Removed Successfully!
                </h3>
                <p className="text-xs text-neutral-400">
                  Drag the slider to compare before and after, or switch view modes
                </p>
              </div>

              <button
                onClick={() => {
                  setResultImageData(null);
                  setProgressStats(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Back to Painting Mask
              </button>
            </div>

            <CompareSlider
              originalImageData={originalImageData}
              resultImageData={resultImageData}
              maskCanvas={maskCanvasRef.current}
              onDownload={() => {}}
            />
          </div>
        )}

        {/* Canvas & Control Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Canvas Workstage (Lg: 8 cols) */}
          <div className="lg:col-span-8 bg-[#15171D] border border-white/8 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden">
            {/* Darkroom Stage Header */}
            <div className="w-full flex items-center justify-between mb-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Darkroom Canvas · Paint over the region you want to vanish
              </span>
              <span className="font-mono text-neutral-400">
                {canvasWidth} × {canvasHeight} px (Max ~{MAX_IMAGE_DIMENSION}px)
              </span>
            </div>

            {/* Canvas Viewport */}
            <div className="flex items-center justify-center w-full overflow-auto p-2">
              <DarkroomCanvas
                imageElement={imageElement}
                width={canvasWidth}
                height={canvasHeight}
                brushSize={brushSize}
                toolMode={toolMode}
                onMaskChange={updateMaskCount}
                isProcessing={isProcessing}
                maskCanvasRef={maskCanvasRef}
                previewImageData={previewImageData}
                frontPoints={frontPoints}
                progressStats={progressStats}
                patchRadius={patchRadius}
              />
            </div>

            {/* Hint footer */}
            <div className="w-full mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 gap-2">
              <span>
                Tip: Cover the entire object + a tiny 2-3px border around its edges for cleanest removal.
              </span>
              <span>Runs 100% Client-Side in Web Worker</span>
            </div>
          </div>

          {/* Right Control Panel (Lg: 4 cols) */}
          <div className="lg:col-span-4">
            <ControlPanel
              toolMode={toolMode}
              setToolMode={setToolMode}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              onClearMask={handleClearMask}
              onRunInpainting={handleRunInpainting}
              isProcessing={isProcessing}
              maskPixelCount={maskPixelCount}
              totalPixelCount={canvasWidth * canvasHeight}
              patchRadius={patchRadius}
              setPatchRadius={setPatchRadius}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              useLab={useLab}
              setUseLab={setUseLab}
              streamIntermediate={streamIntermediate}
              setStreamIntermediate={setStreamIntermediate}
            />
          </div>
        </div>
      </main>

      {/* Educational Research Modal */}
      <ResearchModal
        isOpen={isResearchOpen}
        onClose={() => setIsResearchOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/8 py-6 text-center text-xs text-neutral-400 bg-[#0E1117]/60 mt-12">
        <p className="max-w-xl mx-auto px-4 leading-relaxed">
          <strong>Vanish</strong> implements &ldquo;Region Filling and Object Removal by Exemplar-Based Image Inpainting&rdquo;
          by A. Criminisi, P. Pérez &amp; K. Toyama (IEEE Transactions on Image Processing, 2004).
          A classical non-AI computer vision algorithm.
        </p>
      </footer>
    </div>
  );
};

export default App;
