import { useEffect } from "react";
import { Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNext, onPrev }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev]);

  if (photos.length === 0 || currentIndex < 0 || currentIndex >= photos.length) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
        {/* Close Button overlay */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[60] text-[#eae1d8] hover:text-[#f6c374] hover:scale-110 p-2 bg-[#110e09]/60 backdrop-blur-md rounded-full border border-[#4f4538]/30 transition-all cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-4 sm:left-8 z-[60] text-[#eae1d8] hover:text-[#f6c374] hover:scale-110 p-3 bg-[#110e09]/60 backdrop-blur-md rounded-full border border-[#4f4538]/30 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 sm:right-8 z-[60] text-[#eae1d8] hover:text-[#f6c374] hover:scale-110 p-3 bg-[#110e09]/60 backdrop-blur-md rounded-full border border-[#4f4538]/30 transition-all cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Content Wrapper */}
        <div className="relative max-w-5xl w-full h-full flex flex-col justify-center items-center px-4 py-20">
          
          {/* Animated Image Container */}
          <div className="relative max-h-[75vh] max-w-full overflow-hidden flex items-center justify-center">
            <motion.img
              key={currentPhoto.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              src={currentPhoto.image_url || undefined}
              alt={currentPhoto.title}
              className="max-h-[75vh] max-w-full object-contain rounded-sm select-none"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Caption / Indicators Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md text-center px-4 space-y-1">
            <h4 className="font-display text-base sm:text-lg font-bold text-[#eae1d8] truncate">
              {currentPhoto.title || "Foto Kegiatan"}
            </h4>
            <div className="flex items-center justify-center gap-2 text-xs font-subheading tracking-widest text-[#9b8f7f] uppercase">
              <span>Photo</span>
              <span className="text-[#f6c374] font-bold">{currentIndex + 1}</span>
              <span>of</span>
              <span>{photos.length}</span>
            </div>
          </div>

        </div>
      </div>
    </AnimatePresence>
  );
}
