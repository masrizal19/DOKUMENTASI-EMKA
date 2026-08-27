import { useState, useMemo } from "react";
import { Activity, Photo } from "../types.js";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Tag, Image as ImageIcon, ArrowRight, Grid, Search } from "lucide-react";

interface KegiatanPageProps {
  activities: Activity[];
  photos: Photo[];
  onViewActivity: (slug: string) => void;
}

export default function KegiatanPage({ activities, photos, onViewActivity }: KegiatanPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter activities to only include published ones
  const publishedActivities = useMemo(() => {
    return activities.filter(act => act.status === "published");
  }, [activities]);

  // Extract unique categories
  const categories = useMemo(() => {
    const list = new Set(publishedActivities.map((act) => act.category));
    return ["Semua", ...Array.from(list)];
  }, [publishedActivities]);

  // Filter & Search activities
  const filteredActivities = useMemo(() => {
    return publishedActivities.filter((act) => {
      const matchesCategory = selectedCategory === "Semua" || act.category === selectedCategory;
      const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            act.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [publishedActivities, selectedCategory, searchQuery]);

  return (
    <div className="bg-[#17130e] text-[#eae1d8] min-h-screen py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        
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
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 border-b border-[#4f4538]/20 pb-6">
          
          {/* Categories Selector */}
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

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b8f7f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kegiatan..."
              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2 px-10 font-body text-xs text-[#eae1d8] placeholder-[#9b8f7f] focus:outline-none focus:border-[#f6c374] transition-colors"
            />
          </div>
        </div>

        {/* Kegiatan Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${searchQuery}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredActivities.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-center space-y-6">
                <Grid className="w-12 h-12 text-[#f6c374]/40" />
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-[#f6c374]">
                    BELUM ADA KEGIATAN YANG DITERBITKAN
                  </h3>
                  <p className="font-body text-xs text-[#9b8f7f] max-w-md mx-auto">
                    Arsip kegiatan kosong atau sedang dalam status draf di panel admin. Coba ubah kategori filter atau periksa kembali database.
                  </p>
                </div>
              </div>
            ) : (
              filteredActivities.map((act) => {
                // Compute total photos for this activity dynamically
                const photoCount = photos.filter(p => p.activity_id === act.id).length;

                return (
                  <div
                    key={act.id}
                    onClick={() => onViewActivity(act.slug)}
                    className="group bg-[#110e09]/70 border border-[#4f4538]/15 hover:border-[#f6c374]/35 rounded-sm overflow-hidden cursor-pointer transition-cinematic shadow-xl flex flex-col h-full"
                  >
                    {/* Cover Photo */}
                    <div className="aspect-[16/10] w-full overflow-hidden relative">
                      <img
                        src={act.cover_image}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-cinematic duration-700"
                        referrerPolicy="no-referrer"
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
                            year: "numeric"
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
