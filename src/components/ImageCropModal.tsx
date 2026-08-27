import React, { useState, useRef, useEffect } from "react";
import { RotateCw, RotateCcw, RefreshCw, Check, X, ZoomIn, ZoomOut, Image as ImageIcon } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string, fileInfo: { width: number; height: number; sizeFormatted: string }) => void;
}

export function ImageCropModal({ isOpen, imageFile, onClose, onCropComplete }: ImageCropModalProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImgSrc("");
      setImageObj(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImgSrc(url);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });

    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImageObj(img);
      // Auto-fit initial zoom so 4:5 frame covers nicely
      const frameAspect = 4 / 5;
      const imgAspect = img.width / img.height;
      if (imgAspect > frameAspect) {
        // Image is wider than 4:5
        setZoom(1);
      } else {
        // Image is taller
        setZoom(1);
      }
    };

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Redraw preview canvas
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Display resolution
    const displayWidth = 360;
    const displayHeight = 450; // 4:5 ratio
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.save();

    // Background
    ctx.fillStyle = "#110e09";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Translate to center for rotation & zoom
    ctx.translate(displayWidth / 2 + pan.x, displayHeight / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw centered image
    const imgW = imageObj.width;
    const imgH = imageObj.height;

    // Base scale to cover 4:5 frame
    const scale = Math.max(displayWidth / imgW, displayHeight / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    ctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imageObj, zoom, rotation, pan]);

  if (!isOpen || !imageFile) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleApplyCrop = async () => {
    if (!imageObj) return;

    // Target high-res 4:5 export (e.g. 1080 x 1350)
    const targetW = 1080;
    const targetH = 1350;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#110e09";
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    // Scale factor from display canvas (360x450) to export canvas (1080x1350) is 3x
    const scaleFactor = targetW / 360;

    ctx.translate(targetW / 2 + pan.x * scaleFactor, targetH / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgW = imageObj.width;
    const imgH = imageObj.height;
    const scale = Math.max(targetW / imgW, targetH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    ctx.drawImage(imageObj, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], `cover-crop-${Date.now()}.jpg`, { type: "image/jpeg" });
        const previewUrl = URL.createObjectURL(blob);

        const sizeKb = Math.round(blob.size / 1024);
        const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        onCropComplete(croppedFile, previewUrl, {
          width: targetW,
          height: targetH,
          sizeFormatted
        });
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#17130e] border border-[#4f4538]/40 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#4f4538]/35 bg-[#110e09]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#f6c374]" />
            <h3 className="font-heading font-bold text-lg text-[#eae1d8]">Edit / Crop Foto (Rasio 4:5 Portrait)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#9b8f7f] hover:text-[#eae1d8] p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded-lg p-3 text-xs text-[#9b8f7f] leading-relaxed">
            Gunakan foto portrait dengan rasio 4:5. Geser gambar (drag), gunakan slider zoom, atau tombol putar untuk mengatur posisi subjek di dalam frame 4:5.
          </div>

          {/* Canvas Preview Area */}
          <div className="flex flex-col items-center justify-center bg-[#0d0a07] border border-[#4f4538]/30 rounded-lg p-4 relative overflow-hidden">
            <div
              ref={containerRef}
              className="relative w-[360px] h-[450px] border-2 border-dashed border-[#f6c374]/50 rounded overflow-hidden cursor-move shadow-inner select-none bg-black flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

              {/* Grid Overlay 3x3 */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-[#f6c374]/30">
                <div className="border-r border-b border-[#f6c374]/20" />
                <div className="border-r border-b border-[#f6c374]/20" />
                <div className="border-b border-[#f6c374]/20" />
                <div className="border-r border-b border-[#f6c374]/20" />
                <div className="border-r border-b border-[#f6c374]/20" />
                <div className="border-b border-[#f6c374]/20" />
                <div className="border-r border-[#f6c374]/20" />
                <div className="border-r border-[#f6c374]/20" />
                <div />
              </div>

              <div className="absolute bottom-2 left-2 bg-black/70 text-[#eae1d8] px-2 py-0.5 rounded text-[10px] font-subheading tracking-wider uppercase pointer-events-none">
                Rasio Terkunci 4:5
              </div>
            </div>
            <span className="text-[11px] text-[#9b8f7f] mt-2 italic">Geser dan sesuaikan area crop di dalam kotak.</span>
          </div>

          {/* Controls */}
          <div className="space-y-4 bg-[#110e09]/40 border border-[#4f4538]/25 rounded-lg p-4">
            {/* Zoom Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#eae1d8] font-subheading">
                <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5 text-[#f6c374]" /> Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="p-1.5 bg-[#17130e] hover:bg-[#252019] border border-[#4f4538]/40 rounded text-[#eae1d8]"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#f6c374] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  className="p-1.5 bg-[#17130e] hover:bg-[#252019] border border-[#4f4538]/40 rounded text-[#eae1d8]"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rotation & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#4f4538]/20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev - 90) % 360)}
                  className="bg-[#17130e] hover:bg-[#252019] text-[#eae1d8] border border-[#4f4538]/40 px-3 py-2 rounded text-xs font-subheading inline-flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#f6c374]" />
                  <span>Putar Kiri</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="bg-[#17130e] hover:bg-[#252019] text-[#eae1d8] border border-[#4f4538]/40 px-3 py-2 rounded text-xs font-subheading inline-flex items-center gap-1.5 transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#f6c374]" />
                  <span>Putar Kanan</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setPan({ x: 0, y: 0 });
                }}
                className="bg-[#17130e] hover:bg-[#252019] text-[#9b8f7f] hover:text-[#eae1d8] border border-[#4f4538]/30 px-3 py-2 rounded text-xs font-subheading inline-flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#4f4538]/35 bg-[#110e09]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded bg-transparent hover:bg-white/5 text-[#9b8f7f] hover:text-[#eae1d8] text-xs font-subheading uppercase tracking-widest transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2.5 rounded bg-gradient-to-r from-[#f6c374] to-[#e0ab54] hover:from-[#f8cd88] hover:to-[#eeb55e] text-[#110e09] font-subheading font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2 shadow-lg transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Crop</span>
          </button>
        </div>

      </div>
    </div>
  );
}
