import { useState, useEffect } from "react";
import { Activity, Photo, Settings, SectionSetting } from "./types.js";
import TopNavBar from "./components/TopNavBar.js";
import HeroCarousel from "./components/HeroCarousel.js";
import GaleriFoto from "./components/GaleriFoto.js";
import KegiatanPage from "./components/KegiatanPage.js";
import FotoTerbaruPage from "./components/FotoTerbaruPage.js";
import DetailKegiatan from "./components/DetailKegiatan.js";
import AdminLogin from "./components/AdminLogin.js";
import AdminDashboard from "./components/AdminDashboard.js";
import Lightbox from "./components/Lightbox.js";
import Notification from "./components/Notification.js";
import { Calendar, Tag, Shield, Clock, BookOpen, MapPin, Mail, Phone, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "./lib/supabase.js";
import { fallbackData } from "./lib/fallbackData.js";

export default function App() {
  // Public data state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Routing state
  const [activeTab, setActiveTab] = useState<"beranda" | "galeri" | "kegiatan" | "foto-terbaru" | "tentang" | "detail-kegiatan" | "admin">("beranda");
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [prevTab, setPrevTab] = useState<string>("beranda");

  // Admin session state
  const [adminToken, setAdminToken] = useState<string | null>(sessionStorage.getItem("admin_token"));
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // 1. Fetch public data
  const fetchPublicData = async () => {
    try {
      // Fetch site settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      let activeSet: Settings | null = null;
      if (settingsData) {
        activeSet = settingsData.raw_settings ? (settingsData.raw_settings as Settings) : {
          site_name: settingsData.site_name || "GALERI EMKA",
          logo: settingsData.logo || "",
          whatsapp: settingsData.whatsapp || "628123456789",
          accent_color: settingsData.accent_color || "#f6c374",
          updated_at: settingsData.updated_at || new Date().toISOString(),
          school_name: settingsData.school_name || "SMK Multi Karya",
          address: settingsData.address || "Jl. SMK Multi Karya No. 45",
          city: settingsData.city || "Medan",
          province: settingsData.province || "Sumatera Utara",
          country: settingsData.country || "Indonesia",
          email: settingsData.email || "info@multikarya.sch.id",
          phone: settingsData.phone || "(061) 1234567",
          tata_usaha: settingsData.tata_usaha || "Senin - Sabtu",
          whatsapp_title: settingsData.whatsapp_title || "Narahubung Cepat",
          whatsapp_description: settingsData.whatsapp_description || "Hubungi admin secara langsung melalui WhatsApp.",
          about_title: settingsData.about_title || "Mengabadikan Jejak, Mengukir Kenangan Sinematik",
          about_desc1: settingsData.about_desc1 || "Galeri EMKA adalah wadah dokumentasi visual.",
          about_desc2: settingsData.about_desc2 || "Kami tidak hanya mengambil foto.",
          about_photo: settingsData.about_photo || "",
          vision_title: settingsData.vision_title || "Visi & Seni Visual",
          vision_content: settingsData.vision_content || "Menjadi pusat dokumentasi visual sekolah.",
          missions: settingsData.missions || [],
          hero_label: settingsData.hero_label || "DOKUMENTASI SINEMATIK",
          hero_title: settingsData.hero_title || "GALERI EMKA",
          hero_description: settingsData.hero_description || "Elevating School Memories into Fine-Art Archives.",
          hero_image: settingsData.hero_image || "",
          hero_video: settingsData.hero_video || "",
          hero_source: settingsData.hero_source || "auto",
          sections: settingsData.sections || []
        };
      }

      // Fetch activities
      const { data: actData } = await supabase
        .from("activities")
        .select("*")
        .order("date", { ascending: false });

      let mappedActivities: Activity[] = [];
      if (actData && actData.length > 0) {
        mappedActivities = actData.map(row => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          category: row.category,
          date: row.date,
          description: row.description,
          cover_image: row.cover_image,
          background_video: row.background_video || "",
          google_drive_url: row.google_drive_url || null,
          status: row.published ? "published" : "draft",
          created_at: row.created_at,
          updated_at: row.updated_at
        }));
      }

      // Fetch photos/media
      const { data: mediaData } = await supabase
        .from("activity_media")
        .select("*")
        .order("sort_order", { ascending: true });

      let mappedPhotos: Photo[] = [];
      if (mediaData && mediaData.length > 0) {
        mappedPhotos = mediaData.map(row => ({
          id: row.id,
          activity_id: row.activity_id,
          title: row.caption || "",
          image_url: row.url,
          sort_order: row.sort_order || 0,
          created_at: row.created_at,
          updated_at: row.created_at
        }));
      }

      // If we got no data from Supabase, fall back to fallbackData
      if (mappedActivities.length === 0 && mappedPhotos.length === 0 && !activeSet) {
        setActivities((fallbackData.activities || []) as Activity[]);
        setPhotos((fallbackData.photos || []) as Photo[]);
        setSettings((fallbackData.settings || null) as Settings | null);
      } else {
        setActivities(mappedActivities);
        setPhotos(mappedPhotos);
        if (activeSet) {
          setSettings(activeSet);
        } else {
          setSettings((fallbackData.settings || null) as Settings | null);
        }
      }
    } catch (error) {
      console.error("Supabase load error, falling back to local data:", error);
      setActivities((fallbackData.activities || []) as Activity[]);
      setPhotos((fallbackData.photos || []) as Photo[]);
      setSettings((fallbackData.settings || null) as Settings | null);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify Admin Token on load
  const verifyAdminToken = async () => {
    try {
      const localToken = sessionStorage.getItem("admin_token");
      if (localToken === "emka_admin_session_active") {
        setIsAdminLoggedIn(true);
        setAdminToken("emka_admin_session_active");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user && session.user.email === "admin@multikarya.sch.id") {
        setIsAdminLoggedIn(true);
        setAdminToken(session.access_token);
        sessionStorage.setItem("admin_token", session.access_token);
      } else {
        setIsAdminLoggedIn(false);
        setAdminToken(null);
      }
    } catch (_) {
      setIsAdminLoggedIn(false);
    }
  };

  // 3. Hash-based routing listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash || hash === "#" || hash === "#beranda") {
        setActiveTab("beranda");
        setPrevTab("beranda");
        setActiveSlug("");
      } else if (hash === "#galeri") {
        setActiveTab("galeri");
        setPrevTab("galeri");
        setActiveSlug("");
      } else if (hash === "#kegiatan") {
        setActiveTab("kegiatan");
        setPrevTab("kegiatan");
        setActiveSlug("");
      } else if (hash === "#foto-terbaru") {
        setActiveTab("foto-terbaru");
        setPrevTab("foto-terbaru");
        setActiveSlug("");
      } else if (hash === "#tentang") {
        setActiveTab("tentang");
        setPrevTab("tentang");
        setActiveSlug("");
      } else if (hash === "#admin") {
        setActiveTab("admin");
        setActiveSlug("");
      } else if (hash.startsWith("#kegiatan/")) {
        const slug = hash.replace("#kegiatan/", "");
        setActiveTab("detail-kegiatan");
        setActiveSlug(slug);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    // Trigger on initial mount
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    fetchPublicData();
    verifyAdminToken();
  }, [adminToken]);

  // Navigate utility that syncs with address bar hash
  const navigateTo = (tab: "beranda" | "galeri" | "kegiatan" | "foto-terbaru" | "tentang" | "admin", slug?: string) => {
    if (slug) {
      window.location.hash = `#kegiatan/${slug}`;
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  const handleAdminLogin = (token: string) => {
    sessionStorage.setItem("admin_token", token);
    setAdminToken(token);
    setIsAdminLoggedIn(true);
    navigateTo("admin");
  };

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // safe fallback if not fully authenticated with traditional auth
    }
    sessionStorage.removeItem("admin_token");
    setAdminToken(null);
    setIsAdminLoggedIn(false);
    showToast("Berhasil keluar dari dashboard admin.", "success");
    navigateTo("beranda");
  };

  // Open Lightbox
  const openLightbox = (photosList: Photo[], index: number) => {
    setLightboxPhotos(photosList);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const currentDetailActivity = activities.find((act) => act.slug === activeSlug);
  const currentDetailPhotos = photos.filter((p) => p.activity_id === currentDetailActivity?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#17130e] flex items-center justify-center text-[#eae1d8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#f6c374]" />
          <p className="font-display text-sm tracking-widest text-[#9b8f7f] uppercase">
            Memuat Galeri Emka...
          </p>
        </div>
      </div>
    );
  }

  // Active Site Settings Fallbacks
  const activeSettings: Settings = (settings || {
    site_name: "GALERI EMKA",
    logo: "",
    whatsapp: "628123456789",
    accent_color: "#f6c374",
    updated_at: new Date().toISOString(),
    school_name: "SMK Multi Karya",
    address: "Jl. SMK Multi Karya No. 45",
    city: "Medan",
    province: "Sumatera Utara",
    country: "Indonesia",
    email: "info@multikarya.sch.id",
    phone: "(061) 1234567",
    tata_usaha: "Senin - Sabtu",
    whatsapp_title: "Narahubung Cepat",
    whatsapp_description: "Hubungi admin secara langsung melalui WhatsApp.",
    about_title: "Mengabadikan Jejak, Mengukir Kenangan Sinematik",
    about_desc1: "Galeri EMKA adalah wadah dokumentasi visual.",
    about_desc2: "Kami tidak hanya mengambil foto.",
    about_photo: "",
    vision_title: "Visi & Seni Visual",
    vision_content: "Menjadi pusat dokumentasi visual sekolah.",
    missions: [],
    hero_label: "DOKUMENTASI SINEMATIK",
    hero_title: "GALERI EMKA",
    hero_description: "Elevating School Memories into Fine-Art Archives.",
    hero_image: "",
    hero_video: "",
    hero_source: "auto",
    sections: []
  }) as Settings;

  return (
    <div className="min-h-screen bg-[#17130e] text-[#eae1d8] flex flex-col font-body selection:bg-[#f6c374]/30 selection:text-[#f6c374]">
      
      {/* Dynamic Top Navigation Bar (Hidden only in active Admin mode to avoid clutter) */}
      {activeTab !== "admin" && (
        <TopNavBar
          activeTab={activeTab}
          onChangeTab={navigateTo}
          settings={activeSettings}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {/* Main View Router */}
      <div className="flex-1">
        {activeTab === "beranda" && (
          <div className="space-y-4">
            {((activeSettings.sections && activeSettings.sections.length > 0 ? activeSettings.sections : [
              { id: "hero", section_name: "Hero Homepage", enabled: true, layout: "cinematic", sort_order: 1, item_limit: "all", custom_label: "Hero" },
              { id: "galeri", section_name: "Arsip Galeri", enabled: true, layout: "cinematic", sort_order: 2, item_limit: 9, custom_label: "Galeri Foto" },
              { id: "kegiatan", section_name: "Arsip Kegiatan", enabled: true, layout: "grid", sort_order: 3, item_limit: 3, custom_label: "Arsip Kegiatan Pilihan", sorting: "latest" },
              { id: "tentang", section_name: "Tentang Kami", enabled: true, layout: "editorial", sort_order: 4, item_limit: "all", custom_label: "Tentang Kami" },
              { id: "visi-misi", section_name: "Visi & Misi", enabled: true, layout: "grid", sort_order: 5, item_limit: "all", custom_label: "Visi & Misi" },
              { id: "kontak", section_name: "Informasi Kontak", enabled: true, layout: "grid", sort_order: 6, item_limit: "all", custom_label: "Hubungi Kami" }
            ]) as SectionSetting[])
              .filter((section) => section.enabled)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((section) => {
                switch (section.id) {
                  case "hero":
                    return (
                      <HeroCarousel
                        key={section.id}
                        activities={activities}
                        onViewActivity={(slug) => navigateTo("beranda", slug)}
                        settings={activeSettings}
                      />
                    );

                  case "kegiatan": {
                    const customLabel = section.custom_label || "Arsip Kegiatan Pilihan";
                    const limit = typeof section.item_limit === "number" ? section.item_limit : 3;
                    
                    // Sort activities
                    let sortedActivities = [...activities];
                    if (section.sorting === "oldest") {
                      sortedActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    } else {
                      sortedActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    }
                    const displayActs = sortedActivities.slice(0, limit);

                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                          <div className="space-y-3">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              Koleksi Kegiatan
                            </span>
                            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#eae1d8] tracking-tight">
                              {customLabel}
                            </h2>
                          </div>
                          <button
                            onClick={() => navigateTo("galeri")}
                            className="font-subheading text-xs tracking-widest uppercase border-b-2 border-[#f6c374] pb-1 text-[#f6c374] hover:text-[#eae1d8] hover:border-[#eae1d8] transition-colors cursor-pointer"
                          >
                            Lihat Seluruh Galeri &rarr;
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {displayActs.map((act) => (
                            <div
                              key={act.id}
                              onClick={() => navigateTo("beranda", act.slug)}
                              className="group relative bg-[#110e09] border border-[#4f4538]/15 rounded-sm overflow-hidden cursor-pointer hover:border-[#f6c374]/40 transition-cinematic shadow-lg flex flex-col"
                            >
                              <div className="aspect-[4/3] w-full overflow-hidden relative">
                                <img
                                  src={act.cover_image}
                                  alt={act.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-cinematic duration-700"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#110e09] via-transparent to-transparent opacity-80" />
                                <span className="absolute top-4 left-4 bg-[#110e09]/80 backdrop-blur-md border border-[#4f4538]/30 font-subheading text-[10px] tracking-widest text-[#f6c374] px-3 py-1.5 rounded-sm uppercase">
                                  {act.category}
                                </span>
                              </div>

                              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                  <span className="flex items-center gap-2 text-[10px] text-[#9b8f7f] font-subheading tracking-wider uppercase">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(act.date).toLocaleDateString("id-ID", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric"
                                    })}
                                  </span>
                                  <h3 className="font-display text-lg font-bold text-[#eae1d8] group-hover:text-[#f6c374] transition-colors leading-tight">
                                    {act.title}
                                  </h3>
                                  <p className="font-body text-xs text-[#d3c4b3] line-clamp-2 leading-relaxed">
                                    {act.description}
                                  </p>
                                </div>

                                <button className="border border-[#4f4538]/30 text-[#eae1d8] group-hover:bg-[#f6c374] group-hover:text-[#110e09] group-hover:border-[#f6c374] font-subheading text-[10px] tracking-widest uppercase py-2 w-full text-center rounded-sm transition-all duration-500">
                                  Lihat Dokumentasi
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  case "galeri": {
                    const customLabel = section.custom_label || "Arsip Galeri";
                    const limit = typeof section.item_limit === "number" ? section.item_limit : 9;
                    const displayPhotos = photos.slice(0, limit);

                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                          <div className="space-y-3">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              Momen Abadi
                            </span>
                            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#eae1d8] tracking-tight">
                              {customLabel}
                            </h2>
                          </div>
                          <button
                            onClick={() => navigateTo("galeri")}
                            className="font-subheading text-xs tracking-widest uppercase border-b-2 border-[#f6c374] pb-1 text-[#f6c374] hover:text-[#eae1d8] hover:border-[#eae1d8] transition-colors cursor-pointer"
                          >
                            Buka Galeri Foto &rarr;
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {displayPhotos.map((photo, pIdx) => (
                            <div
                              key={photo.id}
                              onClick={() => openLightbox(photos, pIdx)}
                              className="group relative aspect-[4/3] rounded-sm overflow-hidden border border-[#4f4538]/10 bg-[#110e09] cursor-pointer hover:border-[#f6c374]/30 transition-all duration-500 shadow-md"
                            >
                              <img
                                src={photo.image_url}
                                alt={photo.title || ""}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                <span className="font-display text-xs text-[#eae1d8] font-bold line-clamp-1">{photo.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  case "foto-terbaru": {
                    const customLabel = section.custom_label || "Momen Terkini";
                    const limit = typeof section.item_limit === "number" ? section.item_limit : 6;
                    
                    // Sort photos
                    let sortedPhotos = [...photos];
                    if (section.sorting === "oldest") {
                      sortedPhotos.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    } else {
                      sortedPhotos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    }
                    
                    const displayPhotos = sortedPhotos.slice(0, limit);

                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                          <div className="space-y-3">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              Update Momen
                            </span>
                            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#eae1d8] tracking-tight">
                              {customLabel}
                            </h2>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          {displayPhotos.map((photo, pIdx) => (
                            <div
                              key={photo.id}
                              onClick={() => openLightbox(sortedPhotos, pIdx)}
                              className="group relative aspect-square rounded-sm overflow-hidden border border-[#4f4538]/10 bg-[#110e09] cursor-pointer hover:border-[#f6c374]/30 transition-all duration-500 shadow-md"
                            >
                              <img
                                src={photo.image_url}
                                alt={photo.title || ""}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="font-subheading text-[9px] tracking-wider text-[#eae1d8] uppercase">PERBESAR</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  case "tentang": {
                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                          <div className="space-y-6">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              {section.custom_label || "Tentang Kami"}
                            </span>
                            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#eae1d8] tracking-tight leading-tight">
                              {activeSettings.about_title || "Mengabadikan Jejak, Mengukir Kenangan Sinematik"}
                            </h2>
                            <p className="font-body text-sm text-[#d3c4b3]/90 leading-relaxed">
                              {activeSettings.about_desc1}
                            </p>
                            <p className="font-body text-sm text-[#d3c4b3]/80 leading-relaxed">
                              {activeSettings.about_desc2}
                            </p>
                          </div>
                          <div className="relative aspect-video rounded-sm overflow-hidden border border-[#4f4538]/20 bg-[#110e09] shadow-2xl">
                            <img
                              src={activeSettings.about_photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT"}
                              alt="About Visual"
                              className="w-full h-full object-cover opacity-80"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      </section>
                    );
                  }

                  case "visi-misi": {
                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                          <div className="space-y-6">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              {section.custom_label || "Visi Sekolah"}
                            </span>
                            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#eae1d8]">
                              {activeSettings.vision_title || "Visi & Seni Visual"}
                            </h3>
                            <p className="font-body text-sm text-[#d3c4b3] leading-relaxed bg-[#110e09] p-6 rounded-sm border border-[#4f4538]/10 italic">
                              "{activeSettings.vision_content}"
                            </p>
                          </div>
                          <div className="space-y-6">
                            <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                              Misi Kami
                            </span>
                            <ul className="space-y-4">
                              {(activeSettings.missions || []).map((mis, idx) => (
                                <li key={idx} className="flex gap-3 text-sm text-[#d3c4b3]">
                                  <span className="text-[#f6c374] font-bold">0{idx + 1}.</span>
                                  <span className="leading-relaxed">{mis}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </section>
                    );
                  }

                  case "kontak": {
                    return (
                      <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                        <div className="glass-panel p-8 sm:p-12 rounded-sm border border-[#4f4538]/15 grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-2">
                            <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                              <MapPin className="w-5 h-5 text-[#f6c374]" /> Alamat Kampus
                            </h4>
                            <p className="font-body text-xs text-[#d3c4b3] leading-relaxed">
                              {activeSettings.school_name || "SMK Multi Karya"}<br />
                              {activeSettings.address || "Jl. SMK Multi Karya No. 45"}<br />
                              {activeSettings.city || "Medan"}, {activeSettings.province || "Sumatera Utara"}<br />
                              {activeSettings.country || "Indonesia"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                              <Mail className="w-5 h-5 text-[#f6c374]" /> Kontak & Surel
                            </h4>
                            <p className="font-body text-xs text-[#d3c4b3] leading-relaxed">
                              Surel: {activeSettings.email || "info@multikarya.sch.id"}<br />
                              Telepon: {activeSettings.phone || "(061) 1234567"}<br />
                              Tata Usaha: {activeSettings.tata_usaha || "Senin - Sabtu"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                              <Phone className="w-5 h-5 text-[#f6c374]" /> {activeSettings.whatsapp_title || "Narahubung Cepat"}
                            </h4>
                            <p className="font-body text-xs text-[#d3c4b3] leading-relaxed mb-3">
                              {activeSettings.whatsapp_description || "Hubungi admin secara langsung melalui WhatsApp untuk permintaan arsip beresolusi penuh."}
                            </p>
                            <button
                              onClick={() => {
                                const cleanNumber = activeSettings.whatsapp.replace(/[^0-9]/g, "");
                                window.open(`https://wa.me/${cleanNumber}`, "_blank", "noopener,noreferrer");
                              }}
                              className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-[10px] tracking-widest uppercase py-2 px-4 rounded-sm transition-all font-semibold flex items-center gap-2"
                            >
                              Hubungi WhatsApp Admin
                            </button>
                          </div>
                        </div>
                      </section>
                    );
                  }

                  default:
                    return null;
                }
              })}
          </div>
        )}

        {activeTab === "galeri" && (
          <GaleriFoto
            activities={activities}
            photos={photos}
            onViewActivity={(slug) => navigateTo("beranda", slug)}
            onOpenLightbox={openLightbox}
          />
        )}

        {activeTab === "kegiatan" && (
          <KegiatanPage
            activities={activities}
            photos={photos}
            onViewActivity={(slug) => navigateTo("beranda", slug)}
          />
        )}

        {activeTab === "foto-terbaru" && (
          <FotoTerbaruPage
            activities={activities}
            photos={photos}
            onViewActivity={(slug) => navigateTo("beranda", slug)}
            onOpenLightbox={openLightbox}
          />
        )}

        {activeTab === "detail-kegiatan" && currentDetailActivity && (
          <DetailKegiatan
            activity={currentDetailActivity}
            photos={currentDetailPhotos}
            allActivities={activities}
            onBack={() => navigateTo(prevTab as any)}
            onNavigateActivity={(slug) => navigateTo("beranda", slug)}
            onOpenLightbox={openLightbox}
            onShowToast={showToast}
          />
        )}

        {activeTab === "tentang" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 space-y-24">
            {/* Header */}
            <div className="space-y-4 max-w-3xl">
              <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block">
                Tentang Kami
              </span>
              <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#eae1d8] tracking-tight leading-tight">
                {activeSettings.about_title || "Mengabadikan Jejak, Mengukir Kenangan Sinematik"}
              </h1>
              <p className="font-body text-base sm:text-lg text-[#d3c4b3] leading-relaxed">
                {activeSettings.about_desc1}
              </p>
            </div>

            {/* Philosophy Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#f6c374]">
                  {activeSettings.vision_title || "Visi & Seni Visual"}
                </h3>
                <p className="font-body text-sm text-[#d3c4b3] leading-relaxed">
                  {activeSettings.vision_content}
                </p>
                <div className="space-y-3 pt-2">
                  <h4 className="font-subheading text-xs uppercase tracking-wider text-[#eae1d8] font-bold">Misi Kami:</h4>
                  <ul className="space-y-2 pl-4 list-decimal text-xs text-[#d3c4b3]/90 leading-relaxed">
                    {(activeSettings.missions || []).map((mis, idx) => (
                      <li key={idx}>{mis}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="relative aspect-video rounded-sm overflow-hidden border border-[#4f4538]/20 bg-[#110e09] shadow-2xl">
                <img
                  src={activeSettings.about_photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT"}
                  alt="Philosophy Visual"
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Contact details */}
            <div className="glass-panel p-8 sm:p-12 rounded-sm border border-[#4f4538]/15 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#f6c374]" /> Alamat Kampus
                </h4>
                <p className="font-body text-xs text-[#d3c4b3] leading-relaxed">
                  {activeSettings.school_name || "SMK Multi Karya"}<br />
                  {activeSettings.address || "Jl. SMK Multi Karya No. 45"}<br />
                  {activeSettings.city || "Medan"}, {activeSettings.province || "Sumatera Utara"}<br />
                  {activeSettings.country || "Indonesia"}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#f6c374]" /> Kontak & Surel
                </h4>
                <p className="font-body text-xs text-[#d3c4b3] leading-relaxed">
                  Surel: {activeSettings.email || "info@multikarya.sch.id"}<br />
                  Telepon: {activeSettings.phone || "(061) 1234567"}<br />
                  Tata Usaha: {activeSettings.tata_usaha || "Senin - Sabtu"}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-display text-lg font-bold text-[#eae1d8] flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#f6c374]" /> {activeSettings.whatsapp_title || "Narahubung Cepat"}
                </h4>
                <p className="font-body text-xs text-[#d3c4b3] leading-relaxed mb-3">
                  {activeSettings.whatsapp_description || "Hubungi admin secara langsung melalui WhatsApp untuk permintaan arsip beresolusi penuh."}
                </p>
                <button
                  onClick={() => {
                    const cleanNumber = activeSettings.whatsapp.replace(/[^0-9]/g, "");
                    window.open(`https://wa.me/${cleanNumber}`, "_blank", "noopener,noreferrer");
                  }}
                  className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-[10px] tracking-widest uppercase py-2 px-4 rounded-sm transition-all font-semibold flex items-center gap-2"
                >
                  Hubungi WhatsApp Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "admin" && (
          isAdminLoggedIn ? (
            <AdminDashboard
              token={adminToken || ""}
              onLogout={handleAdminLogout}
              onShowToast={showToast}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleAdminLogin}
              onBackToHome={() => navigateTo("beranda")}
              onShowToast={showToast}
            />
          )
        )}
      </div>

      {/* Footer (Hidden inside active Admin Dashboard so layout remains incredibly clean) */}
      {activeTab !== "admin" && (
        <footer className="bg-[#110e09] border-t border-[#4f4538]/15 py-12 px-4 sm:px-6 lg:px-8 mt-24">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-1">
              <span className="font-display text-lg font-black tracking-widest text-[#eae1d8] hover:text-[#f6c374] transition-colors cursor-pointer" onClick={() => navigateTo("beranda")}>
                {activeSettings.site_name}
              </span>
              <p className="font-body text-[10px] text-[#9b8f7f] uppercase tracking-widest">
                Elevating School Memories into Fine-Art Archives
              </p>
            </div>

            <div className="flex gap-6 font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
              <button onClick={() => navigateTo("beranda")} className="hover:text-[#eae1d8] transition-colors cursor-pointer">Beranda</button>
              <button onClick={() => navigateTo("galeri")} className="hover:text-[#eae1d8] transition-colors cursor-pointer">Galeri</button>
              <button onClick={() => navigateTo("tentang")} className="hover:text-[#eae1d8] transition-colors cursor-pointer">Tentang</button>
              <button onClick={() => navigateTo("admin")} className="text-[#f6c374] hover:text-[#eae1d8] transition-colors flex items-center gap-1 cursor-pointer">
                <Shield className="w-3.5 h-3.5" /> Portal Admin
              </button>
            </div>

            <p className="font-body text-[10px] text-[#4f4538]">
              &copy; {new Date().getFullYear()} {activeSettings.site_name}. All rights reserved. Built with precision.
            </p>
          </div>
        </footer>
      )}

      {/* Fullscreen Visual Lightbox Overlay */}
      {lightboxOpen && (
        <Lightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length)}
          onPrev={() => setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length)}
        />
      )}

      {/* Dynamic Notifications */}
      {toast && (
        <Notification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}
