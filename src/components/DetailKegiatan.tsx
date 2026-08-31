import { useState, useRef, useEffect } from "react";
import { Activity, Photo } from "../types.js";
import { motion } from "motion/react";
import { Calendar, Tag, Share2, Copy, Send, ArrowLeft, ArrowRight, Play, Eye, FolderOpen, Camera } from "lucide-react";

interface DetailKegiatanProps {
  activity: Activity;
  photos: Photo[];
  allActivities: Activity[];
  onBack: () => void;
  onNavigateActivity: (slug: string) => void;
  onOpenLightbox: (photos: Photo[], index: number) => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function DetailKegiatan({
  activity,
  photos,
  allActivities,
  onBack,
  onNavigateActivity,
  onOpenLightbox,
  onShowToast
}: DetailKegiatanProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sorted photos by sort_order
  const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  // Find next/prev activity
  const publishedActs = allActivities.filter((act) => act.status === "published");
  const currentIndex = publishedActs.findIndex((act) => act.id === activity.id);
  const prevActivity = currentIndex > 0 ? publishedActs[currentIndex - 1] : null;
  const nextActivity = currentIndex < publishedActs.length - 1 ? publishedActs[currentIndex + 1] : null;

  useEffect(() => {
    // Reset video load state on activity change
    setVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Safe play
      });
    }
  }, [activity]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#kegiatan/${activity.slug}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        onShowToast("Tautan berhasil disalin ke papan klip.", "success");
        setShowShareDropdown(false);
      })
      .catch(() => {
        onShowToast("Gagal menyalin tautan.", "error");
      });
  };

  const handleShareWhatsApp = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#kegiatan/${activity.slug}`;
    const text = encodeURIComponent(`Lihat Dokumentasi Kegiatan "${activity.title}" di GALERI EMKA:\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
    setShowShareDropdown(false);
  };

  return (
    <div className="bg-[#17130e] text-[#eae1d8] min-h-screen">
      
      {/* Hero Header Section */}
      <header className="relative w-full h-[90vh] md:h-screen flex items-end pb-12 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Sync Background video/image with fallback */}
        <div className="absolute inset-0 z-0">
          <img
            src={activity.cover_image || undefined}
            alt={activity.title}
            className="w-full h-full object-cover opacity-60 filter brightness-50"
            referrerPolicy="no-referrer"
            onError={(e) => {
              console.error("Image failed to load in DetailKegiatan.tsx");
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
            }}
          />

          {activity.background_video && (
            <video
              ref={videoRef}
              src={activity.background_video || undefined}
              poster={activity.cover_image || undefined}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={(e) => {
                const start = activity.background_video_start || 0;
                if (start > 0) {
                  e.currentTarget.currentTime = start;
                }
              }}
              onTimeUpdate={(e) => {
                const start = activity.background_video_start || 0;
                const end = activity.background_video_end;
                const loop = activity.background_video_loop !== false;
                
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
                 const start = activity.background_video_start || 0;
                 const loop = activity.background_video_loop !== false;
                 if (loop) {
                    e.currentTarget.currentTime = start;
                    e.currentTarget.play().catch(() => {});
                 }
              }}
              onPlay={() => setVideoLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover filter brightness-[0.45] transition-opacity duration-1000 ${
                videoLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Cinematic dark smooth gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#17130e] via-[#17130e]/40 to-transparent" />
        </div>

        {/* Back and action buttons floating at top left */}
        <div className="absolute top-24 left-4 sm:left-8 z-30">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-[#110e09]/80 backdrop-blur-md border border-[#4f4538]/30 px-4 py-2 text-xs tracking-widest font-subheading uppercase text-[#eae1d8] hover:text-[#f6c374] hover:border-[#f6c374] transition-all rounded-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        </div>

        {/* Hero Card Text Overlay */}
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel p-6 sm:p-12 rounded-sm max-w-4xl space-y-6 shadow-2xl relative"
          >
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-subheading tracking-widest uppercase text-[#f6c374]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(activity.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
              <span className="w-1.5 h-1.5 bg-[#4f4538] rounded-full" />
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {activity.category}
              </span>
              <span className="w-1.5 h-1.5 bg-[#4f4538] rounded-full" />
              <span>{photos.length} Foto</span>
            </div>

            {/* Title & Desc */}
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#eae1d8] leading-[1.1] tracking-tight">
              {activity.title}
            </h1>
            <p className="font-body text-sm sm:text-base text-[#d3c4b3] leading-relaxed max-w-3xl">
              {activity.description}
            </p>

            {/* Actions: Ambil Foto Di Sini */}
            <div className="pt-4 flex flex-wrap gap-4 items-center relative">
              {activity.google_drive_url && (
                <a
                  href={activity.google_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#d8a85c] hover:bg-[#eae1d8] hover:scale-[1.02] active:scale-95 text-[#110e09] font-subheading text-[11px] sm:text-xs tracking-widest uppercase py-3.5 px-6 sm:px-8 rounded-sm font-bold transition-all duration-[350ms] flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110 hover:shadow-2xl select-none"
                  style={{ minHeight: "44px" }}
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">AMBIL FOTO DISINI</span>
                  <span className="inline sm:hidden">AMBIL FOTO</span>
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Grid of Photos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-12">
        <div className="space-y-2 border-b border-[#4f4538]/20 pb-4">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#eae1d8]">
            Seluruh Foto Kegiatan
          </h2>
          <p className="font-body text-xs sm:text-sm text-[#9b8f7f]">
            Klik pada gambar untuk membuka visual lightbox layar penuh.
          </p>
        </div>

        {/* Photos Grid */}
        {sortedPhotos.length === 0 && !activity.cover_image ? (
          <div className="text-center py-24 text-[#d3c4b3] font-body text-sm bg-[#110e09] border border-[#4f4538]/10 rounded-sm">
            Belum ada foto ditambahkan untuk kegiatan ini.
          </div>
        ) : (
          <div className="masonry-grid">
            {(sortedPhotos.length > 0
              ? sortedPhotos
              : [
                  {
                    id: `cover-${activity.id}`,
                    activity_id: activity.id,
                    title: activity.title,
                    image_url: activity.cover_image,
                    sort_order: 0,
                    created_at: activity.created_at || new Date().toISOString(),
                    updated_at: activity.updated_at || new Date().toISOString(),
                  },
                ]
            ).map((photo, index, arr) => (
              <div
                key={photo.id}
                onClick={() => onOpenLightbox(arr, index)}
                className="masonry-item group relative overflow-hidden rounded-sm cursor-pointer border border-[#4f4538]/10 hover:border-[#f6c374]/30 transition-cinematic bg-[#110e09]"
              >
                <img
                  src={photo.image_url || undefined}
                  alt={photo.title || activity.title}
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
            onError={(e) => {
              console.error("Image failed to load in DetailKegiatan.tsx");
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
            }}
          />
                <div className="absolute inset-0 bg-gradient-to-t from-[#110e09]/95 via-[#110e09]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                  <p className="font-subheading text-[14px] text-[#eae1d8] transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 font-semibold leading-snug">
                    {photo.title || activity.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
