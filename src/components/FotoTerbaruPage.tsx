import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, Eye, Tag, Calendar, Search, ExternalLink } from "lucide-react";

interface FotoTerbaruPageProps {
  activities: Activity[];
  photos: Photo[];
  onViewActivity: (slug: string) => void;
  onOpenLightbox: (photos: Photo[], index: number) => void;
}

export default function FotoTerbaruPage({
  activities,
  photos,
  onViewActivity,
  onOpenLightbox
}: FotoTerbaruPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map activities by ID for instant O(1) lookups
  const activityMap = useMemo(() => {
    return new Map(activities.map(act => [act.id, act]));
  }, [activities]);

  // Extract unique categories of published activities
  const categories = useMemo(() => {
    const list = new Set(
      activities
        .filter(act => act.status === "published")
        .map(act => act.category)
    );
    return ["Semua", ...Array.from(list)];
  }, [activities]);

  // Filter photos dynamically based on search, category, and whether parent activity is published
  const filteredPhotos = useMemo(() => {
    const validPhotos = photos.filter((photo) => {
      const act = activityMap.get(photo.activity_id);
      if (!act || act.status !== "published") return false;

      const matchesCategory = selectedCategory === "Semua" || act.category === selectedCategory;
      const matchesSearch = photo.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            act.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });

    // Sort by created_at descending (newest first)
    return validPhotos.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [photos, activityMap, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#17130e] text-[#eae1d8] min-h-screen py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="space-y-4 max-w-3xl">
          <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
            Mosaik Sekolah
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#eae1d8] tracking-tight">
            Momen & Foto Terbaru
          </h1>
          <p className="font-body text-base sm:text-lg text-[#d3c4b3] leading-relaxed">
            Sorotan potret dan fragmen kebersamaan beresolusi tinggi yang menceritakan dinamika kehidupan, khidmat, dan kegembiraan di SMK Multi Karya.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 border-b border-[#4f4538]/20 pb-6">
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-subheading text-[11px] tracking-wider uppercase px-4 py-2 border transition-all duration-300 rounded-sm cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "border-[#f6c374] bg-[#f6c374]/10 text-[#f6c374] font-semibold"
                    : "border-[#4f4538]/20 hover:border-[#9b8f7f] text-[#d3c4b3]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari foto atau kegiatan..."
              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2 px-10 font-body text-xs text-[#eae1d8] placeholder-[#9b8f7f] focus:outline-none focus:border-[#f6c374] transition-colors"
            />
          </div>
        </div>

        {/* CSS Columns Masonry Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                <ImageIcon className="w-12 h-12 text-[#f6c374]/40" />
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-[#f6c374]">
                    BELUM ADA FOTO TERBARU
                  </h3>
                  <p className="font-body text-xs text-[#9b8f7f] max-w-md mx-auto">
                    Arsip foto kosong untuk kriteria filter saat ini, atau belum dikaitkan dengan kegiatan yang dipublikasikan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 [column-fill:_balance] space-y-6">
                {filteredPhotos.map((photo, pIdx) => {
                  const parentActivity = activityMap.get(photo.activity_id);
                  return (
                    <div
                      key={photo.id}
                      className="break-inside-avoid relative group overflow-hidden bg-[#110e09] border border-[#4f4538]/15 hover:border-[#f6c374]/35 rounded-sm shadow-xl transition-all duration-500 flex flex-col"
                    >
                      {/* Interactive Image Frame */}
                      <div 
                        onClick={() => onOpenLightbox(filteredPhotos, pIdx)}
                        className="cursor-zoom-in overflow-hidden relative"
                      >
                        <img
                          src={photo.image_url}
                          alt={photo.title}
                          className="w-full object-cover group-hover:scale-[1.03] transition-cinematic duration-700"
                          referrerPolicy="no-referrer"
                        />
                        {/* Shimmer Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 space-y-3" />
                      </div>

                      {/* Info Panel under image */}
                      <div className="p-4 bg-[#110e09]/90 border-t border-[#4f4538]/10 space-y-3">
                        <div className="space-y-1">
                          <h4 className="font-display text-xs font-bold text-[#eae1d8] line-clamp-1">
                            {photo.title || "Momen Sekolah"}
                          </h4>
                          {parentActivity && (
                            <p className="font-body text-[10px] text-[#f6c374] uppercase tracking-wider line-clamp-1">
                              {parentActivity.title}
                            </p>
                          )}
                        </div>

                        {parentActivity && (
                          <button
                            onClick={() => onViewActivity(parentActivity.slug)}
                            className="w-full py-2 px-3 border border-[#4f4538]/30 hover:border-[#f6c374] text-[9px] tracking-widest uppercase font-subheading text-[#eae1d8] hover:text-[#f6c374] hover:bg-[#f6c374]/5 rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" /> LIHAT KEGIATAN
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
