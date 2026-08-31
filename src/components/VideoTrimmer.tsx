import React, { useState, useEffect, useRef, useCallback, RefObject } from 'react';

interface VideoTrimmerProps {
  videoUrl: string;
  duration: number;
  startTime: number;
  endTime: number | null;
  loop: boolean;
  onTrimChange: (start: number, end: number | null) => void;
  onLoopChange: (loop: boolean) => void;
  onConfirmTrim: () => void;
  isTrimConfirmed: boolean;
  onPreview: () => void;
  onReset: () => void;
  previewMode: boolean;
  videoRef: RefObject<HTMLVideoElement>;
}

export default function VideoTrimmer({
  videoUrl,
  duration,
  startTime,
  endTime,
  loop,
  onTrimChange,
  onLoopChange,
  onConfirmTrim,
  isTrimConfirmed,
  onPreview,
  onReset,
  previewMode,
  videoRef
}: VideoTrimmerProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPercent, setCurrentPercent] = useState(0);

  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const actualEndTime = endTime === null ? duration : endTime;

  // Track playback time without re-rendering the whole app
  useEffect(() => {
    let animationFrameId: number;
    
    const updatePlayhead = () => {
      if (videoRef.current && duration > 0) {
        setCurrentPercent((videoRef.current.currentTime / duration) * 100);
      }
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };
    
    updatePlayhead();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoRef, duration]);

  // Generate thumbnails safely
  useEffect(() => {
    if (!videoUrl || duration <= 0) return;
    let isCancelled = false;
    
    const generateThumbnails = async () => {
      const numFrames = 10;
      const interval = duration / numFrames;
      const thumbs: string[] = [];
      
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.crossOrigin = "anonymous";
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      video.addEventListener('loadeddata', async () => {
        if (isCancelled) return;
        const ratio = video.videoWidth / video.videoHeight;
        canvas.height = 60;
        canvas.width = 60 * ratio;
        
        for (let i = 0; i < numFrames; i++) {
          if (isCancelled) break;
          video.currentTime = i * interval;
          await new Promise(resolve => {
            video.addEventListener('seeked', function onSeeked() {
              video.removeEventListener('seeked', onSeeked);
              if (!isCancelled && ctx) {
                try {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
                } catch (e) {
                  console.warn("Failed to generate thumbnail for video (CORS issue):", e);
                }
              }
              resolve(null);
            });
          });
        }
        if (!isCancelled) {
          setThumbnails(thumbs);
        }
      });
      video.addEventListener('error', () => {
        if (!isCancelled) setThumbnails([]);
      });
      video.load();
    };
    
    generateThumbnails();
    
    return () => {
      isCancelled = true;
    };
  }, [videoUrl, duration]);

  const handlePointerDown = (type: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const timeAtCursor = percentage * duration;
    
    if (isDragging === 'start') {
      const newStart = Math.min(timeAtCursor, actualEndTime - 0.5); // min 0.5s gap
      onTrimChange(Math.max(0, newStart), endTime);
      if (videoRef.current) videoRef.current.currentTime = Math.max(0, newStart);
    } else if (isDragging === 'end') {
      const newEnd = Math.max(timeAtCursor, startTime + 0.5);
      onTrimChange(startTime, Math.min(duration, newEnd));
      if (videoRef.current) videoRef.current.currentTime = Math.min(duration, newEnd);
    }
  }, [isDragging, duration, startTime, actualEndTime, endTime, onTrimChange, videoRef]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const formatTimeStr = (sec: number | null): string => {
    if (sec === null || sec === undefined) return '...';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = (sec % 60).toFixed(1);
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
  };

  const startPercent = (startTime / duration) * 100 || 0;
  const endPercent = (actualEndTime / duration) * 100 || 100;

  return (
    <div className="bg-[#17130e] border border-[#4f4538]/30 rounded p-4 space-y-4 w-full max-w-md">
      <div className="flex justify-between items-center border-b border-[#4f4538]/30 pb-2">
        <h4 className="font-subheading text-[11px] text-[#eae1d8] uppercase tracking-widest">Atur Rentang Video</h4>
        <div className="flex items-center gap-2">
          {isTrimConfirmed ? (
            <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded tracking-wider uppercase">
              ✓ TRIM DIKONFIRMASI
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-amber-400 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded tracking-wider uppercase">
              TRIM BELUM DIKONFIRMASI
            </span>
          )}
          <span className="text-[10px] text-[#9b8f7f]">Durasi: {formatTimeStr(actualEndTime - startTime)}</span>
        </div>
      </div>

      <div className="relative w-full h-16 rounded overflow-hidden bg-[#110e09] border border-[#4f4538]/50" ref={containerRef}>
        {/* Thumbnails Background */}
        <div className="absolute inset-0 flex">
          {thumbnails.length > 0 ? (
            thumbnails.map((src, i) => (
              <img key={i} src={src || undefined} alt="thumb" className="h-full object-cover flex-1 opacity-60 pointer-events-none" />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-[#9b8f7f]">Memuat frame...</div>
          )}
        </div>
        
        {/* Unselected regions (darkened) */}
        <div className="absolute top-0 bottom-0 left-0 bg-black/70 z-10 pointer-events-none" style={{ width: `${startPercent}%` }} />
        <div className="absolute top-0 bottom-0 right-0 bg-black/70 z-10 pointer-events-none" style={{ width: `${100 - endPercent}%` }} />
        
        {/* Selection Box */}
        <div 
          className="absolute top-0 bottom-0 border-y-2 border-[#f6c374] z-20 pointer-events-none"
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        />

        {/* Start Handle */}
        <div 
          className="absolute top-0 bottom-0 w-4 bg-[#f6c374] flex items-center justify-center cursor-ew-resize z-30 touch-none hover:bg-white transition-colors group"
          style={{ left: `calc(${startPercent}% - 0px)` }}
          onPointerDown={handlePointerDown('start')}
        >
          <div className="w-1 h-4 border-l border-r border-[#110e09]/50" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#110e09] text-[#eae1d8] text-[9px] px-1.5 py-0.5 rounded border border-[#4f4538] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {formatTimeStr(startTime)}
          </div>
        </div>

        {/* End Handle */}
        <div 
          className="absolute top-0 bottom-0 w-4 bg-[#f6c374] flex items-center justify-center cursor-ew-resize z-30 touch-none hover:bg-white transition-colors group"
          style={{ left: `calc(${endPercent}% - 16px)` }}
          onPointerDown={handlePointerDown('end')}
        >
          <div className="w-1 h-4 border-l border-r border-[#110e09]/50" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#110e09] text-[#eae1d8] text-[9px] px-1.5 py-0.5 rounded border border-[#4f4538] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {formatTimeStr(actualEndTime)}
          </div>
        </div>

        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white z-40 pointer-events-none drop-shadow-md"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
        </div>
      </div>

      <div className="flex justify-between items-center px-1">
        <div className="text-[10px] font-mono text-[#eae1d8]">Mulai: {formatTimeStr(startTime)}</div>
        <div className="text-[10px] font-mono text-[#eae1d8]">Selesai: {formatTimeStr(actualEndTime)}</div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input 
          type="checkbox" 
          id="video-loop-timeline" 
          checked={loop} 
          onChange={(e) => onLoopChange(e.target.checked)} 
          className="w-3.5 h-3.5 accent-[#f6c374] bg-[#110e09] border-[#4f4538]"
        />
        <label htmlFor="video-loop-timeline" className="text-[11px] text-[#eae1d8]">Loop video (Ulangi bagian yang dipilih)</label>
      </div>

      {/* BUTTON KONFIRMASI TRIM */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onConfirmTrim}
          className={`w-full py-2.5 px-4 rounded text-[11px] uppercase tracking-widest font-subheading transition-all flex items-center justify-center gap-2 ${
            isTrimConfirmed
              ? "bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 shadow-sm"
              : "bg-[#f6c374] hover:bg-[#e5b263] text-[#110e09] font-bold shadow-md hover:shadow-lg"
          }`}
        >
          <span>✓ KONFIRMASI TRIM</span>
          {isTrimConfirmed && (
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30">
              AKTIF
            </span>
          )}
        </button>
      </div>

      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 bg-[#252019] hover:bg-[#322c23] border border-[#4f4538]/40 text-[#eae1d8] py-2 rounded text-[10px] uppercase tracking-widest font-subheading transition-colors"
        >
          {previewMode ? "HENTIKAN PREVIEW" : "▶ PREVIEW BAGIAN"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="bg-[#110e09] hover:bg-red-900/40 border border-[#4f4538]/40 hover:border-red-500/50 text-[#9b8f7f] hover:text-red-400 px-4 py-2 rounded text-[10px] uppercase tracking-widest font-subheading transition-colors whitespace-nowrap"
          title="Reset Trim"
        >
          ↻ RESET TRIM
        </button>
      </div>
    </div>
  );
}
