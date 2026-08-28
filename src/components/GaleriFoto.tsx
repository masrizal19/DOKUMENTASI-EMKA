import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Tag, Image as ImageIcon, Eye, Grid, Search, X, Filter, RotateCcw } from "lucide-react";

interface GaleriFotoProps {
  activities: Activity[];
  photos: Photo[];
  onViewActivity: (slug: string) => void;
  onOpenLightbox: (photos: Photo[], index: number) => void;
  defaultSubTab?: "kegiatan" | "foto-terbaru";
}

export default function GaleriFoto({
  activities,
  photos,
  onViewActivity,
  onOpenLightbox,
  defaultSubTab = "kegiatan",
}: GaleriFotoProps) {
  const [subTab, setSubTab] = useState<"kegiatan" | "foto-terbaru">(defaultSubTab);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedYear, setSelectedYear] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Helper to extract 4-digit year string from date
  const getYear = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? "" : d.getFullYear().toString();
  };

  // Get list of unique categories dynamically from activities
  const categories = useMemo(() => {
    const list = new Set(
      activities
        .filter((act) => act.status === "published")
        .map((act) => act.category)
        .filter(Boolean)
    );
    return ["Semua", ...Array.from(list)];
  }, [activities]);

  // Extract list of unique years dynamically from Supabase activities & photos
  const years = useMemo(() => {
    const yearsSet = new Set<string>();

    activities.forEach((act) => {
      const y1 = getYear(act.date);
      if (y1 && parseInt(y1) > 2000 && parseInt(y1) < 2100) yearsSet.add(y1);
      const y2 = getYear(act.created_at);
      if (y2 && parseInt(y2) > 2000 && parseInt(y2) < 2100) yearsSet.add(y2);
    });

    photos.forEach((photo) => {
      const y = getYear(photo.created_at);
      if (y && parseInt(y) > 2000 && parseInt(y) < 2100) yearsSet.add(y);
    });

    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    return ["Semua", ...sorted];
  }, [activities, photos]);

  // Map activities by ID for instant O(1) lookups
  const actMap = useMemo(() => {
    return new Map(activities.map((act) => [act.id, act]));
  }, [activities]);

  // Filter activities dynamically based on Category + Year + Search Query
  const filteredActivities = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return activities.filter((act) => {
      if (act.status !== "published") return false;

      // Category filter
      if (selectedCategory !== "Semua" && act.category !== selectedCategory) {
        return false;
      }

      // Year filter
      if (selectedYear !== "Semua") {
        const actYear = getYear(act.date) || getYear(act.created_at);
        if (actYear !== selectedYear) return false;
      }

      // Search Query filter
      if (query) {
        const titleMatch = (act.title || "").toLowerCase().includes(query);
        const descMatch = (act.description || "").toLowerCase().includes(query);
        const catMatch = (act.category || "").toLowerCase().includes(query);
        const yearMatch = (getYear(act.date) || "").includes(query);
        if (!titleMatch && !descMatch && !catMatch && !yearMatch) return false;
      }

      return true;
    });
  }, [activities, selectedCategory, selectedYear, searchQuery]);

  // Filter photos dynamically based on Category + Year + Search Query
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

    const validPhotos = photoPool
      .filter((photo) => {
        const act = actMap.get(photo.activity_id);
        if (!act || act.status !== "published") return false;

        const photoYear = getYear(photo.created_at) || getYear(act.date);

        // Category filter
        if (selectedCategory !== "Semua" && act.category !== selectedCategory) {
          return false;
        }

        // Year filter
        if (selectedYear !== "Semua" && photoYear !== selectedYear) {
          return false;
        }

        // Search Query filter
        if (query) {
          const titleMatch = (photo.title || "").toLowerCase().includes(query);
          const actTitleMatch = (act.title || "").toLowerCase().includes(query);
          const actCatMatch = (act.category || "").toLowerCase().includes(query);
          const actDescMatch = (act.description || "").toLowerCase().includes(query);
          const yearMatch = photoYear.includes(query);
          if (!titleMatch && !actTitleMatch && !actCatMatch && !actDescMatch && !yearMatch) {
            return false;
          }
        }

        return true;
      })
      .map((photo) => {
        const act = actMap.get(photo.activity_id);
        const isCover = photo.is_cover || (act ? act.cover_image === photo.image_url : false);
        return {
          ...photo,
          is_cover: isCover,
          activity: act,
        };
      });

    // Prioritize best/cover/featured photos, then sort by date desc
    return validPhotos.sort((a, b) => {
      // If one is cover and the other is not, cover comes first within same activity or globally
      const aScore = (a.is_cover ? 10 : 0) + (a.is_featured ? 5 : 0);
      const bScore = (b.is_cover ? 10 : 0) + (b.is_featured ? 5 : 0);
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [photos, activities, actMap, selectedCategory, selectedYear, searchQuery]);

  const currentCount = subTab === "kegiatan" ? filteredActivities.length : filteredPhotos.length;
  const isFiltered = searchQuery !== "" || selectedYear !== "Semua" || selectedCategory !== "Semua";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedYear("Semua");
    setSelectedCategory("Semua");
  };

  return (
    <div id="gallery-header" className="bg-[#17130e] text-[#eae1d8] py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <div className="space-y-4 max-w-3xl">
        <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
          Arsip Visual Sekolah
        </span>
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#f6c374] tracking-tight">
          Arsip Galeri EMKA
        </h1>
        <p className="font-body text-base sm:text-lg text-[#d3c4b3] leading-relaxed">
          Arsip kenangan sekolah yang diabadikan dengan keanggunan sinematik. Temukan momen-momen terbaru dan kegiatan bersejarah yang menceritakan kisah perjalanan kita.
        </p>
      </div>

      {/* Control Panel: Sub-tabs, Search Bar, Year Filter, Category Filter */}
      <div className="space-y-6 bg-[#110e09] border border-[#4f4538]/20 rounded-md p-4 sm:p-6 shadow-xl">
        {/* Row 1: Sub-tabs & Search Input */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Sub-Tabs Selector */}
          <div className="flex gap-2 p-1 bg-[#17130e] border border-[#4f4538]/30 rounded-sm self-start md:self-auto">
            <button
              onClick={() => setSubTab("kegiatan")}
              className={`flex items-center gap-2 font-subheading text-xs tracking-widest uppercase px-4 py-2.5 transition-all duration-300 rounded-sm cursor-pointer ${
                subTab === "kegiatan"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:text-[#eae1d8]"
              }`}
            >
              <Grid className="w-4 h-4" /> Kegiatan ({filteredActivities.length})
            </button>
            <button
              onClick={() => setSubTab("foto-terbaru")}
              className={`flex items-center gap-2 font-subheading text-xs tracking-widest uppercase px-4 py-2.5 transition-all duration-300 rounded-sm cursor-pointer ${
                subTab === "foto-terbaru"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:text-[#eae1d8]"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Foto Terbaru ({filteredPhotos.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari foto, kegiatan, atau tahun..."
              className="w-full bg-[#17130e] border border-[#4f4538]/40 rounded-sm py-2.5 pl-10 pr-10 font-body text-xs sm:text-sm text-[#eae1d8] placeholder-[#9b8f7f] focus:outline-none focus:border-[#f6c374] transition-colors"
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
        </div>

        {/* Row 2: Filter Pills (Year + Category) */}
        <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t border-[#4f4538]/15 justify-between items-start lg:items-center">
          
          {/* Year Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-subheading text-[11px] uppercase tracking-widest text-[#9b8f7f] mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#f6c374]" /> Tahun:
            </span>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`font-subheading text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-all duration-300 rounded-sm cursor-pointer ${
                  selectedYear === year
                    ? "border-[#f6c374] bg-[#f6c374] text-[#110e09] font-bold shadow-sm"
                    : "border-[#4f4538]/30 hover:border-[#9b8f7f] bg-[#17130e] text-[#d3c4b3]"
                }`}
              >
                {year === "Semua" ? "Semua Tahun" : year}
              </button>
            ))}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-subheading text-[11px] uppercase tracking-widest text-[#9b8f7f] mr-1 flex items-center gap-1 shrink-0">
              <Tag className="w-3.5 h-3.5 text-[#f6c374]" /> Kategori:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-subheading text-[11px] tracking-wider uppercase px-3 py-1.5 border transition-all duration-300 rounded-sm cursor-pointer ${
                  selectedCategory === cat
                    ? "border-[#f6c374] bg-[#f6c374]/15 text-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 hover:border-[#9b8f7f] bg-[#17130e] text-[#d3c4b3]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results Banner Info */}
        <div className="flex items-center justify-between pt-3 border-t border-[#4f4538]/15 text-xs text-[#9b8f7f]">
          <span className="font-subheading text-[12px] tracking-widest uppercase text-[#f6c374] font-semibold">
            Menampilkan {currentCount} dokumentasi
            {selectedYear !== "Semua" && ` (Tahun ${selectedYear})`}
            {selectedCategory !== "Semua" && ` (Kategori: ${selectedCategory})`}
            {searchQuery && ` (Pencarian: "${searchQuery}")`}
          </span>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-[11px] font-subheading uppercase tracking-wider text-[#d3c4b3] hover:text-[#f6c374] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <AnimatePresence mode="wait">
        {subTab === "kegiatan" ? (
          <motion.div
            key={`kegiatan-${selectedCategory}-${selectedYear}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredActivities.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-[#110e09] border border-[#4f4538]/20 rounded-md p-8">
                <Search className="w-12 h-12 text-[#9b8f7f]/30 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                    Dokumentasi tidak ditemukan
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-[#9b8f7f] max-w-sm mx-auto">
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
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onViewActivity(act.slug)}
                  className="group relative bg-[#110e09] border border-[#4f4538]/15 rounded-sm overflow-hidden cursor-pointer hover:border-[#f6c374]/40 transition-cinematic shadow-lg flex flex-col"
                >
                  {/* Card Aspect Ratio Box */}
                  <div className="aspect-[4/3] w-full overflow-hidden relative">
                    <img
                      src={act.cover_image}
                      alt={act.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-cinematic duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#110e09] via-[#110e09]/10 to-transparent opacity-60" />

                    {/* Category Overlay */}
                    <span className="absolute top-4 left-4 bg-[#110e09]/80 backdrop-blur-md border border-[#4f4538]/30 font-subheading text-[10px] tracking-widest text-[#f6c374] px-3 py-1.5 rounded-sm uppercase">
                      {act.category}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[#9b8f7f] font-subheading tracking-wider uppercase">
                        <Calendar className="w-3.5 h-3.5 text-[#f6c374]" />
                        {new Date(act.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#eae1d8] group-hover:text-[#f6c374] transition-colors leading-tight">
                        {act.title}
                      </h3>
                      <p className="font-body text-xs text-[#d3c4b3] line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>
                    </div>

                    <button className="border border-[#4f4538]/30 text-[#eae1d8] group-hover:bg-[#f6c374] group-hover:text-[#110e09] group-hover:border-[#f6c374] font-subheading text-[10px] tracking-widest uppercase py-2.5 w-full text-center rounded-sm transition-all duration-500">
                      Lihat Dokumentasi
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`foto-${selectedCategory}-${selectedYear}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="masonry-grid"
          >
            {filteredPhotos.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 bg-[#110e09] border border-[#4f4538]/20 rounded-md p-8 w-full">
                <Search className="w-12 h-12 text-[#9b8f7f]/30 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                    Dokumentasi tidak ditemukan
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-[#9b8f7f] max-w-sm mx-auto">
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
              filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => onOpenLightbox(filteredPhotos, index)}
                  className="masonry-item group relative overflow-hidden rounded-sm cursor-pointer border border-[#4f4538]/10 hover:border-[#f6c374]/30 transition-cinematic bg-[#110e09]"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || ""}
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Floating Caption on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#110e09]/95 via-[#110e09]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 space-y-2">
                      <span className="font-subheading text-[10px] tracking-widest text-[#f6c374] uppercase block">
                        {photo.activity?.title || "Kegiatan"} • {getYear(photo.created_at)}
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                        {photo.title || "Tanpa Judul"}
                      </h3>
                      <button className="border border-[#4f4538]/40 hover:bg-[#eae1d8] hover:text-[#110e09] font-subheading text-[10px] tracking-widest uppercase py-2 px-4 rounded-sm transition-colors duration-300">
                        Buka Lightbox
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
