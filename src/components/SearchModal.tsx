import { useState, useMemo, useEffect, useRef } from "react";
import { Activity, Photo } from "../types.js";
import { resolveImageUrl } from "../lib/storage.js";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Calendar, Tag, Image as ImageIcon, Grid, ArrowRight, Eye } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  photos: Photo[];
  onViewActivity: (slug: string) => void;
  onOpenLightbox: (photos: Photo[], index: number) => void;
}

export default function SearchModal({
  isOpen,
  onClose,
  activities,
  photos,
  onViewActivity,
  onOpenLightbox,
}: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("Semua");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [activeTab, setActiveTab] = useState<"semua" | "kegiatan" | "foto">("semua");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setSearchTerm("");
      setSelectedYear("Semua");
      setSelectedCategory("Semua");
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Activity (Category) lookup map
  const activityMap = useMemo(() => {
    return new Map(activities.map((a) => [String(a.id), a]));
  }, [activities]);

  // Extract all available years dynamically from activities & photos
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();

    activities.forEach((act) => {
      if (act.date && act.date !== "0000-00-00") {
        const y = new Date(act.date).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y.toString());
      }
      if (act.created_at) {
        const y = new Date(act.created_at).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y.toString());
      }
    });

    photos.forEach((p) => {
      if (p.created_at) {
        const y = new Date(p.created_at).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y.toString());
      }
      if ((p as any).event_date && (p as any).event_date !== "0000-00-00") {
        const y = new Date((p as any).event_date).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y.toString());
      }
    });

    const sorted = Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
    return ["Semua", ...sorted];
  }, [activities, photos]);

  // Extract all available categories dynamically
  const availableCategories = useMemo(() => {
    const catSet = new Set<string>();
    activities.forEach((a) => {
      const catName = a.category || a.title;
      if (catName && catName.trim()) catSet.add(catName.trim());
    });
    return ["Semua", ...Array.from(catSet)];
  }, [activities]);

  // Helper to extract year from date string
  const getYearFromDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? "" : d.getFullYear().toString();
  };

  // Filter Activities based on search term, year, and category
  const filteredActivities = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return activities.filter((act) => {
      // Year filter
      if (selectedYear !== "Semua") {
        const actYear = getYearFromDate(act.date) || getYearFromDate(act.created_at);
        if (actYear !== selectedYear) return false;
      }

      // Category filter
      if (selectedCategory !== "Semua" && act.category !== selectedCategory) {
        return false;
      }

      // Search term matching (title, description, category, year, slug)
      if (!query) return true;

      const titleMatch = act.title.toLowerCase().includes(query);
      const descMatch = act.description.toLowerCase().includes(query);
      const catMatch = act.category.toLowerCase().includes(query);
      const yearMatch = (getYearFromDate(act.date) || "").includes(query);

      return titleMatch || descMatch || catMatch || yearMatch;
    });
  }, [activities, searchTerm, selectedYear, selectedCategory]);

  // Filter Photos based on search term, year, and category
  const filteredPhotos = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return photos.filter((photo) => {
      const parentAct = activityMap.get(String(photo.category_id));
      
      const actYear = parentAct ? getYearFromDate(parentAct.date) : "";
      const photoYear = getYearFromDate(photo.created_at) || getYearFromDate((photo as any).event_date) || actYear;

      // Year filter
      if (selectedYear !== "Semua" && photoYear !== selectedYear) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "Semua") {
        if (!parentAct || parentAct.category !== selectedCategory) return false;
      }

      // Search term matching (photo title, parent activity title, category, description, year)
      if (!query) return true;

      const titleMatch = (photo.title || "").toLowerCase().includes(query);
      const actTitleMatch = parentAct ? parentAct.title.toLowerCase().includes(query) : false;
      const actCatMatch = parentAct ? parentAct.category.toLowerCase().includes(query) : false;
      const yearMatch = photoYear.includes(query);

      return titleMatch || actTitleMatch || actCatMatch || yearMatch;
    });
  }, [photos, activityMap, searchTerm, selectedYear, selectedCategory]);
  const totalResults = filteredActivities.length + filteredPhotos.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-10 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl bg-[#17130e] border border-[#4f4538]/30 rounded-lg shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 my-8 flex flex-col max-h-[88vh]"
        >
          {/* Header & Search Bar */}
          <div className="p-4 sm:p-6 border-b border-[#4f4538]/20 bg-[#110e09]/90 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#f6c374]" />
                <span className="font-display text-lg sm:text-xl font-bold tracking-wide text-[#eae1d8]">
                  Pencarian Dokumentasi & Foto
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[#9b8f7f] hover:text-[#eae1d8] hover:bg-[#4f4538]/20 transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Big Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik kata kunci: judul, kegiatan, kategori, deskripsi, tahun (contoh: 2025, MPLS, Upacara)..."
                className="w-full bg-[#17130e] border border-[#4f4538]/40 rounded-sm py-3.5 pl-4 pr-12 font-body text-sm sm:text-base text-[#eae1d8] placeholder-[#9b8f7f] focus:outline-none focus:border-[#f6c374] transition-colors shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b8f7f] hover:text-[#eae1d8] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Rows */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 items-start sm:items-center justify-between text-xs">
              {/* Year pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
                <span className="text-[#9b8f7f] uppercase font-subheading tracking-wider mr-1 text-[11px] shrink-0">
                  Tahun:
                </span>
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`font-subheading text-[11px] px-2.5 py-1 rounded-sm uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                      selectedYear === year
                        ? "bg-[#f6c374] text-[#110e09] font-bold"
                        : "bg-[#110e09] text-[#d3c4b3] border border-[#4f4538]/30 hover:border-[#f6c374]/50"
                    }`}
                  >
                    {year === "Semua" ? "Semua Tahun" : year}
                  </button>
                ))}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
                <span className="text-[#9b8f7f] uppercase font-subheading tracking-wider mr-1 text-[11px] shrink-0">
                  Kategori:
                </span>
                {availableCategories.slice(0, 5).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`font-subheading text-[11px] px-2.5 py-1 rounded-sm uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? "bg-[#f6c374] text-[#110e09] font-bold"
                        : "bg-[#110e09] text-[#d3c4b3] border border-[#4f4538]/30 hover:border-[#f6c374]/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count & Tab Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#4f4538]/15">
              <span className="font-subheading text-[11px] tracking-widest uppercase text-[#f6c374]">
                Menampilkan {totalResults} dokumentasi ditemukan
              </span>

              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setActiveTab("semua")}
                  className={`px-3 py-1 font-subheading uppercase text-[11px] tracking-wider rounded-sm transition-colors ${
                    activeTab === "semua"
                      ? "bg-[#f6c374]/20 text-[#f6c374] border border-[#f6c374]/40"
                      : "text-[#9b8f7f] hover:text-[#eae1d8]"
                  }`}
                >
                  Semua ({totalResults})
                </button>
                <button
                  onClick={() => setActiveTab("kegiatan")}
                  className={`px-3 py-1 font-subheading uppercase text-[11px] tracking-wider rounded-sm transition-colors ${
                    activeTab === "kegiatan"
                      ? "bg-[#f6c374]/20 text-[#f6c374] border border-[#f6c374]/40"
                      : "text-[#9b8f7f] hover:text-[#eae1d8]"
                  }`}
                >
                  Kegiatan ({filteredActivities.length})
                </button>
                <button
                  onClick={() => setActiveTab("foto")}
                  className={`px-3 py-1 font-subheading uppercase text-[11px] tracking-wider rounded-sm transition-colors ${
                    activeTab === "foto"
                      ? "bg-[#f6c374]/20 text-[#f6c374] border border-[#f6c374]/40"
                      : "text-[#9b8f7f] hover:text-[#eae1d8]"
                  }`}
                >
                  Foto ({filteredPhotos.length})
                </button>
              </div>
            </div>
          </div>

          {/* Results Scrollable Area */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-8">
            {totalResults === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Search className="w-12 h-12 text-[#9b8f7f]/30 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                    Dokumentasi tidak ditemukan
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-[#9b8f7f] max-w-sm mx-auto">
                    Coba gunakan kata kunci atau tahun yang berbeda.
                  </p>
                </div>
                {(searchTerm || selectedYear !== "Semua" || selectedCategory !== "Semua") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedYear("Semua");
                      setSelectedCategory("Semua");
                    }}
                    className="mt-2 bg-[#110e09] border border-[#f6c374]/30 text-[#f6c374] hover:bg-[#f6c374] hover:text-[#110e09] font-subheading text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm transition-all"
                  >
                    Reset Filter Pencarian
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1. Activities Section */}
                {(activeTab === "semua" || activeTab === "kegiatan") && filteredActivities.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#4f4538]/20 pb-2">
                      <Grid className="w-4 h-4 text-[#f6c374]" />
                      <h3 className="font-subheading text-xs font-bold tracking-widest text-[#eae1d8] uppercase">
                        Arsip Kegiatan ({filteredActivities.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredActivities.map((act) => (
                        <div
                          key={act.id}
                          onClick={() => {
                            onClose();
                            onViewActivity(act.slug);
                          }}
                          className="group bg-[#110e09] border border-[#4f4538]/20 rounded-sm overflow-hidden cursor-pointer hover:border-[#f6c374]/50 transition-all p-3 flex gap-3 items-center"
                        >
                          <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden relative bg-black">
                            <img
                              src={resolveImageUrl(act.cover_image)}
                              alt={act.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found") {
                console.error("Cover image failed to load in SearchModal:", act.cover_image);
                target.src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
              }
            }}
          />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="text-[9px] font-subheading tracking-wider uppercase text-[#f6c374] block truncate">
                              {act.category} • {getYearFromDate(act.date) || getYearFromDate(act.created_at)}
                            </span>
                            <h4 className="font-display text-sm font-bold text-[#eae1d8] group-hover:text-[#f6c374] transition-colors truncate">
                              {act.title}
                            </h4>
                            <p className="font-body text-[11px] text-[#9b8f7f] line-clamp-1">
                              {act.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#9b8f7f] group-hover:text-[#f6c374] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Photos Section */}
                {(activeTab === "semua" || activeTab === "foto") && filteredPhotos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#4f4538]/20 pb-2">
                      <ImageIcon className="w-4 h-4 text-[#f6c374]" />
                      <h3 className="font-subheading text-xs font-bold tracking-widest text-[#eae1d8] uppercase">
                        Foto & Momen ({filteredPhotos.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredPhotos.map((photo, pIdx) => {
                        const parent = activityMap.get(photo.activity_id);
                        return (
                          <div
                            key={photo.id}
                            onClick={() => {
                              onClose();
                              onOpenLightbox(filteredPhotos, pIdx);
                            }}
                            className="group relative aspect-square rounded-sm overflow-hidden border border-[#4f4538]/20 bg-[#110e09] cursor-pointer hover:border-[#f6c374]/50 transition-all"
                          >
                            <img
                              src={resolveImageUrl(photo.image_url)}
                              alt={photo.title || ""}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found") {
                console.error("Photo image failed to load in SearchModal:", photo.image_url);
                target.src = "https://placehold.co/600x400/110e09/4f4538?text=Image+Not+Found";
              }
            }}
          />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                              <span className="font-display text-xs text-[#eae1d8] font-bold line-clamp-1">
                                {photo.title || parent?.title || "Foto Dokumentasi"}
                              </span>
                              <span className="font-subheading text-[9px] text-[#f6c374] tracking-wider uppercase">
                                {parent ? parent.category : "Momen"} • {getYearFromDate(photo.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
