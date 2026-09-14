import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCw, Move, RefreshCw, Download, Image as ImageIcon, Sparkles, Upload } from "lucide-react";

interface TwibbonEditorProps {
  ratio: "1:1" | "4:3" | "16:9" | "9:16";
  frameUrl: string;
  slug: string;
  title: string;
  onDownloadCompleted?: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function TwibbonEditor({
  ratio,
  frameUrl,
  slug,
  title,
  onDownloadCompleted,
  onShowToast
}: TwibbonEditorProps) {
  // Image and file states
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Layout transform states
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [rotate, setRotate] = useState(0);

  // Dragging states
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });

  // Refs for elements
  const containerRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset transform adjustments
  const resetTransforms = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setRotate(0);
    currentOffset.current = { x: 0, y: 0 };
  };

  // Trigger file selection
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle local user photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      onShowToast("File harus berupa gambar (JPEG/PNG).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoSrc(event.target.result as string);
        setPhotoLoaded(false);
        resetTransforms();
      }
    };
    reader.readAsDataURL(file);
  };

  // Load natural dimensions once image element loads source
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setPhotoLoaded(true);
    onShowToast("Foto berhasil dimuat. Atur posisi sesukamu!", "success");
  };

  // Fit image to completely cover the layout area (cover preset)
  const handleFitCover = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    currentOffset.current = { x: 0, y: 0 };
  };

  // Fit image to be entirely visible inside layout area (contain preset)
  const handleFitContain = () => {
    if (!containerRef.current || !naturalSize.width) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const scaleX = cw / naturalSize.width;
    const scaleY = ch / naturalSize.height;
    // Cover scale factor
    const coverScale = Math.max(scaleX, scaleY);
    // Contain scale factor
    const containScale = Math.min(scaleX, scaleY);

    // Contain scale relative to cover scale as baseline
    const targetScale = containScale / coverScale;
    setScale(targetScale);
    setTranslateX(0);
    setTranslateY(0);
    currentOffset.current = { x: 0, y: 0 };
  };

  // Setup drag event listeners on container for both mouse and touch
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!photoSrc || !photoLoaded) return;
    setIsDragging(true);
    dragStart.current = { x: clientX - translateX, y: clientY - translateY };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;
    setTranslateX(newX);
    setTranslateY(newY);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Aspect ratio helper CSS class
  const getAspectClass = () => {
    switch (ratio) {
      case "4:3":
        return "aspect-[4/3] w-full max-w-[500px]";
      case "16:9":
        return "aspect-video w-full max-w-[550px]";
      case "9:16":
        return "aspect-[9/16] h-[550px] max-h-[80vh] w-auto";
      case "1:1":
      default:
        return "aspect-square w-full max-w-[420px]";
    }
  };

  // Render Base values
  let coverScale = 1;
  let baseWidth = 0;
  let baseHeight = 0;

  if (containerRef.current && naturalSize.width > 0) {
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    const scaleX = cw / naturalSize.width;
    const scaleY = ch / naturalSize.height;
    coverScale = Math.max(scaleX, scaleY);

    baseWidth = naturalSize.width * coverScale;
    baseHeight = naturalSize.height * coverScale;
  }

  // Compile final image and download
  const handleCompileDownload = async () => {
    if (!photoSrc || !photoLoaded) {
      onShowToast("Silakan pilih foto terlebih dahulu.", "error");
      return;
    }

    setIsProcessing(true);
    onShowToast("Sedang menyusun Twibbon berkualitas tinggi...", "success");

    try {
      // 1. Create high-resolution Canvas matching ratio
      const canvas = document.createElement("canvas");
      let outW = 1200;
      let outH = 1200;

      if (ratio === "4:3") {
        outH = 900;
      } else if (ratio === "16:9") {
        outH = 675;
      } else if (ratio === "9:16") {
        outW = 675;
        outH = 1200;
      }

      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal menginisialisasi canvas.");

      // Clear with solid white background (or transparency fallback)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);

      // Load Images inside promises
      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = (err) => reject(err);
          img.src = src;
        });
      };

      const [userImg, frameImg] = await Promise.all([
        loadImg(photoSrc),
        loadImg(frameUrl)
      ]);

      // Calculate translation and scale scale-factor relative to container bounds
      const cw = containerRef.current?.clientWidth || 400;
      const factor = outW / cw;

      ctx.save();
      // Translate to high-res center plus responsive user translation
      ctx.translate(outW / 2 + translateX * factor, outH / 2 + translateY * factor);
      // Apply rotation transformation
      ctx.rotate((rotate * Math.PI) / 180);

      // Calculate base sizes under cover fit
      const scaleX = outW / userImg.naturalWidth;
      const scaleY = outH / userImg.naturalHeight;
      const hCoverScale = Math.max(scaleX, scaleY);

      const hBaseW = userImg.naturalWidth * hCoverScale;
      const hBaseH = userImg.naturalHeight * hCoverScale;

      // Draw high resolution user photo
      ctx.drawImage(
        userImg,
        (-hBaseW * scale) / 2,
        (-hBaseH * scale) / 2,
        hBaseW * scale,
        hBaseH * scale
      );
      ctx.restore();

      // Draw PNG transparent frame on top covering the canvas
      ctx.drawImage(frameImg, 0, 0, outW, outH);

      // Convert and download
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `twibon-${slug}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast("Twibbon berhasil diunduh!", "success");
      if (onDownloadCompleted) onDownloadCompleted();
    } catch (error) {
      console.error("Compile Twibbon Error:", error);
      onShowToast("Gagal menyusun gambar. Coba ganti foto lain.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full items-center">
      {/* 1. WORKSPACE CANVAS CONTAINER */}
      <div className="relative flex justify-center items-center w-full max-w-full p-2 bg-[#17130e]/30 border border-[#4f4538]/10 rounded-sm overflow-hidden">
        
        {/* Checkerboard Background Sandbox */}
        <div
          ref={containerRef}
          className={`${getAspectClass()} relative overflow-hidden bg-[#110e09] border border-[#4f4538]/30 select-none shadow-2xl`}
          style={{
            backgroundImage: "linear-gradient(45deg, #1f1a12 25%, transparent 25%), linear-gradient(-45deg, #1f1a12 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1a12 75%), linear-gradient(-45deg, transparent 75%, #1f1a12 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
          }}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handleDragEnd}
        >
          {/* USER IMAGE LAYER (Z-index 10) */}
          {photoSrc && (
            <img
              ref={photoRef}
              src={photoSrc}
              alt="User"
              onLoad={handleImageLoaded}
              className="absolute pointer-events-none origin-center"
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                left: "50%",
                top: "50%",
                marginLeft: `-${baseWidth / 2}px`,
                marginTop: `-${baseHeight / 2}px`,
                transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scale})`,
              }}
              referrerPolicy="no-referrer"
            />
          )}

          {/* FRAME OVERLAY (Z-index 20) */}
          <img
            src={frameUrl}
            alt="Frame Overlay"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-20"
            referrerPolicy="no-referrer"
          />

          {/* INITIAL CHOOSE PHOTO WATERMARK (Z-index 30) */}
          {!photoSrc && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/65 backdrop-blur-[2px] z-30 space-y-4">
              <div className="w-14 h-14 rounded-full border border-dashed border-[#f6c374]/50 flex items-center justify-center text-[#f6c374]/80 bg-[#17130e]/80 animate-pulse">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-[280px]">
                <h5 className="font-display text-sm font-bold text-[#eae1d8] uppercase tracking-wider">
                  Foto Kosong
                </h5>
                <p className="font-body text-[11px] text-[#9b8f7f] leading-relaxed">
                  Unggah fotomu sekarang. Posisi dan ukuran foto bisa diatur sepuasnya di bawah frame.
                </p>
              </div>
              <button
                onClick={triggerFileSelect}
                className="bg-[#d8a85c] hover:bg-[#f6c374] text-[#110e09] font-subheading text-[10px] tracking-widest uppercase py-2.5 px-5 rounded-sm font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> PILIH FOTO ANDA
              </button>
            </div>
          )}

          {/* DRAG POINTER OVERLAY (ONLY VISIBLE WHEN IMAGE LOADED) */}
          {photoSrc && photoLoaded && (
            <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md border border-[#4f4538]/30 py-1.5 px-2.5 rounded-sm pointer-events-none z-30 flex items-center gap-1.5 text-[9px] text-[#9b8f7f] uppercase tracking-wider">
              <Move className="w-3.5 h-3.5 text-[#f6c374]" />
              <span>Geser foto dengan kursor/jari</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. IMAGE CONTROL PANEL (HIDDEN IF NO PHOTO LOADED TO REDUCE CLUTTER) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {photoSrc && photoLoaded && (
        <div className="w-full max-w-[480px] bg-[#110e09] border border-[#4f4538]/15 rounded-sm p-4 space-y-4 shadow-xl">
          {/* Action Header */}
          <div className="flex justify-between items-center pb-3 border-b border-[#4f4538]/15">
            <span className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#f6c374]" /> Kontrol Foto
            </span>
            <button
              onClick={triggerFileSelect}
              className="text-[#f6c374] hover:text-[#eae1d8] text-[10px] font-subheading tracking-widest uppercase transition-colors"
            >
              Ganti Foto
            </button>
          </div>

          {/* Zoom Slider Slider & Buttons */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-subheading tracking-widest text-[#9b8f7f] uppercase">
              <span>Zooming Ukuran</span>
              <span className="text-[#f6c374]">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setScale((prev) => Math.max(0.1, prev - 0.05))}
                className="w-8 h-8 rounded-sm bg-[#17130e] border border-[#4f4538]/30 flex items-center justify-center text-[#eae1d8] hover:bg-[#39342e]/30 transition-colors"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-[#d8a85c] h-1 bg-[#17130e] rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setScale((prev) => Math.min(3, prev + 0.05))}
                className="w-8 h-8 rounded-sm bg-[#17130e] border border-[#4f4538]/30 flex items-center justify-center text-[#eae1d8] hover:bg-[#39342e]/30 transition-colors"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rotation Adjuster */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-subheading tracking-widest text-[#9b8f7f] uppercase">
              <span>Rotasi Derajat</span>
              <span className="text-[#f6c374]">{rotate}&deg;</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRotate((prev) => (prev - 5) % 360)}
                className="flex-1 py-1.5 rounded-sm bg-[#17130e] border border-[#4f4538]/30 text-center font-subheading text-[10px] uppercase text-[#eae1d8] hover:bg-[#39342e]/30 transition-colors"
              >
                -5&deg; Putar
              </button>
              <button
                onClick={() => setRotate((prev) => (prev + 90) % 360)}
                className="flex-1 py-1.5 rounded-sm bg-[#17130e] border border-[#4f4538]/30 text-center font-subheading text-[10px] uppercase text-[#eae1d8] hover:bg-[#39342e]/30 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#f6c374]" /> +90&deg;
              </button>
              <button
                onClick={() => setRotate((prev) => (prev + 5) % 360)}
                className="flex-1 py-1.5 rounded-sm bg-[#17130e] border border-[#4f4538]/30 text-center font-subheading text-[10px] uppercase text-[#eae1d8] hover:bg-[#39342e]/30 transition-colors"
              >
                +5&deg; Putar
              </button>
            </div>
          </div>

          {/* Layout presets */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleFitCover}
              className="py-2 px-1.5 rounded-sm border border-[#4f4538]/20 bg-[#17130e] hover:bg-[#39342e]/30 text-[10px] font-subheading tracking-wider uppercase text-[#d3c4b3] transition-all"
            >
              Fit Cover
            </button>
            <button
              onClick={handleFitContain}
              className="py-2 px-1.5 rounded-sm border border-[#4f4538]/20 bg-[#17130e] hover:bg-[#39342e]/30 text-[10px] font-subheading tracking-wider uppercase text-[#d3c4b3] transition-all"
            >
              Fit Contain
            </button>
            <button
              onClick={resetTransforms}
              className="py-2 px-1.5 rounded-sm border border-[#4f4538]/20 bg-[#17130e] hover:bg-red-950/20 text-[10px] font-subheading tracking-wider uppercase text-red-300 transition-all flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Download Action */}
          <button
            onClick={handleCompileDownload}
            disabled={isProcessing}
            className="w-full bg-[#d8a85c] hover:bg-[#f6c374] text-[#110e09] font-subheading text-xs tracking-widest uppercase font-bold py-3.5 rounded-sm transition-all shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>MEMPROSES GAMBAR...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>UNDUH TWIBBON SEKARANG</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
