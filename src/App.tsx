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
import SearchModal from "./components/SearchModal.js";
import Notification from "./components/Notification.js";
import { Calendar, Tag, Shield, Clock, BookOpen, MapPin, Mail, Phone, ExternalLink, Loader2 } from "lucide-react";
import { fallbackData } from "./lib/fallbackData.js";
import { getAdminSession, isAdminAuthenticated, performAdminLogout } from "./lib/adminAuth.js";

export default function App() {
  // Public data state
  const [activities, setActivities] = useState<Activity[]>((fallbackData.activities || []) as Activity[]);
  const [photos, setPhotos] = useState<Photo[]>((fallbackData.photos || []) as Photo[]);
  const [settings, setSettings] = useState<Settings | null>((fallbackData.settings || null) as Settings | null);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // Routing state
  const [activeTab, setActiveTab] = useState<"beranda" | "galeri" | "kegiatan" | "foto-terbaru" | "tentang" | "detail-kegiatan" | "admin">("beranda");
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [prevTab, setPrevTab] = useState<string>("beranda");

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Admin session & auth guard state
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // 1. Fetch public data with timeout and caching
  const fetchPublicData = async () => {
    setIsFetchingData(true);
    
    // Helper to run promise with timeout
    async function fetchWithTimeout(promise: any, timeoutMs = 8000): Promise<any> {
      let timeoutId: any;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`Supabase request timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs);
      });
      
      try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Supabase query failed:", err);
        return null;
      }
    }

    try {
      // Try to load cached data from sessionStorage for lightning-fast subsequent loads
      const cachedActivities = sessionStorage.getItem("emka_cached_activities");
      const cachedPhotos = sessionStorage.getItem("emka_cached_photos");
      const cachedSettings = sessionStorage.getItem("emka_cached_settings");

      if (cachedActivities && cachedPhotos && cachedSettings) {
        try {
          setActivities(JSON.parse(cachedActivities));
          setPhotos(JSON.parse(cachedPhotos));
          setSettings(JSON.parse(cachedSettings));
          setIsFetchingData(false);
          // We still fetch fresh data in background silently
        } catch (_) {}
      }

      const API_BASE_URL = `${(import.meta as any).env.VITE_API_URL || "https://api.mkverse.my.id"}/api`;
      const settingsPromise = fetch(`${API_BASE_URL}/settings.php`).then(res => {
        if (!res.ok) throw new Error("Settings API failed");
        return res.json();
      }).catch(() => null);
      
      const settingsResult = await fetchWithTimeout(settingsPromise, 8000);
      
      let activeSet: Settings | null = null;
      if (settingsResult && settingsResult.success && settingsResult.data) {
        const raw = settingsResult.data as any;
        activeSet = {
          site_name: raw.site_name || "GALERI EMKA",
          logo: raw.logo || "",
          whatsapp: raw.whatsapp || "628123456789",
          accent_color: raw.accent_color || "#f6c374",
          updated_at: raw.updated_at || new Date().toISOString(),
          school_name: raw.school_name || "SMK Multi Karya",
          address: raw.address || "Jl. SMK Multi Karya No. 45",
          city: raw.city || "Medan",
          province: raw.province || "Sumatera Utara",
          country: raw.country || "Indonesia",
          email: raw.email || "info@multikarya.sch.id",
          phone: raw.phone || "(061) 1234567",
          tata_usaha: raw.tata_usaha || "Senin - Sabtu",
          whatsapp_title: raw.whatsapp_title || "Narahubung Cepat",
          whatsapp_description: raw.whatsapp_description || "Hubungi admin secara langsung melalui WhatsApp.",
          about_title: raw.about_title || "Mengabadikan Jejak, Mengukir Kenangan Sinematik",
          about_desc1: raw.about_desc1 || "Galeri EMKA adalah wadah dokumentasi visual.",
          about_desc2: raw.about_desc2 || "Kami tidak hanya mengambil foto.",
          about_photo: raw.about_photo || "",
          vision_title: raw.vision_title || "Visi & Seni Visual",
          vision_content: raw.vision_content || "Menjadi pusat dokumentasi visual sekolah.",
          missions: raw.missions || [],
          hero_label: raw.hero_label || "DOKUMENTASI SINEMATIK",
          hero_title: raw.hero_title || "GALERI EMKA",
          hero_description: raw.hero_description || "Elevating School Memories into Fine-Art Archives.",
          hero_image: raw.hero_image || "",
          hero_video: raw.hero_video || "",
          hero_source: raw.hero_source || "auto",
          sections: raw.sections || [],
          enable_kegiatan_page: raw.enable_kegiatan_page ?? true,
          enable_foto_terbaru_page: raw.enable_foto_terbaru_page ?? true,
          homepage_gallery_limit: typeof raw.homepage_gallery_limit === "number" ? raw.homepage_gallery_limit : 6,
          homepage_gallery_photo_ids: Array.isArray(raw.homepage_gallery_photo_ids) ? raw.homepage_gallery_photo_ids : [],
          slideshow_duration: raw.slideshow_duration ?? 5,
          slideshow_transition: raw.slideshow_transition ?? "Fade",
          slideshow_blur: raw.slideshow_blur ?? 35,
          slideshow_source: raw.slideshow_source || "latest",
          slideshow_limit: typeof raw.slideshow_limit === "number" ? raw.slideshow_limit : 5,
          slideshow_gallery_ids: Array.isArray(raw.slideshow_gallery_ids) ? raw.slideshow_gallery_ids : [],
          copyright_year: raw.copyright_year || "2026",
          copyright_author: raw.copyright_author || ""
        };
      }

      // 2. Fetch categories with timeout
      const apiUrl = (import.meta as any).env.VITE_API_URL || "https://api.mkverse.my.id";
      const activitiesPromise = fetch(`${apiUrl}/api/categories.php`).then(res => res.json());

      const activitiesResult = await fetchWithTimeout(activitiesPromise, 8000);

      if (!activitiesResult?.success && activitiesResult?.error) {
        console.error("PUBLIC CATEGORIES FETCH ERROR", activitiesResult.error);
      }

      let mappedActivities: Activity[] = [];
      if (activitiesResult && activitiesResult.success && activitiesResult.data) {
        mappedActivities = (activitiesResult.data as any[]).map((row: any) => ({
          id: String(row.id),
          title: row.name || row.title || "Kategori Tanpa Nama",
          slug: row.slug || (row.name || row.title || "").toLowerCase().replace(/\s+/g, '-') || `cat-${row.id}`,
          category: row.name || row.category || "Lainnya",
          date: row.date || row.event_date || "0000-00-00",
          description: row.description || `Dokumentasi untuk kategori ${row.name || row.title || "ini"}.`,
          cover_image: row.cover_image || "",
          background_image: row.background_image || "",
          background_video: row.background_video || "",
          background_video_start: row.background_video_start || 0,
          background_video_end: row.background_video_end || null,
          background_video_loop: row.background_video_loop !== false,
          google_drive_url: row.google_drive_url || null,
          status: "published", // Categories are generally always published in this new structure
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString()
        }));
      }

      // 3. Fetch photos/media from PHP API with timeout
      const photosPromise = fetch(`${apiUrl}/api/photos.php`).then(res => res.json());

      const photosResult = await fetchWithTimeout(photosPromise, 8000);

      if (!photosResult?.success && photosResult?.error) {
        console.error("PUBLIC PHOTOS FETCH ERROR", photosResult.error);
      }

      let mappedPhotos: Photo[] = [];
      if (photosResult && photosResult.success && photosResult.data) {
        console.log("PHP API Photos Response:", photosResult.data);
        mappedPhotos = (photosResult.data as any[]).map((row: any) => ({
          id: String(row.id),
          category_id: String(row.category_id),
          activity_id: String(row.category_id), // Kept for backward compatibility
          title: row.title || row.description || "Foto Galeri",
          image_url: row.image_url,
          description: row.description || "",
          event_date: row.event_date || "0000-00-00",
          sort_order: parseInt(row.display_order) || 0,
          is_featured: String(row.is_featured) === "1" || row.is_featured === true,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString()
        }));
      }

      // If we got valid fresh data, update states and caching
      if (activitiesResult && activitiesResult.success && Array.isArray(activitiesResult.data)) {
        setActivities(mappedActivities);
        sessionStorage.setItem("emka_cached_activities", JSON.stringify(mappedActivities));
      }

      if (photosResult && photosResult.success && Array.isArray(photosResult.data)) {
        setPhotos(mappedPhotos);
        sessionStorage.setItem("emka_cached_photos", JSON.stringify(mappedPhotos));
      }
      if (activeSet) {
        setSettings(activeSet);
        sessionStorage.setItem("emka_cached_settings", JSON.stringify(activeSet));
      }
    } catch (error) {
      console.error("Supabase load error, falling back to local data:", error);
    } finally {
      setIsFetchingData(false);
    }
  };

  // 2. Auth Guard & Session Check using official Supabase Auth
  const checkAdminSession = async () => {
    setIsAuthLoading(true);
    try {
      const authSession = await getAdminSession();

      if (authSession?.session && authSession?.user) {
        setIsAdminLoggedIn(true);
        setAdminToken(authSession.session.access_token);
      } else {
        setIsAdminLoggedIn(false);
        setAdminToken(null);
      }
    } catch (err) {
      console.error("[AUTH ERROR]", err);
      setIsAdminLoggedIn(false);
      setAdminToken(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
    checkAdminSession();
  }, []);

  // 3. Hash & Path Routing listener & Global Search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      const pathname = window.location.pathname;

      if (pathname.startsWith("/admin") || hash.startsWith("#admin")) {
        setActiveTab("admin");
      } else if (!hash || hash === "#" || hash === "#beranda") {
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
      } else if (hash.startsWith("#kegiatan/")) {
        const slug = hash.replace("#kegiatan/", "");
        setActiveTab("detail-kegiatan");
        setActiveSlug(slug);
      }
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    // Trigger on initial mount
    handleLocationChange();

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Navigate utility that syncs with address bar hash
  const navigateTo = (tab: "beranda" | "galeri" | "kegiatan" | "foto-terbaru" | "tentang" | "admin", slug?: string) => {
    if (tab === "admin") {
      window.location.hash = "#admin";
      setActiveTab("admin");
    } else if (slug) {
      window.location.hash = `#kegiatan/${slug}`;
      setActiveTab("detail-kegiatan");
      setActiveSlug(slug);
    } else {
      window.location.hash = `#${tab}`;
      setActiveTab(tab);
    }
  };

  const handleAdminLogin = (token: string) => {
    sessionStorage.setItem("admin_token", token);
    setAdminToken(token);
    setIsAdminLoggedIn(true);
    setIsAuthLoading(false);
    navigateTo("admin");
  };

  const handleAdminLogout = async () => {
    setIsAuthLoading(true);
    try {
      await performAdminLogout();
    } catch (_) {}

    setAdminToken(null);
    setIsAdminLoggedIn(false);
    setIsAuthLoading(false);
    showToast("Berhasil keluar dari dashboard admin.", "success");
    navigateTo("admin");
  };

  // Open Lightbox
  const openLightbox = (photosList: Photo[], index: number) => {
    setLightboxPhotos(photosList);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const currentDetailActivity = activities.find((act) => act.slug === activeSlug);
  const currentDetailPhotos = photos.filter((p) => p.activity_id === currentDetailActivity?.id);

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
    sections: [],
    homepage_gallery_limit: 6,
    homepage_gallery_photo_ids: [],
    copyright_year: "2026",
    copyright_author: ""
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
          onOpenSearch={() => setIsSearchOpen(true)}
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
                              <div className="aspect-[4/5] w-full overflow-hidden relative">
                                <img
                                  src={act.cover_image || undefined}
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
                    const limit = typeof activeSettings.homepage_gallery_limit === "number"
                      ? activeSettings.homepage_gallery_limit
                      : (typeof section.item_limit === "number" ? section.item_limit : 6);
                    const safeLimit = Math.min(Math.max(limit, 1), 15);

                    let displayPhotos: Photo[] = [];
                    const selectedPhotoIds = activeSettings.homepage_gallery_photo_ids || [];

                    if (selectedPhotoIds.length > 0) {
                      selectedPhotoIds.forEach(pId => {
                        const found = photos.find(p => p.id === pId);
                        if (found && !displayPhotos.some(dp => dp.id === found.id)) {
                          displayPhotos.push(found);
                        }
                      });
                      displayPhotos = displayPhotos.slice(0, safeLimit);
                    }

                    // Fallback if no specific photos chosen yet
                    if (displayPhotos.length === 0) {
                      displayPhotos = photos.slice(0, safeLimit);
                    }

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
                              onClick={() => openLightbox(displayPhotos, pIdx)}
                              className="group relative aspect-[4/3] rounded-sm overflow-hidden border border-[#4f4538]/10 bg-[#110e09] cursor-pointer hover:border-[#f6c374]/30 transition-all duration-500 shadow-md"
                            >
                              <img
                                src={photo.image_url || undefined}
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
                                src={photo.image_url || undefined}
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
                              src={activeSettings.about_photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT" || undefined}
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
                  src={activeSettings.about_photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT" || undefined}
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
          isAuthLoading ? (
            <div className="min-h-screen bg-[#110e09] flex flex-col items-center justify-center space-y-4 text-[#eae1d8]">
              <Loader2 className="w-8 h-8 text-[#f6c374] animate-spin" />
              <p className="font-subheading text-xs tracking-widest text-[#9b8f7f] uppercase">
                Memeriksa sesi admin...
              </p>
            </div>
          ) : isAdminLoggedIn ? (
            <AdminDashboard
              token={adminToken || ""}
              onLogout={handleAdminLogout}
              onShowToast={showToast}
              onRefreshData={fetchPublicData}
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
                Mengabadikan perjalanan EMKA
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
              &copy; {activeSettings.copyright_year || new Date().getFullYear()} {activeSettings.site_name}. All rights reserved. Built with precision.{activeSettings.copyright_author ? ` Created by ${activeSettings.copyright_author}` : ""}
            </p>
          </div>
        </footer>
      )}

      {/* Global Interactive Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        activities={activities}
        photos={photos}
        onViewActivity={(slug) => {
          setIsSearchOpen(false);
          navigateTo("beranda", slug);
        }}
        onOpenLightbox={(photosList, index) => {
          setIsSearchOpen(false);
          openLightbox(photosList, index);
        }}
      />

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
