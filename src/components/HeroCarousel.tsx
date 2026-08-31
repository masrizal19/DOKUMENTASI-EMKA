import { useState, useEffect, useRef } from "react";
import { Activity, Settings } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, FolderOpen } from "lucide-react";

interface HeroCarouselProps {
  key?: string | number;
  activities: Activity[];
  onViewActivity: (slug: string) => void;
  settings?: Settings | null;
}

const getBgTransitionClasses = (isActive: boolean, mode: string, offset: number) => {
  const base = "absolute inset-0 w-full h-full transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]";
  
  switch(mode) {
    case "Fade":
      return `${base} ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`;
    case "Crossfade":
      return `${base} ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`;
    case "Slide": 
      return `${base} ${isActive ? "opacity-100 translate-x-0 z-10" : (offset > 0 ? "opacity-0 translate-x-full z-0" : "opacity-0 -translate-x-full z-0")}`;
    case "Slide Up":
      return `${base} ${isActive ? "opacity-100 translate-y-0 z-10" : "opacity-0 translate-y-full z-0"}`;
    case "Slide Down":
      return `${base} ${isActive ? "opacity-100 translate-y-0 z-10" : "opacity-0 -translate-y-full z-0"}`;
    case "Zoom":
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-50 z-0"}`;
    case "Zoom + Fade":
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`;
    case "Blur + Fade":
      return `${base} ${isActive ? "opacity-100 blur-none z-10" : "opacity-0 blur-xl z-0"}`;
    case "Ken Burns":
      return `${base} ${isActive ? "opacity-100 scale-110 z-10 duration-[20000ms] ease-linear" : "opacity-0 scale-100 z-0 duration-[1200ms]"}`;
    case "Parallax":
      return `${base} ${isActive ? "opacity-100 translate-x-0 z-10" : (offset > 0 ? "opacity-0 translate-x-[20%] z-0" : "opacity-0 -translate-x-[20%] z-0")}`;
    case "Cinematic":
      return `${base} ${isActive ? "opacity-100 scale-100 rotate-0 z-10 duration-[2000ms]" : "opacity-0 scale-110 rotate-1 z-0"}`;
    default:
      return `${base} ${isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"}`;
  }
};

export default function HeroCarousel({ activities, onViewActivity, settings }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState<{ [key: string]: boolean }>({});
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const durationSec = settings?.slideshow_duration ?? 5;
  const durationMs = Math.max(2000, Math.min(30000, durationSec * 1000));
  const blurPercent = settings?.slideshow_blur ?? 35;
  const blurPx = Math.round((blurPercent / 100) * 12 * 10) / 10;
  const transitionMode = settings?.slideshow_transition ?? "Fade";

  // Determine slide items based on Settings
  let activeActivities: Activity[] = [];

  const sourceMode = settings?.slideshow_source || "latest";
  const slideLimit = typeof settings?.slideshow_limit === "number" && settings.slideshow_limit > 0 
    ? settings.slideshow_limit 
    : 5;
  const galleryIds = Array.isArray(settings?.slideshow_gallery_ids) ? settings.slideshow_gallery_ids : [];

  if (sourceMode === "gallery" || sourceMode === "PILIH DARI GALERI") {
    // 1. "PILIH DARI GALERI": Display activities picked by admin in exact order
    const ordered: Activity[] = [];
    galleryIds.forEach(id => {
      const foundAct = activities.find(a => a.id === id);
      if (foundAct && foundAct.cover_image && (foundAct.status === "published" || foundAct.status === undefined)) {
        ordered.push(foundAct);
      }
    });
    activeActivities = ordered.slice(0, slideLimit);

    // Fallback if none are selected
    if (activeActivities.length === 0) {
      const validActs = activities
        .filter(act => (act.status === "published" || act.status === undefined) && Boolean(act.cover_image))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      activeActivities = validActs.slice(0, slideLimit);
    }
  } else {
    // 2. "GAMBAR TERBARU": Sort by newest date, filter valid cover_images, take slideLimit
    const validActs = activities
      .filter(act => (act.status === "published" || act.status === undefined) && Boolean(act.cover_image))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    activeActivities = validActs.slice(0, slideLimit);
  }

  const totalSlides = activeActivities.length;
  const currentActivity = activeActivities[currentIndex] || activeActivities[0];

  // 1. Detect Viewport Width for Responsiveness
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 2. Play active background video
  useEffect(() => {
    if (currentActivity && videoRefs.current[currentActivity.id]) {
      const vid = videoRefs.current[currentActivity.id]!;
      const start = currentActivity.background_video_start || 0;
      if (vid.currentTime < start || vid.currentTime === 0) {
        vid.currentTime = start;
      }
      vid.play().catch(() => {
        // Safe play fail (browser auto-block fallback)
      });
    }
  }, [currentIndex, currentActivity]);

  // 3. Autoplay Setup with custom pause/resume mechanics
  const handleNext = () => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handlePrev = () => {
    if (totalSlides === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
    }
    
    // Autoplay transition interval based on settings
    autoplayTimerRef.current = setInterval(() => {
      if (!isHovered && totalSlides > 1) {
        handleNext();
      }
    }, durationMs);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [currentIndex, isHovered, totalSlides, durationMs]);

  // 4. Keyboard Navigation: Arrow Left/Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (totalSlides <= 1) return;
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalSlides]);

  if (totalSlides === 0 || !currentActivity) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#17130e] text-[#eae1d8]">
        <p className="font-body text-sm text-[#d3c4b3]">Belum ada kegiatan yang dipublikasikan.</p>
      </div>
    );
  }

  // 5. Shortest circular offset calculation
  const getOffset = (index: number) => {
    let offset = index - currentIndex;
    const half = totalSlides / 2;
    if (offset < -half) offset += totalSlides;
    else if (offset > half) offset -= totalSlides;
    return offset;
  };

  // 6. Responsive 3D Perspective card configurations
  const getCardStyles = (offset: number) => {
    if (totalSlides === 1) {
      return {
        x: 0,
        scale: 1,
        rotateY: 0,
        opacity: 1,
        zIndex: 10,
        filter: "blur(0px) brightness(1)",
        pointerEvents: "auto" as const,
      };
    }
    if (isMobile) {
      if (offset === 0) {
        return {
          x: 0,
          scale: 1,
          rotateY: 0,
          opacity: 1,
          zIndex: 10,
          filter: "blur(0px) brightness(1)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === -1) {
        return {
          x: "-60%",
          scale: 0.78,
          rotateY: 10,
          opacity: 0.4,
          zIndex: 5,
          filter: "blur(2px) brightness(0.45)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === 1) {
        return {
          x: "60%",
          scale: 0.78,
          rotateY: -10,
          opacity: 0.4,
          zIndex: 5,
          filter: "blur(2px) brightness(0.45)",
          pointerEvents: "auto" as const,
        };
      } else {
        return {
          x: offset < 0 ? "-150%" : "150%",
          scale: 0.6,
          rotateY: offset < 0 ? 15 : -15,
          opacity: 0,
          zIndex: 0,
          filter: "blur(4px) brightness(0.3)",
          pointerEvents: "none" as const,
        };
      }
    } else {
      // Desktop perspective adjustments
      if (offset === 0) {
        return {
          x: 0,
          scale: 1,
          rotateY: 0,
          opacity: 1,
          zIndex: 10,
          filter: "blur(0px) brightness(1)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === -1) {
        return {
          x: "-100%",
          scale: 0.82,
          rotateY: 14,
          opacity: 0.55,
          zIndex: 5,
          filter: "blur(1.5px) brightness(0.5)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === 1) {
        return {
          x: "100%",
          scale: 0.82,
          rotateY: -14,
          opacity: 0.55,
          zIndex: 5,
          filter: "blur(1.5px) brightness(0.5)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === -2) {
        return {
          x: "-190%",
          scale: 0.68,
          rotateY: 22,
          opacity: 0.2,
          zIndex: 2,
          filter: "blur(3px) brightness(0.3)",
          pointerEvents: "auto" as const,
        };
      } else if (offset === 2) {
        return {
          x: "190%",
          scale: 0.68,
          rotateY: -22,
          opacity: 0.2,
          zIndex: 2,
          filter: "blur(3px) brightness(0.3)",
          pointerEvents: "auto" as const,
        };
      } else {
        return {
          x: offset < 0 ? "-280%" : "280%",
          scale: 0.5,
          rotateY: offset < 0 ? 30 : -30,
          opacity: 0,
          zIndex: 0,
          filter: "blur(5px) brightness(0.2)",
          pointerEvents: "none" as const,
        };
      }
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between bg-[#110e09] z-10 select-none overflow-x-hidden">
      
      {/* Background Sync Layers (Atmospheric Cinematic Background) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none">
        {activeActivities.map((act, index) => {
          const isActive = index === currentIndex;
          const showVideo = act.background_video && videoLoaded[act.id];

          const offset = getOffset(index);
          return (
            <div
              key={`bg-${act.id}`}
              className={getBgTransitionClasses(isActive, transitionMode, offset)}
            >
              {/* Cover Image fallback */}
              <img
                src={act.cover_image || undefined}
                alt=""
                className="w-full h-full object-cover filter brightness-[0.22] transform scale-[1.08]"
                style={{ filter: `brightness(0.22) blur(${blurPx}px)` }}
                referrerPolicy="no-referrer"
            onError={(e) => {
              console.error("Image failed to load in HeroCarousel.tsx");
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
            }}
          />

              {/* Background video layer */}
              {act.background_video && (
                <video
                  ref={(el) => {
                    videoRefs.current[act.id] = el;
                  }}
                  src={act.background_video || undefined}
                  poster={act.cover_image || undefined}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const start = act.background_video_start || 0;
                    if (start > 0) {
                      e.currentTarget.currentTime = start;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const start = act.background_video_start || 0;
                    const end = act.background_video_end;
                    const loop = act.background_video_loop !== false;
                    
                    if (start > 0 && e.currentTarget.currentTime < start) {
                      e.currentTarget.currentTime = start;
                    }

                    if (end && end > start && e.currentTarget.currentTime >= end) {
                      if (loop) {
                        e.currentTarget.currentTime = start;
                        e.currentTarget.play().catch(() => {});
                      } else {
                        e.currentTarget.pause();
                      }
                    }
                  }}
                  onEnded={(e) => {
                     const start = act.background_video_start || 0;
                     const loop = act.background_video_loop !== false;
                     if (loop) {
                        e.currentTarget.currentTime = start;
                        e.currentTarget.play().catch(() => {});
                     }
                  }}
                  onPlay={() => setVideoLoaded((prev) => ({ ...prev, [act.id]: true }))}
                  onError={() => setVideoLoaded((prev) => ({ ...prev, [act.id]: false }))}
                  className={`absolute inset-0 w-full h-full object-cover filter brightness-[0.22] blur-[15px] transition-opacity duration-1000 ${
                    showVideo ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ filter: `brightness(0.22) blur(${blurPx}px)` }}
                />
              )}
            </div>
          );
        })}
        {/* Double-layered gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#17130e] via-transparent to-[#110e09]/80 z-20" />
        <div className="absolute inset-0 bg-black/45 z-20" />
      </div>

      {/* Foreground Container */}
      <div className="relative z-20 w-full min-h-screen flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-x-hidden">
        
        {/* TOP COMPONENT: Carousel Stage */}
        <div 
          className="w-full flex-1 flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing my-auto py-2 sm:py-4"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Main 3D Stage with perspective */}
          <motion.div 
            drag={totalSlides > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(event, info) => {
              const threshold = 50;
              if (info.offset.x < -threshold) {
                handleNext();
              } else if (info.offset.x > threshold) {
                handlePrev();
              }
            }}
            className="relative w-full h-[290px] sm:h-[350px] md:h-[390px] lg:h-[430px] flex items-center justify-center"
            style={{ perspective: 1200, transformStyle: "preserve-3d" }}
          >
            {activeActivities.map((act, index) => {
              const offset = getOffset(index);
              const cardStyle = getCardStyles(offset);

              return (
                <motion.div
                  key={act.id}
                  style={{
                    position: "absolute",
                    transformOrigin: "center center",
                    pointerEvents: cardStyle.pointerEvents,
                  }}
                  animate={{
                    x: cardStyle.x,
                    scale: cardStyle.scale,
                    rotateY: cardStyle.rotateY,
                    opacity: cardStyle.opacity,
                    zIndex: cardStyle.zIndex,
                    filter: cardStyle.filter,
                  }}
                  transition={{
                    duration: 1.0,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => {
                    if (offset !== 0) {
                      setCurrentIndex(index);
                    } else if (act.slug) {
                      onViewActivity(act.slug);
                    }
                  }}
                  className="w-[210px] h-[290px] sm:w-[260px] sm:h-[350px] md:w-[290px] md:h-[390px] lg:w-[320px] lg:h-[430px] rounded-[16px] overflow-hidden border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] cursor-pointer group select-none flex-shrink-0"
                >
                  {/* Photo Layer */}
                  <img
                    src={act.cover_image || undefined}
                    alt={act.title}
                    className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
            onError={(e) => {
              console.error("Image failed to load in HeroCarousel.tsx");
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
            }}
          />

                  {/* Glass Card Tint Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                  
                  {/* Card category badge floating */}
                  {offset === 0 && (
                    <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                      <span className="font-subheading text-[9px] sm:text-[10px] text-[#f6c374] bg-[#110e09]/80 backdrop-blur border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {act.category}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* BOTTOM COMPONENT: Interactive Details & Navigation Controls */}
        <div className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
          
          {/* Synchronized Text Entrance section */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-2 sm:space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentActivity.id}
                initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(2px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2 sm:space-y-2.5 flex flex-col items-center"
              >
                {/* Category eyebrow */}
                <span className="font-subheading text-[10px] sm:text-[11px] text-[#f6c374] tracking-[0.25em] uppercase font-bold">
                  {currentActivity.category}
                </span>

                {/* Main Heading */}
                <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#eae1d8] uppercase tracking-wide leading-tight max-w-xl">
                  {currentActivity.title}
                </h1>

                {/* Description Text */}
                <p className="font-body text-xs sm:text-sm text-[#d3c4b3]/90 leading-relaxed max-w-lg line-clamp-3 sm:line-clamp-none">
                  {currentActivity.description}
                </p>

                {/* Call-to-actions buttons */}
                <div className="pt-1.5 flex flex-wrap gap-2.5 sm:gap-4 justify-center items-center">
                  {currentActivity.slug && (
                    <button
                      onClick={() => onViewActivity(currentActivity.slug)}
                      className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-[10px] sm:text-[11px] tracking-widest uppercase py-2.5 px-6 rounded-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" /> LIHAT DOKUMENTASI
                    </button>
                  )}

                  {currentActivity.google_drive_url && (
                    <a
                      href={currentActivity.google_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#110e09]/90 border border-white/10 hover:bg-[#eae1d8] hover:text-[#110e09] text-[#eae1d8] font-subheading text-[10px] sm:text-[11px] tracking-widest uppercase py-2.5 px-6 rounded-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#f6c374]" /> LIHAT SEMUA FOTO
                    </a>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Control Area */}
          <div className="flex flex-row justify-between items-center gap-4 border-t border-white/10 pt-3 sm:pt-4">
            
            {/* Index Counter Display */}
            <div className="flex items-baseline gap-1.5 font-display text-xl sm:text-2xl text-white/30">
              <span className="text-[#f6c374] font-bold">0{currentIndex + 1}</span>
              <span className="text-xs sm:text-sm">/</span>
              <span className="text-xs sm:text-sm text-[#eae1d8]/50">0{totalSlides}</span>
            </div>

            {/* Slider progress bar line */}
            <div className="h-[2px] flex-1 max-w-xs bg-white/10 rounded-full overflow-hidden mx-4 hidden sm:block">
              <motion.div
                initial={false}
                animate={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-[#f6c374]"
              />
            </div>

            {/* Navigation Button Controls */}
            <div className="flex gap-2.5 sm:gap-3">
              <button
                disabled={totalSlides <= 1}
                onClick={() => {
                  handlePrev();
                  setIsHovered(true); // temporary pause autoplay on tap
                  setTimeout(() => setIsHovered(false), 3000);
                }}
                aria-label="Kegiatan Sebelumnya"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-white/10 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center text-[#eae1d8] hover:bg-white/5 hover:border-[#f6c374] hover:text-[#f6c374] active:scale-95 transition-all duration-300 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                disabled={totalSlides <= 1}
                onClick={() => {
                  handleNext();
                  setIsHovered(true); // temporary pause autoplay on tap
                  setTimeout(() => setIsHovered(false), 3000);
                }}
                aria-label="Kegiatan Berikutnya"
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-white/10 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center text-[#eae1d8] hover:bg-white/5 hover:border-[#f6c374] hover:text-[#f6c374] active:scale-95 transition-all duration-300 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

