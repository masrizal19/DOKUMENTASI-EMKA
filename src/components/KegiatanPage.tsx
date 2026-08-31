import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Tag, Image as ImageIcon, ArrowRight, Grid, Search, X, RotateCcw } from "lucide-react";

interface KegiatanPageProps {
  activities: Activity[];
  photos: Photo[];
  onViewActivity: (slug: string) => void;
}

export default function KegiatanPage({ activities, photos, onViewActivity }: KegiatanPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedYear, setSelectedYear] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const getYear = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? "" : d.getFullYear().toString();
  };

  // Filter activities to only include published ones
  const publishedActivities = useMemo(() => {
    return activities.filter((act) => act.status === "published");
  }, [activities]);

  // Extract unique categories
  const categories = useMemo(() => {
    const list = new Set(publishedActivities.map((act) => act.category).filter(Boolean));
    return ["Semua", ...Array.from(list)];
  }, [publishedActivities]);

  // Extract unique years
  const years = useMemo(() => {
    const yearsSet = new Set<string>();
    publishedActivities.forEach((act) => {
      const y1 = getYear(act.date);
      if (y1 && parseInt(y1) > 2000 && parseInt(y1) < 2100) yearsSet.add(y1);
      const y2 = getYear(act.created_at);
      if (y2 && parseInt(y2) > 2000 && parseInt(y2) < 2100) yearsSet.add(y2);
    });
    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    return ["Semua", ...sorted];
  }, [publishedActivities]);

  // Filter & Search activities
  const filteredActivities = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return publishedActivities.filter((act) => {
      // Category check
      if (selectedCategory !== "Semua" && act.category !== selectedCategory) {
        return false;
      }

      // Year check
      if (selectedYear !== "Semua") {
        const actYear = getYear(act.date) || getYear(act.created_at);
        if (actYear !== selectedYear) return false;
      }

      // Search query check
      if (query) {
        const matchesSearch =
          act.title.toLowerCase().includes(query) ||
          act.description.toLowerCase().includes(query) ||
          act.category.toLowerCase().includes(query) ||
          getYear(act.date).includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [publishedActivities, selectedCategory, selectedYear, searchQuery]);

  const isFiltered = searchQuery !== "" || selectedYear !== "Semua" || selectedCategory !== "Semua";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedYear("Semua");
    setSelectedCategory("Semua");
  };

  return (
    <div className="bg-[#17130e] text-[#eae1d8] min-h-screen py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 max-w-3xl">
          <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
            Dokumentasi Sekolah
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#eae1d8] tracking-tight">
            Arsip Kegiatan Resmi
          </h1>
          <p className="font-body text-base sm:text-lg text-[#d3c4b3] leading-relaxed">
            Eksplorasi kronologis seluruh rangkaian kegiatan, upacara, perayaan, dan prestasi sekolah yang diabadikan secara profesional dan terarsip abadi.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#110e09] border border-[#4f4538]/20 rounded-md p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kegiatan atau tahun..."
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
                Menampilkan {filteredActivities.length} kegiatan
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

        {/* Kegiatan Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${selectedYear}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredActivities.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center space-y-4 bg-[#110e09] border border-[#4f4538]/20 rounded-md p-8">
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
              filteredActivities.map((act) => {
                const photoCount = photos.filter((p) => p.activity_id === act.id).length;

                return (
                  <div
                    key={act.id}
                    onClick={() => onViewActivity(act.slug)}
                    className="group bg-[#110e09]/70 border border-[#4f4538]/15 hover:border-[#f6c374]/35 rounded-sm overflow-hidden cursor-pointer transition-cinematic shadow-xl flex flex-col h-full"
                  >
                    {/* Cover Photo */}
                    <div className="aspect-[4/5] w-full overflow-hidden relative">
                      <img
                        src={act.cover_image || undefined}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-cinematic duration-700"
                        referrerPolicy="no-referrer"
            onError={(e) => {
              console.error("Image failed to load in KegiatanPage.tsx");
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
            }}
          />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#110e09] via-transparent to-transparent opacity-80" />
                      
                      {/* Floating Category Tag */}
                      <span className="absolute top-4 left-4 bg-[#110e09]/90 backdrop-blur-md border border-[#f6c374]/20 font-subheading text-[9px] tracking-widest text-[#f6c374] px-3 py-1.5 rounded-sm uppercase">
                        {act.category}
                      </span>

                      {/* Photo Count tag */}
                      {photoCount > 0 && (
                        <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-[#4f4538]/30 font-subheading text-[9px] tracking-wider text-[#eae1d8] px-2.5 py-1 rounded-sm flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#f6c374]" /> {photoCount} Foto
                        </span>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-[#9b8f7f] font-subheading tracking-wider uppercase">
                          <Calendar className="w-3.5 h-3.5 text-[#f6c374]" />
                          {new Date(act.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        
                        <h3 className="font-display text-xl font-bold text-[#eae1d8] group-hover:text-[#f6c374] transition-colors leading-snug">
                          {act.title}
                        </h3>

                        <p className="font-body text-xs text-[#d3c4b3] leading-relaxed line-clamp-3">
                          {act.description}
                        </p>
                      </div>

                      {/* View Action Trigger */}
                      <div className="pt-2 border-t border-[#4f4538]/10 flex items-center justify-between group/btn">
                        <span className="font-subheading text-[10px] tracking-widest uppercase text-[#f6c374] font-bold group-hover/btn:text-[#eae1d8] transition-colors flex items-center gap-1.5">
                          LIHAT KEGIATAN <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
