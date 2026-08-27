import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Tag, Image as ImageIcon, Eye, Grid } from "lucide-react";

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
  defaultSubTab = "kegiatan"
}: GaleriFotoProps) {
  const [subTab, setSubTab] = useState<"kegiatan" | "foto-terbaru">(defaultSubTab);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // Get list of unique categories
  const categories = useMemo(() => {
    const list = new Set(activities.map((act) => act.category));
    return ["Semua", ...Array.from(list)];
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (selectedCategory === "Semua") return activities;
    return activities.filter((act) => act.category === selectedCategory);
  }, [activities, selectedCategory]);

  // Filter photos, sorted by newest created_at date
  const sortedPhotos = useMemo(() => {
    const actMap = new Map(activities.map((act) => [act.id, act]));
    
    const validPhotos = photos
      .filter((photo) => {
        const act = actMap.get(photo.activity_id);
        if (!act) return false;
        if (selectedCategory === "Semua") return true;
        return act.category === selectedCategory;
      })
      .map((photo) => ({
        ...photo,
        activity: actMap.get(photo.activity_id)
      }));

    // Sort by created_at desc
    return validPhotos.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [photos, activities, selectedCategory]);

  return (
    <div id="gallery-header" className="bg-[#17130e] text-[#eae1d8] py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Page Header */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#f6c374] tracking-tight">
          Arsip Galeri EMKA
        </h1>
        <p className="font-body text-base sm:text-lg text-[#d3c4b3] leading-relaxed">
          Arsip kenangan sekolah yang diabadikan dengan keanggunan sinematik. Temukan momen-momen terbaru dan kegiatan bersejarah yang menceritakan kisah perjalanan kita.
        </p>
      </div>

      {/* Navigation Sub-Tabs & Category Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#4f4538]/20 pb-6">
        {/* Sub-Tabs Selector */}
        <div className="flex gap-2 p-1 bg-[#110e09] border border-[#4f4538]/20 rounded-sm">
          <button
            onClick={() => setSubTab("kegiatan")}
            className={`flex items-center gap-2 font-subheading text-xs tracking-widest uppercase px-4 py-2.5 transition-all duration-300 rounded-sm cursor-pointer ${
              subTab === "kegiatan"
                ? "bg-[#d8a85c] text-[#110e09] font-bold"
                : "text-[#d3c4b3] hover:text-[#eae1d8]"
            }`}
          >
            <Grid className="w-4 h-4" /> Kegiatan
          </button>
          <button
            onClick={() => setSubTab("foto-terbaru")}
            className={`flex items-center gap-2 font-subheading text-xs tracking-widest uppercase px-4 py-2.5 transition-all duration-300 rounded-sm cursor-pointer ${
              subTab === "foto-terbaru"
                ? "bg-[#d8a85c] text-[#110e09] font-bold"
                : "text-[#d3c4b3] hover:text-[#eae1d8]"
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Foto Terbaru
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`font-subheading text-[11px] tracking-wider uppercase px-4 py-2 border transition-all duration-300 rounded-sm cursor-pointer ${
                selectedCategory === cat
                  ? "border-[#f6c374] bg-[#f6c374]/10 text-[#f6c374] font-semibold"
                  : "border-[#4f4538]/20 hover:border-[#9b8f7f] text-[#d3c4b3]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <AnimatePresence mode="wait">
        {subTab === "kegiatan" ? (
          <motion.div
            key="kegiatan-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredActivities.length === 0 ? (
              <div className="col-span-full text-center py-24 text-[#d3c4b3] font-body text-sm">
                Tidak ada kegiatan ditemukan untuk kategori ini.
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
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(act.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
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
                      Lihat Galeri
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="foto-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="masonry-grid"
          >
            {sortedPhotos.length === 0 ? (
              <div className="text-center py-24 text-[#d3c4b3] font-body text-sm w-full">
                Tidak ada foto ditemukan untuk kategori ini.
              </div>
            ) : (
              sortedPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => onOpenLightbox(sortedPhotos, index)}
                  className="masonry-item group relative overflow-hidden rounded-sm cursor-pointer border border-[#4f4538]/10 hover:border-[#f6c374]/30 transition-cinematic bg-[#110e09]"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Floating Caption on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#110e09]/95 via-[#110e09]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 space-y-2">
                      <span className="font-subheading text-[10px] tracking-widest text-[#f6c374] uppercase block">
                        {photo.activity?.title || "Kegiatan"}
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
