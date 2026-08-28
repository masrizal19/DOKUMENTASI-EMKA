import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, Eye, Tag, Calendar, Search, X, RotateCcw } from "lucide-react";

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
  onOpenLightbox,
}: FotoTerbaruPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedYear, setSelectedYear] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const getYear = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? "" : d.getFullYear().toString();
  };

  // Map activities by ID for instant O(1) lookups
  const activityMap = useMemo(() => {
    return new Map(activities.map((act) => [act.id, act]));
  }, [activities]);

  // Extract unique categories of published activities
  const categories = useMemo(() => {
    const list = new Set(
      activities
        .filter((act) => act.status === "published")
        .map((act) => act.category)
        .filter(Boolean)
    );
    return ["Semua", ...Array.from(list)];
  }, [activities]);

  // Extract unique years
  const years = useMemo(() => {
    const yearsSet = new Set<string>();

    photos.forEach((photo) => {
      const y = getYear(photo.created_at);
      if (y && parseInt(y) > 2000 && parseInt(y) < 2100) yearsSet.add(y);
    });

    activities.forEach((act) => {
      const y = getYear(act.date);
      if (y && parseInt(y) > 2000 && parseInt(y) < 2100) yearsSet.add(y);
    });

    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    return ["Semua", ...sorted];
  }, [photos, activities]);

  // Filter photos dynamically based on search, category, year, and whether parent activity is published
  const filteredPhotos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Pool all photo items from photos table
    const photoPool: Photo[] = [...photos];

    // Also ensure each published activity's cover_image is included if not already present
    const existingUrls = new Set(photos.map((p) => p.image_url));
    activities
      .filter((act) => act.status === "published" && act.cover_image)
      .forEach((act) => {
        if (!existingUrls.has(act.cover_image)) {
          photoPool.push({
            id: `act-cover-${act.id}`,
            activity_id: act.id,
            title: act.title,
            image_url: act.cover_image,
            sort_order: 0,
            is_cover: true,
            created_at: act.date || act.created_at || new Date().toISOString(),
            updated_at: act.updated_at || new Date().toISOString(),
          });
        }
      });

    const validPhotos = photoPool.filter((photo) => {
      const act = activityMap.get(photo.activity_id);
      if (!act || act.status !== "published") return false;

      const photoYear = getYear(photo.created_at) || getYear(act.date);

      // Category check
      if (selectedCategory !== "Semua" && act.category !== selectedCategory) {
        return false;
      }

      // Year check
      if (selectedYear !== "Semua" && photoYear !== selectedYear) {
        return false;
      }

      // Search query check
      if (query) {
        const titleMatch = (photo.title || "").toLowerCase().includes(query);
        const actMatch = (act.title || "").toLowerCase().includes(query);
        const catMatch = (act.category || "").toLowerCase().includes(query);
        const yearMatch = photoYear.includes(query);
        if (!titleMatch && !actMatch && !catMatch && !yearMatch) return false;
      }

      return true;
    }).map((photo) => {
      const act = activityMap.get(photo.activity_id);
      const isCover = photo.is_cover || (act ? act.cover_image === photo.image_url : false);
      return {
        ...photo,
        is_cover: isCover,
      };
    });

    // Prioritize best/cover photos, then sort by created_at descending (newest first)
    return validPhotos.sort((a, b) => {
      const aScore = (a.is_cover ? 10 : 0) + (a.is_featured ? 5 : 0);
      const bScore = (b.is_cover ? 10 : 0) + (b.is_featured ? 5 : 0);
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [photos, activities, activityMap, selectedCategory, selectedYear, searchQuery]);

  const isFiltered = searchQuery !== "" || selectedYear !== "Semua" || selectedCategory !== "Semua";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedYear("Semua");
    setSelectedCategory("Semua");
  };

  return (
    <div className="bg-[#17130e] text-[#eae1d8] min-h-screen py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
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
        <div className="bg-[#110e09] border border-[#4f4538]/20 rounded-md p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari foto, kegiatan, atau tahun..."
                className="w-full bg-[#17130e] border border-[#4f4538]/40 rounded-sm py-2 px-10 font-body text-xs sm:text-sm text-[#eae1d8] placeholder-[#9b8f7f] focus:outline-none focus:border-[#f6c374] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b8f7f] hover:text-[#eae1d8]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results count & reset */}
            <div className="flex items-center gap-4 self-end md:self-auto text-xs text-[#9b8f7f]">
              <span className="font-subheading text-[11px] uppercase tracking-wider text-[#f6c374]">
                Menampilkan {filteredPhotos.length} foto
              </span>
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] font-subheading uppercase text-[#d3c4b3] hover:text-[#f6c374]"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Year and Category Pills */}
          <div className="flex flex-col lg:flex-row gap-3 pt-3 border-t border-[#4f4538]/15 justify-between items-start lg:items-center">
            {/* Years */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-subheading text-[11px] uppercase tracking-widest text-[#9b8f7f] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#f6c374]" /> Tahun:
              </span>
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`font-subheading text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-all duration-300 rounded-sm cursor-pointer ${
                    selectedYear === year
                      ? "border-[#f6c374] bg-[#f6c374] text-[#110e09] font-bold"
                      : "border-[#4f4538]/30 hover:border-[#9b8f7f] bg-[#17130e] text-[#d3c4b3]"
                  }`}
                >
                  {year === "Semua" ? "Semua Tahun" : year}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-subheading text-[11px] uppercase tracking-widest text-[#9b8f7f] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#f6c374]" /> Kategori:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`font-subheading text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-all duration-300 rounded-sm cursor-pointer ${
                    selectedCategory === cat
                      ? "border-[#f6c374] bg-[#f6c374]/15 text-[#f6c374] font-semibold"
                      : "border-[#4f4538]/30 hover:border-[#9b8f7f] bg-[#17130e] text-[#d3c4b3]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CSS Columns Masonry Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${selectedYear}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
          >
            {filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-[#110e09] border border-[#4f4538]/20 rounded-md p-8">
                <Search className="w-12 h-12 text-[#9b8f7f]/30" />
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                    Dokumentasi tidak ditemukan
                  </h3>
                  <p className="font-body text-xs text-[#9b8f7f] max-w-sm mx-auto">
                    Coba gunakan kata kunci atau tahun yang berbeda.
                  </p>
                </div>
                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 bg-[#17130e] border border-[#f6c374]/30 text-[#f6c374] hover:bg-[#f6c374] hover:text-[#110e09] font-subheading text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm transition-all"
                  >
                    Reset Filter
                  </button>
                )}
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
                          alt={photo.title || ""}
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
                              {parentActivity.title} • {getYear(photo.created_at) || getYear(parentActivity.date)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#4f4538]/10">
                          {parentActivity && (
                            <button
                              onClick={() => onViewActivity(parentActivity.slug)}
                              className="text-[9px] font-subheading uppercase tracking-widest text-[#d3c4b3] hover:text-[#f6c374] transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-[#f6c374]" /> Buka Kegiatan
                            </button>
                          )}
                          <button
                            onClick={() => onOpenLightbox(filteredPhotos, pIdx)}
                            className="text-[9px] font-subheading uppercase tracking-widest text-[#9b8f7f] hover:text-[#eae1d8] transition-colors ml-auto"
                          >
                            Perbesar
                          </button>
                        </div>
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
