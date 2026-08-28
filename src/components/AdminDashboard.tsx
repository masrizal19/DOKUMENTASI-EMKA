import React, { useState, useEffect, useRef } from "react";
import { Activity, Photo, Settings, DashboardStats } from "../types.js";
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  ChevronUp,
  ChevronDown,
  Save,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  FileText,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { fallbackData } from "../lib/fallbackData.js";
import { getAdminSession } from "../lib/adminAuth.js";
import { ImageCropModal } from "./ImageCropModal.tsx";
import VideoTrimmer from "./VideoTrimmer.tsx";
import { getStorageObjectPath, isValidUUID } from "../lib/storage.js";

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
  onRefreshData?: () => void;
}

export default function AdminDashboard({ token, onLogout, onShowToast, onRefreshData }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "photos" | "settings">("dashboard");
  const [settingsSubTab, setSettingsSubTab] = useState<"school" | "hero" | "about" | "vision" | "sections" | "copyright">("school");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete modal state
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState<boolean>(false);

  // Form states
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityFormData, setActivityFormData] = useState({
    title: "",
    category: "",
    date: "",
    description: "",
    google_drive_url: "",
    status: "draft" as "published" | "draft"
  });

  // Local file preview and upload states
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [existingCoverUrl, setExistingCoverUrl] = useState<string>("");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rawImageFileForCrop, setRawImageFileForCrop] = useState<File | null>(null);
  const [cropFileInfo, setCropFileInfo] = useState<{ width: number; height: number; sizeFormatted: string } | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [existingVideoUrl, setExistingVideoUrl] = useState<string>("");

  const [videoTrimStart, setVideoTrimStart] = useState<number>(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState<number | null>(null);
  const [confirmedVideoStart, setConfirmedVideoStart] = useState<number>(0);
  const [confirmedVideoEnd, setConfirmedVideoEnd] = useState<number | null>(null);
  const [isTrimConfirmed, setIsTrimConfirmed] = useState<boolean>(true);
  const [videoTrimLoop, setVideoTrimLoop] = useState<boolean>(true);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [previewTrimMode, setPreviewTrimMode] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [isUploadingAboutPhoto, setIsUploadingAboutPhoto] = useState<boolean>(false);

  const [isPhotoFormOpen, setIsPhotoFormOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoAspectRatio, setPhotoAspectRatio] = useState<"landscape" | "portrait">("landscape");
  const [photoFormData, setPhotoFormData] = useState({
    activity_id: "",
    title: "",
    image_url: "",
    sort_order: 1
  });

  const [settingsId, setSettingsId] = useState<string>("5c863138-dc2a-4d34-ad38-b6cc6cfcc6a7");

  const [settingsFormData, setSettingsFormData] = useState<Settings>({
    site_name: "",
    logo: "",
    whatsapp: "",
    accent_color: "#f6c374",
    updated_at: "",
    school_name: "",
    address: "",
    city: "",
    province: "",
    country: "",
    email: "",
    phone: "",
    tata_usaha: "",
    whatsapp_title: "",
    whatsapp_description: "",
    about_title: "",
    about_desc1: "",
    about_desc2: "",
    about_photo: "",
    vision_title: "",
    vision_content: "",
    missions: [],
    hero_label: "",
    hero_title: "",
    hero_description: "",
    hero_image: "",
    hero_video: "",
    hero_source: "auto",
    hero_activity_id: "",
    sections: [],
    enable_kegiatan_page: true,
    enable_foto_terbaru_page: true,
    homepage_gallery_limit: 6,
    homepage_gallery_photo_ids: [],
    slideshow_duration: 5,
    slideshow_transition: "Fade",
    slideshow_blur: 35,
    slideshow_source: "latest",
    slideshow_limit: 5,
    slideshow_gallery_ids: []
  });

  const [slideshowPreviewIndex, setSlideshowPreviewIndex] = useState(0);
  const [homepageGalleryActivityFilter, setHomepageGalleryActivityFilter] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedActivityForPhotos, setSelectedActivityForPhotos] = useState<string>("all");

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch site settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("id, school_name, address, email, phone, whatsapp, about, vision, mission, about_image, updated_at")
        .limit(1)
        .maybeSingle();

      let activeSet: Settings | null = null;
      if (settingsData) {
        setSettingsId(settingsData.id);
        let raw: any = {};
        if (settingsData.about_image) {
          try {
            raw = JSON.parse(settingsData.about_image);
          } catch (e) {
            console.error("Failed to parse settings JSON from about_image:", e);
          }
        }
        activeSet = {
          site_name: raw.site_name || "GALERI EMKA",
          logo: raw.logo || "",
          whatsapp: settingsData.whatsapp || raw.whatsapp || "628123456789",
          accent_color: raw.accent_color || "#f6c374",
          updated_at: settingsData.updated_at || raw.updated_at || new Date().toISOString(),
          school_name: settingsData.school_name || raw.school_name || "SMK Multi Karya",
          address: settingsData.address || raw.address || "Jl. SMK Multi Karya No. 45",
          city: raw.city || "Medan",
          province: raw.province || "Sumatera Utara",
          country: raw.country || "Indonesia",
          email: settingsData.email || raw.email || "info@multikarya.sch.id",
          phone: settingsData.phone || raw.phone || "(061) 1234567",
          tata_usaha: raw.tata_usaha || "Senin - Sabtu",
          whatsapp_title: raw.whatsapp_title || "Narahubung Cepat",
          whatsapp_description: raw.whatsapp_description || "Hubungi admin secara langsung melalui WhatsApp.",
          about_title: raw.about_title || "Mengabadikan Jejak, Mengukir Kenangan Sinematik",
          about_desc1: settingsData.about || raw.about_desc1 || "Galeri EMKA adalah wadah dokumentasi visual.",
          about_desc2: raw.about_desc2 || "Kami tidak hanya mengambil foto.",
          about_photo: raw.about_photo || "",
          vision_title: settingsData.vision || raw.vision_title || "Visi & Seni Visual",
          vision_content: raw.vision_content || "Menjadi pusat dokumentasi visual sekolah.",
          missions: (settingsData.mission ? settingsData.mission.split("\n") : null) || raw.missions || [],
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

      setActivities(mappedActivities);
      setPhotos(mappedPhotos);

      if (mappedActivities.length > 0) {
        setHomepageGalleryActivityFilter(prev => {
          if (prev.length > 0) return prev;
          const selectedPhotoIds = activeSet?.homepage_gallery_photo_ids || [];
          if (selectedPhotoIds.length > 0) {
            const actIds = mappedPhotos
              .filter(p => selectedPhotoIds.includes(p.id))
              .map(p => p.activity_id);
            return actIds.length > 0 ? Array.from(new Set(actIds)) : mappedActivities.map(a => a.id);
          }
          return mappedActivities.map(a => a.id);
        });
      }
      if (activeSet) {
        setSettings(activeSet);
        setSettingsFormData(activeSet);
      } else if (fallbackData.settings) {
        setSettings(fallbackData.settings as Settings);
        setSettingsFormData(fallbackData.settings as Settings);
      }
    } catch (err) {
      onShowToast("Kesalahan saat menyinkronkan data dengan Supabase.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Validation helpers
  const validateImageFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return "Format file gambar tidak didukung. Gunakan JPG, PNG, WEBP, GIF, atau AVIF.";
    }
    const maxSize = 100 * 1024 * 1024; // 100 MB as requested
    if (file.size > maxSize) {
      return "Ukuran gambar terlalu besar. Maksimal 100 MB.";
    }
    return null;
  };

  const validateVideoFile = (file: File): string | null => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['mp4', 'webm', 'mov'];
    if (!validTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
      return "Format file video tidak didukung. Gunakan MP4, WEBM, atau MOV.";
    }
    const maxSize = 100 * 1024 * 1024; // 100 MB
    if (file.size > maxSize) {
      return "Ukuran video terlalu besar. Maksimal 100 MB.";
    }
    return null;
  };

  // Supabase Storage upload helper with true error handling, session debugging, and YYYY folders
  const uploadFileToSupabase = async (file: File, folder: 'images' | 'videos'): Promise<string> => {
    const year = new Date().getFullYear();
    const fileExt = file.name.split('.').pop() || (folder === 'images' ? 'jpg' : 'mp4');
    const uniqueId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${year}/${uniqueId}-${safeName}`;

    // Debug session
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      const { data: refreshRes } = await supabase.auth.refreshSession();
      session = refreshRes?.session || null;
    }
    console.log('[SUPABASE SESSION]', session);

    console.log('[UPLOAD START]', {
      bucket: 'gallery',
      path: filePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      hasSession: !!session
    });

    const { data, error } = await supabase.storage
      .from('gallery')
      .upload(filePath, file, { 
        contentType: file.type,
        cacheControl: '3600', 
        upsert: false 
      });

    if (error) {
      console.error('[MEDIA UPLOAD ERROR]', {
        message: error.message,
        name: error.name,
        statusCode: (error as any).statusCode || (error as any).status,
        error
      });

      const statusCode = (error as any).statusCode || (error as any).status;
      let userMessage = error.message;

      if (statusCode === 403 || error.message?.includes('row-level security') || error.message?.includes('Policy')) {
        userMessage = "Masalah permission Storage (403 Unauthorized / RLS policy error). Pastikan policy Supabase Storage 'gallery' sudah diatur.";
      } else if (statusCode === 404 || error.message?.includes('Bucket not found')) {
        userMessage = "Bucket 'gallery' tidak ditemukan di Supabase Storage. Pastikan nama bucket adalah 'gallery'.";
      } else if (statusCode === 409) {
        userMessage = "File sudah ada di penyimpanan.";
      } else if (statusCode === 413 || error.message?.includes('Entity Too Large')) {
        userMessage = "Payload terlalu besar (maksimal 100 MB).";
      } else if (statusCode >= 500) {
        userMessage = "Server penyimpanan mengalami masalah (500).";
      } else if (!navigator.onLine) {
        userMessage = "Request upload gagal (Tidak ada koneksi internet).";
      } else {
        userMessage = `Gagal mengunggah media: ${error.message}`;
      }

      throw new Error(userMessage);
    }

    console.log('[UPLOAD SUCCESS]', data);

    const { data: { publicUrl } } = supabase.storage
      .from('gallery')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Cleanup object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      if (videoPreview && videoPreview.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
      if (photoPreview && photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [coverPreview, videoPreview, photoPreview]);

  // Handle Photo selection with immediate preview and ratio auto-detection
  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      onShowToast(err, "error");
      return;
    }

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setPhotoFile(file);
    setPhotoPreview(objectUrl);

    // Auto-detect image aspect ratio from dimensions
    const img = new Image();
    img.onload = () => {
      if (img.naturalHeight > img.naturalWidth) {
        setPhotoAspectRatio("portrait");
      } else {
        setPhotoAspectRatio("landscape");
      }
    };
    img.src = objectUrl;
  };

  // Activity CRUD
  const handleOpenAddActivity = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setEditingActivity(null);
    setActivityFormData({
      title: "",
      category: "Kegiatan Sekolah",
      date: new Date().toISOString().split("T")[0],
      description: "",
      google_drive_url: "",
      status: "draft"
    });
    setCoverFile(null);
    setCoverPreview("");
    setExistingCoverUrl("");
    setVideoFile(null);
    setVideoPreview("");
    setExistingVideoUrl("");
    setVideoTrimStart(0);
    setVideoTrimEnd(null);
    setConfirmedVideoStart(0);
    setConfirmedVideoEnd(null);
    setVideoTrimLoop(true);
    setIsTrimConfirmed(true);
    setVideoDuration(0);
    setPreviewTrimMode(false);
    setIsActivityFormOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setEditingActivity(act);
    setActivityFormData({
      title: act.title,
      category: act.category,
      date: act.date,
      description: act.description,
      google_drive_url: act.google_drive_url || "",
      status: act.status
    });
    setCoverFile(null);
    setCoverPreview("");
    setExistingCoverUrl(act.cover_image || "");
    setVideoFile(null);
    setVideoPreview("");
    setExistingVideoUrl(act.background_video || "");
    const startVal = act.background_video_start ?? 0;
    const endVal = act.background_video_end ?? null;
    setVideoTrimStart(startVal);
    setVideoTrimEnd(endVal);
    setConfirmedVideoStart(startVal);
    setConfirmedVideoEnd(endVal);
    setVideoTrimLoop(act.background_video_loop ?? true);
    setIsTrimConfirmed(true);
    setVideoDuration(0);
    setPreviewTrimMode(false);
    setIsActivityFormOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityFormData.title) {
      onShowToast("Judul kegiatan wajib diisi.", "error");
      return;
    }

    if (!existingCoverUrl && !coverFile) {
      onShowToast("Foto Utama / Cover wajib diunggah.", "error");
      return;
    }

    // Google Drive URL validation
    if (activityFormData.google_drive_url && activityFormData.google_drive_url.trim() !== "") {
      const gdriveUrl = activityFormData.google_drive_url.trim();
      try {
        new URL(gdriveUrl);
        if (!gdriveUrl.includes("drive.google.com/drive/folders/") && !gdriveUrl.includes("drive.google.com")) {
          onShowToast("Link Google Drive tidak valid. Silakan masukkan link folder Google Drive yang benar.", "error");
          return;
        }
      } catch (err) {
        onShowToast("Link Google Drive tidak valid. Silakan masukkan link folder Google Drive yang benar.", "error");
        return;
      }
    }

    setUploadLoading(true);
    try {
      let finalCoverUrl = existingCoverUrl;
      let finalVideoUrl = existingVideoUrl;

      if (coverFile) {
        setUploadStatusText("Mengunggah gambar...");
        finalCoverUrl = await uploadFileToSupabase(coverFile, 'images');
      }

      if (videoFile) {
        setUploadStatusText("Mengunggah video...");
        finalVideoUrl = await uploadFileToSupabase(videoFile, 'videos');
      }

      setUploadStatusText("Menyimpan data kegiatan...");
      const slug = activityFormData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      // 1. Retrieve & Validate Admin Session using official Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        onShowToast("Session admin tidak tersedia. Silakan login kembali.", "error");
        setUploadLoading(false);
        return;
      }

      const isValidUUID = (id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      };
      const isEditingExisting = editingActivity && isValidUUID(editingActivity.id);

      if (videoFile || existingVideoUrl) {
        const actualEnd = videoTrimEnd === null ? videoDuration : videoTrimEnd;
        const isSliderMoved = videoTrimStart > 0 || (actualEnd > 0 && actualEnd < videoDuration);
        if (isSliderMoved && !isTrimConfirmed) {
          onShowToast("Silakan konfirmasi trim video terlebih dahulu.", "error");
          setUploadLoading(false);
          return;
        }
      }

      const finalVideoStart = isTrimConfirmed ? confirmedVideoStart : videoTrimStart;
      const finalVideoEnd = isTrimConfirmed ? confirmedVideoEnd : videoTrimEnd;

      const payload = {
        p_id: isEditingExisting ? editingActivity.id : null,
        p_title: activityFormData.title,
        p_date: activityFormData.date || null,
        p_category: activityFormData.category || "Kegiatan Sekolah",
        p_description: activityFormData.description || "",
        p_cover_image: finalCoverUrl || "",
        p_background_image: "",
        p_background_video: finalVideoUrl || null,
        p_google_drive_url: activityFormData.google_drive_url || null,
        p_published: activityFormData.status === "published",
        p_featured: false,
        p_sort_order: 0,
        p_username: "ADMIN",
        p_pin: "1902",
        p_background_video_start: finalVideoStart,
        p_background_video_end: finalVideoEnd,
        p_background_video_loop: videoTrimLoop
      };

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_save_activity", payload);

      // RPC DEBUG (Step 5)
      console.log('[RPC DEBUG]', {
        functionName: 'admin_save_activity',
        errorMessage: rpcErr?.message || (rpcRes && !rpcRes.success ? rpcRes.message : null),
        errorCode: rpcErr?.code || null,
        errorDetails: rpcErr?.details || null,
        errorHint: rpcErr?.hint || null,
        success: rpcRes?.success
      });

      if (rpcErr || (rpcRes && !rpcRes.success)) {
        const rawErrorMsg = rpcErr?.message || rpcErr?.details || rpcRes?.message || "Kesalahan tidak diketahui.";
        console.error('[ADMIN SAVE] RPC error:', rpcErr || rpcRes);
        
        let displayError = rawErrorMsg;
        if (rawErrorMsg.includes("JWT expired") || rawErrorMsg.includes("session expired")) {
          displayError = "Session admin telah berakhir. Silakan login kembali.";
        } else if (rawErrorMsg.includes("Unauthorized") || rawErrorMsg.includes("Akses ditolak")) {
          displayError = "Session admin tidak tersedia. Silakan login kembali.";
        } else if (rawErrorMsg.includes("PIN salah") || rawErrorMsg.includes("Autentikasi admin gagal")) {
          displayError = "Username atau PIN (Password) salah.";
        } else if (rawErrorMsg.includes("permission denied") || rawErrorMsg.includes("row-level security") || rpcErr?.code === "42501") {
          displayError = "Akses database ditolak.";
        } else if (rawErrorMsg.includes("function not found")) {
          displayError = "Fungsi database tidak ditemukan (Function not found).";
        } else if (rawErrorMsg.includes("invalid input syntax for type uuid")) {
          displayError = "Format ID tidak valid (Invalid UUID).";
        }
        
        onShowToast(`Gagal menyimpan: ${displayError}`, "error");
      } else {
        console.log('ACTIVITY SAVED SUCCESSFULLY:', rpcRes?.data);
        onShowToast(
          isEditingExisting ? "Kegiatan berhasil diperbarui." : "Kegiatan baru berhasil ditambahkan.",
          "success"
        );
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setIsActivityFormOpen(false);
        sessionStorage.removeItem("emka_cached_activities");
        if (onRefreshData) onRefreshData();
        fetchData();
      }
    } catch (err: any) {
      onShowToast(err.message || "Tidak dapat mengunggah media. Periksa koneksi internet dan coba lagi.", "error");
    } finally {
      setUploadLoading(false);
      setUploadStatusText("");
    }
  };

  const handleConfirmDeleteActivity = async (activity: Activity) => {
    if (isDeletingActivity) return;
    setIsDeletingActivity(true);

    try {
      // 1. Auth session validation using official Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        onShowToast("Session admin tidak tersedia. Silakan login kembali.", "error");
        setIsDeletingActivity(false);
        setActivityToDelete(null);
        return;
      }

      // 2. Validate UUID (Requirement B & D)
      const id = activity.id;
      if (!isValidUUID(id)) {
        onShowToast("ID kegiatan tidak valid.", "error");
        setIsDeletingActivity(false);
        setActivityToDelete(null);
        return;
      }

      // 3. Fetch activity row to get exact media URLs
      let cover_image = activity.cover_image;
      let background_image = (activity as any).background_image;
      let background_video = activity.background_video;

      const { data: fetchRow } = await supabase
        .from("activities")
        .select("cover_image, background_image, background_video")
        .eq("id", id)
        .maybeSingle();

      if (fetchRow) {
        cover_image = fetchRow.cover_image || cover_image;
        background_image = fetchRow.background_image || background_image;
        background_video = fetchRow.background_video || background_video;
      }

      // 4. Extract storage object paths for 'gallery' bucket (Requirement B & C)
      const pathsToRemove: string[] = [];
      const coverPath = getStorageObjectPath(cover_image, 'gallery');
      const bgImagePath = getStorageObjectPath(background_image, 'gallery');
      const bgVideoPath = getStorageObjectPath(background_video, 'gallery');

      if (coverPath) pathsToRemove.push(coverPath);
      if (bgImagePath) pathsToRemove.push(bgImagePath);
      if (bgVideoPath) pathsToRemove.push(bgVideoPath);

      const uniquePaths = Array.from(new Set(pathsToRemove));

      if (uniquePaths.length > 0) {
        console.log('[DELETE ACTIVITY] Removing storage files:', uniquePaths);
        try {
          await supabase.storage.from('gallery').remove(uniquePaths);
        } catch (_) {}
      }

      // 5. Delete activity record from database via RPC admin_delete_activity
      let deleteSuccess = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_delete_activity", {
          p_username: "ADMIN",
          p_pin: "1902",
          p_id: id
        });
        if (!rpcErr && rpcRes && rpcRes.success !== false) {
          deleteSuccess = true;
        }
      } catch (err) {
        console.warn('[DELETE ACTIVITY] RPC failed, falling back to direct delete:', err);
      }

      if (!deleteSuccess) {
        const { error: dbErr } = await supabase
          .from("activities")
          .delete()
          .eq("id", id);

        if (dbErr) {
          console.error('[DELETE ACTIVITY] DB error:', dbErr);
          const errorMsg = dbErr.message || "";
          if (errorMsg.includes("permission") || errorMsg.includes("Policy") || dbErr.code === "42501") {
            onShowToast("Anda tidak memiliki izin untuk menghapus kegiatan ini.", "error");
          } else if (errorMsg.includes("invalid input syntax for type uuid")) {
            onShowToast("ID kegiatan tidak valid.", "error");
          } else {
            onShowToast("Gagal menghapus data kegiatan dari database.", "error");
          }
          setIsDeletingActivity(false);
          setActivityToDelete(null);
          return;
        }
      }

      // Clean up linked rows in activity_media & latest_photos if needed
      await supabase.from("activity_media").delete().eq("activity_id", id);
      await supabase.from("latest_photos").delete().eq("activity_id", id);

      onShowToast("Kegiatan dan media terkait berhasil dihapus.", "success");
      setActivityToDelete(null);
      setIsDeletingActivity(false);
      sessionStorage.removeItem("emka_cached_activities");
      if (onRefreshData) onRefreshData();
      fetchData();
    } catch (err: any) {
      console.error('[DELETE ACTIVITY] Exception:', err);
      onShowToast(err?.message || "Terjadi kesalahan saat menghapus kegiatan.", "error");
      setIsDeletingActivity(false);
      setActivityToDelete(null);
    }
  };

  // Photo CRUD
  const handleOpenAddPhoto = () => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setEditingPhoto(null);
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoAspectRatio("landscape");
    setPhotoFormData({
      activity_id: selectedActivityForPhotos !== "all" ? selectedActivityForPhotos : (activities[0]?.id || ""),
      title: "",
      image_url: "",
      sort_order: photos.filter(p => p.activity_id === selectedActivityForPhotos).length + 1
    });
    setIsPhotoFormOpen(true);
  };

  const handleOpenEditPhoto = (photo: Photo) => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setEditingPhoto(photo);
    setPhotoFile(null);
    setPhotoPreview(photo.image_url);
    const initialRatio = (photo.aspect_ratio === "portrait" || photo.aspect_ratio === "9:16") ? "portrait" : "landscape";
    setPhotoAspectRatio(initialRatio);
    setPhotoFormData({
      activity_id: photo.activity_id,
      title: photo.title,
      image_url: photo.image_url,
      sort_order: photo.sort_order
    });
    setIsPhotoFormOpen(true);
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFormData.activity_id) {
      onShowToast("Pilih Kegiatan terlebih dahulu.", "error");
      return;
    }

    if (!photoFile && !photoFormData.image_url && !photoPreview) {
      onShowToast("Silakan pilih berkas foto untuk diunggah.", "error");
      return;
    }

    // Ensure active Supabase Auth session before upload & insert
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      const { data: refreshRes } = await supabase.auth.refreshSession();
      session = refreshRes?.session || null;
    }

    if (!session || !session.user) {
      onShowToast("Session admin tidak tersedia atau telah kedaluwarsa. Silakan login kembali.", "error");
      return;
    }

    setUploadLoading(true);
    try {
      let finalImageUrl = photoFormData.image_url;

      // If user selected a new file, upload to Supabase Storage bucket 'gallery'
      if (photoFile) {
        finalImageUrl = await uploadFileToSupabase(photoFile, 'images');
      }

      if (!finalImageUrl) {
        throw new Error("URL Foto tidak valid.");
      }

      // Safe UUID generation
      const generateUUID = () => {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const isEditing = !!editingPhoto;
      const photoId = isEditing && isValidUUID(editingPhoto.id) ? editingPhoto.id : generateUUID();
      
      const baseDbRow: any = {
        activity_id: photoFormData.activity_id,
        type: "image",
        url: finalImageUrl,
        caption: photoFormData.title || "",
        sort_order: photoFormData.sort_order || 0
      };

      if (isEditing) {
        // Authenticated UPDATE
        const { error: updateErr } = await supabase
          .from("activity_media")
          .update({
            ...baseDbRow,
            aspect_ratio: photoAspectRatio
          })
          .eq("id", photoId);

        if (updateErr) {
          // Fallback if aspect_ratio column is not in remote schema
          const { error: fallbackUpdateErr } = await supabase
            .from("activity_media")
            .update(baseDbRow)
            .eq("id", photoId);

          if (fallbackUpdateErr) {
            throw new Error(fallbackUpdateErr.message || "Gagal memperbarui foto di database.");
          }
        }
      } else {
        // Authenticated INSERT
        const insertPayload = {
          id: photoId,
          ...baseDbRow,
          aspect_ratio: photoAspectRatio
        };

        const { error: insertErr } = await supabase
          .from("activity_media")
          .insert(insertPayload);

        if (insertErr) {
          // Fallback if aspect_ratio column is not in remote schema
          const { error: fallbackInsertErr } = await supabase
            .from("activity_media")
            .insert({
              id: photoId,
              ...baseDbRow
            });

          if (fallbackInsertErr) {
            throw new Error(fallbackInsertErr.message || "Gagal menyimpan foto ke database.");
          }
        }
      }

      // Also upsert to latest_photos table if available (non-blocking)
      try {
        const latestRow = {
          id: photoId,
          image_url: finalImageUrl,
          caption: photoFormData.title || "",
          activity_id: photoFormData.activity_id,
          sort_order: photoFormData.sort_order || 0,
          published: true
        };
        await supabase.from("latest_photos").upsert(latestRow);
      } catch (_) {
        // Silently ignore if latest_photos table is not active
      }

      // Instantly update local state
      const updatedPhotoItem: Photo = {
        id: photoId,
        activity_id: photoFormData.activity_id,
        title: photoFormData.title || "",
        image_url: finalImageUrl,
        sort_order: photoFormData.sort_order || 0,
        aspect_ratio: photoAspectRatio,
        created_at: editingPhoto ? editingPhoto.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setPhotos(prev => {
        const existingIdx = prev.findIndex(p => p.id === photoId);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = updatedPhotoItem;
          return copy;
        }
        return [...prev, updatedPhotoItem];
      });

      onShowToast(
        editingPhoto ? "Detail foto berhasil diperbarui." : "Foto berhasil diunggah dan disimpan ke kegiatan.",
        "success"
      );

      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(null);
      setPhotoPreview("");
      setIsPhotoFormOpen(false);
      if (onRefreshData) onRefreshData();
      fetchData();
    } catch (err: any) {
      console.error("[SAVE PHOTO ERROR]", err);
      onShowToast(err.message || "Terjadi kesalahan saat memproses foto.", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm("Hapus foto ini?")) return;

    // Ensure session
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      const { data: refreshRes } = await supabase.auth.refreshSession();
      session = refreshRes?.session || null;
    }

    if (!session || !session.user) {
      onShowToast("Session admin tidak tersedia. Silakan login kembali.", "error");
      return;
    }

    try {
      const photoToDelete = photos.find(p => p.id === id);

      const { error } = await supabase
        .from("activity_media")
        .delete()
        .eq("id", id);

      if (error) {
        onShowToast(error.message || "Gagal menghapus foto.", "error");
        return;
      }

      try {
        await supabase.from("latest_photos").delete().eq("id", id);
      } catch (_) {}

      // Try removing from storage bucket 'gallery'
      if (photoToDelete?.image_url) {
        const storagePath = getStorageObjectPath(photoToDelete.image_url, 'gallery');
        if (storagePath) {
          try {
            await supabase.storage.from('gallery').remove([storagePath]);
          } catch (_) {}
        }
      }

      onShowToast("Foto berhasil dihapus.", "success");
      if (onRefreshData) onRefreshData();
      fetchData();
    } catch (err) {
      onShowToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Reordering handler
  const handleMovePhoto = async (photo: Photo, direction: "up" | "down") => {
    // Ensure session
    let { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      const { data: refreshRes } = await supabase.auth.refreshSession();
      session = refreshRes?.session || null;
    }

    if (!session || !session.user) {
      onShowToast("Session admin tidak tersedia. Silakan login kembali.", "error");
      return;
    }

    const activityPhotos = photos.filter(p => p.activity_id === photo.activity_id).sort((a, b) => a.sort_order - b.sort_order);
    const index = activityPhotos.findIndex(p => p.id === photo.id);

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === activityPhotos.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const targetPhoto = activityPhotos[swapIndex];

    const updatedOrders = [
      { id: photo.id, sort_order: targetPhoto.sort_order },
      { id: targetPhoto.id, sort_order: photo.sort_order }
    ];

    try {
      for (const order of updatedOrders) {
        await supabase
          .from("activity_media")
          .update({ sort_order: order.sort_order })
          .eq("id", order.id);

        try {
          await supabase
            .from("latest_photos")
            .update({ sort_order: order.sort_order })
            .eq("id", order.id);
        } catch (_) {}
      }

      onShowToast("Urutan foto berhasil diubah.", "success");
      if (onRefreshData) onRefreshData();
      fetchData();
    } catch (err) {
      onShowToast("Gagal menyimpan perubahan urutan.", "error");
    }
  };

  const handleSetCoverImage = async (photo: Photo) => {
    try {
      const { error } = await supabase
        .from("activities")
        .update({ cover_image: photo.image_url })
        .eq("id", photo.activity_id);

      if (error) {
        onShowToast(error.message || "Gagal mengatur cover kegiatan.", "error");
      } else {
        onShowToast("Foto ini berhasil dijadikan Cover Utama kegiatan.", "success");
        fetchData();
      }
    } catch (err) {
      onShowToast("Kesalahan koneksi.", "error");
    }
  };

  // Section layout management helpers
  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const updatedSections = [...settingsFormData.sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = updatedSections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === updatedSections.length - 1) return;
    
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const temp = updatedSections[idx].sort_order;
    updatedSections[idx].sort_order = updatedSections[swapIdx].sort_order;
    updatedSections[swapIdx].sort_order = temp;
    
    setSettingsFormData(prev => ({
      ...prev,
      sections: updatedSections
    }));
  };

  const handleResetLayout = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menyetel ulang tata letak beranda ke konfigurasi bawaan sekolah?")) return;
    try {
      const defaultSettings = fallbackData.settings;
      
      const payload = {
        p_school_name: defaultSettings.school_name,
        p_address: defaultSettings.address,
        p_email: defaultSettings.email,
        p_phone: defaultSettings.phone,
        p_whatsapp: defaultSettings.whatsapp,
        p_about: defaultSettings.about_desc1,
        p_vision: defaultSettings.vision_title,
        p_mission: defaultSettings.missions.join("\n"),
        p_about_image: JSON.stringify(defaultSettings)
      };

      let saveError = null;
      let rpcSucceeded = false;

      // 1. Try secure SECURITY DEFINER RPC helper first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_save_settings", payload);
        if (!rpcErr && rpcRes && rpcRes.success) {
          rpcSucceeded = true;
        } else if (rpcErr && rpcErr.message && !rpcErr.message.includes("does not exist")) {
          saveError = rpcErr.message;
        } else if (rpcRes && !rpcRes.success) {
          saveError = rpcRes.message;
        }
      } catch (e) {
        console.warn("RPC admin_save_settings not available, falling back to direct update:", e);
      }

      // 2. Fallback to direct update using correct columns if RPC is not available or has not been run yet
      if (!rpcSucceeded && !saveError) {
        const dbRow = {
          school_name: defaultSettings.school_name,
          address: defaultSettings.address,
          email: defaultSettings.email,
          phone: defaultSettings.phone,
          whatsapp: defaultSettings.whatsapp,
          about: defaultSettings.about_desc1,
          vision: defaultSettings.vision_title,
          mission: defaultSettings.missions.join("\n"),
          about_image: JSON.stringify(defaultSettings),
          updated_at: new Date().toISOString()
        };

        const { error: updErr } = await supabase
          .from("site_settings")
          .update(dbRow)
          .eq("id", settingsId);

        if (updErr) {
          saveError = updErr.message;
        }
      }

      if (saveError) {
        onShowToast(saveError || "Gagal menyetel ulang tata letak.", "error");
      } else {
        onShowToast("Tata letak beranda berhasil disetel ulang ke konfigurasi bawaan.", "success");
        fetchData();
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        p_school_name: settingsFormData.school_name,
        p_address: settingsFormData.address,
        p_email: settingsFormData.email,
        p_phone: settingsFormData.phone,
        p_whatsapp: settingsFormData.whatsapp,
        p_about: settingsFormData.about_desc1,
        p_vision: settingsFormData.vision_title,
        p_mission: settingsFormData.missions.join("\n"),
        p_about_image: JSON.stringify(settingsFormData)
      };

      let saveError = null;
      let rpcSucceeded = false;

      // 1. Try secure SECURITY DEFINER RPC helper first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_save_settings", payload);
        if (!rpcErr && rpcRes && rpcRes.success) {
          rpcSucceeded = true;
        } else if (rpcErr && rpcErr.message && !rpcErr.message.includes("does not exist")) {
          saveError = rpcErr.message;
        } else if (rpcRes && !rpcRes.success) {
          saveError = rpcRes.message;
        }
      } catch (e) {
        console.warn("RPC admin_save_settings not available, falling back to direct update:", e);
      }

      // 2. Fallback to direct update using correct columns if RPC is not available or has not been run yet
      if (!rpcSucceeded && !saveError) {
        const dbRow = {
          school_name: settingsFormData.school_name,
          address: settingsFormData.address,
          email: settingsFormData.email,
          phone: settingsFormData.phone,
          whatsapp: settingsFormData.whatsapp,
          about: settingsFormData.about_desc1,
          vision: settingsFormData.vision_title,
          mission: settingsFormData.missions.join("\n"),
          about_image: JSON.stringify(settingsFormData),
          updated_at: new Date().toISOString()
        };

        const { error: updErr } = await supabase
          .from("site_settings")
          .update(dbRow)
          .eq("id", settingsId);

        if (updErr) {
          saveError = updErr.message;
        }
      }

      if (saveError) {
        onShowToast(saveError || "Gagal menyimpan pengaturan.", "error");
      } else {
        onShowToast("Pengaturan sistem berhasil disimpan.", "success");
        fetchData();
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Calculated Stats
  const stats: DashboardStats = {
    totalActivities: activities.length,
    totalPhotos: photos.length,
    totalVideos: activities.filter(act => !!act.background_video).length,
    latestActivity: activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  };

  const filteredPhotosForList = selectedActivityForPhotos === "all"
    ? photos
    : photos.filter(p => p.activity_id === selectedActivityForPhotos);

  // Group photos by activity name
  const getActTitle = (id: string) => activities.find(a => a.id === id)?.title || "Tidak Diketahui";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#110e09] flex items-center justify-center text-[#eae1d8]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#f6c374]" />
          <p className="font-body text-xs text-[#9b8f7f]">Memuat Dashboard Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#110e09] text-[#eae1d8] flex flex-col md:flex-row">
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#17130e] border-r border-[#4f4538]/15 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo / Title */}
          <div>
            <h1 className="font-display text-lg font-extrabold text-[#f6c374] tracking-wider uppercase">
              {settings?.site_name || "EMKA ADMIN"}
            </h1>
            <p className="font-body text-[10px] text-[#9b8f7f] uppercase tracking-widest mt-1">
              Sistem Kontrol Galeri
            </p>
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm font-subheading text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:bg-[#39342e]/30 hover:text-[#eae1d8]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Ikhtisar
            </button>

            <button
              onClick={() => setActiveTab("activities")}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm font-subheading text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === "activities"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:bg-[#39342e]/30 hover:text-[#eae1d8]"
              }`}
            >
              <Calendar className="w-4 h-4" /> Kegiatan
            </button>

            <button
              onClick={() => setActiveTab("photos")}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm font-subheading text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === "photos"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:bg-[#39342e]/30 hover:text-[#eae1d8]"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Foto & Media
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm font-subheading text-xs tracking-widest uppercase transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#d8a85c] text-[#110e09] font-bold"
                  : "text-[#d3c4b3] hover:bg-[#39342e]/30 hover:text-[#eae1d8]"
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> Pengaturan
            </button>
          </nav>
        </div>

        {/* Logout Bottom */}
        <div className="pt-6 border-t border-[#4f4538]/20 mt-8">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-sm font-subheading text-xs tracking-widest uppercase text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Keluar Sesi
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto space-y-12 max-w-6xl">
        
        {/* --- TAB 1: DASHBOARD OVERVIEW --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-10">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#eae1d8]">
                Panel Ikhtisar
              </h2>
              <p className="font-body text-xs text-[#9b8f7f]">
                Statistik umum konten website publik yang terintegrasi.
              </p>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-sm flex items-center justify-between border border-[#4f4538]/15">
                <div>
                  <p className="font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                    Total Kegiatan
                  </p>
                  <p className="font-display text-4xl font-extrabold text-[#f6c374] mt-2">
                    {stats.totalActivities}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f6c374]/10 flex items-center justify-center text-[#f6c374]">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="glass-panel p-6 rounded-sm flex items-center justify-between border border-[#4f4538]/15">
                <div>
                  <p className="font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                    Total Arsip Foto
                  </p>
                  <p className="font-display text-4xl font-extrabold text-[#f6c374] mt-2">
                    {stats.totalPhotos}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f6c374]/10 flex items-center justify-center text-[#f6c374]">
                  <ImageIcon className="w-6 h-6" />
                </div>
              </div>

              <div className="glass-panel p-6 rounded-sm flex items-center justify-between border border-[#4f4538]/15">
                <div>
                  <p className="font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                    Background Video
                  </p>
                  <p className="font-display text-4xl font-extrabold text-[#f6c374] mt-2">
                    {stats.totalVideos}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f6c374]/10 flex items-center justify-center text-[#f6c374]">
                  <Upload className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Recent Activity Mini table */}
            <div className="glass-panel p-6 rounded-sm border border-[#4f4538]/15 space-y-6">
              <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                Kegiatan Terbaru
              </h3>
              
              {activities.length === 0 ? (
                <p className="text-sm font-body text-[#9b8f7f]">Belum ada kegiatan apapun.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body text-xs text-[#eae1d8]">
                    <thead>
                      <tr className="border-b border-[#4f4538]/20 text-[#9b8f7f] uppercase font-subheading tracking-wider">
                        <th className="py-3">Cover</th>
                        <th className="py-3">Nama Kegiatan</th>
                        <th className="py-3">Kategori</th>
                        <th className="py-3">Tanggal</th>
                        <th className="py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#4f4538]/10">
                      {activities.slice(0, 5).map(act => (
                        <tr key={act.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 pr-4">
                            <img src={act.cover_image} alt="Cover" className="w-12 h-8 object-cover rounded-sm border border-[#4f4538]/20" referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-3 font-semibold pr-4">{act.title}</td>
                          <td className="py-3 text-[#d3c4b3] pr-4">{act.category}</td>
                          <td className="py-3 text-[#9b8f7f] pr-4">{act.date}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 text-[9px] font-subheading tracking-widest uppercase rounded-sm border ${
                              act.status === "published"
                                ? "bg-[#f6c374]/10 text-[#f6c374] border-[#f6c374]/30"
                                : "bg-neutral-800 text-neutral-400 border-neutral-700"
                            }`}>
                              {act.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: ACTIVITIES MANAGEMENT --- */}
        {activeTab === "activities" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#eae1d8]">
                  Manajemen Kegiatan
                </h2>
                <p className="font-body text-xs text-[#9b8f7f]">
                  Buat, edit, dan atur detail kegiatan publik beserta cover utama.
                </p>
              </div>

              <button
                onClick={handleOpenAddActivity}
                className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-[11px] tracking-widest uppercase px-5 py-3 rounded-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" /> Tambah Kegiatan
              </button>
            </div>

            {/* List Table */}
            <div className="glass-panel rounded-sm border border-[#4f4538]/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body text-xs text-[#eae1d8]">
                  <thead>
                    <tr className="border-b border-[#4f4538]/20 text-[#9b8f7f] uppercase font-subheading tracking-wider bg-[#17130e]/80">
                      <th className="py-4 px-6">Cover</th>
                      <th className="py-4 px-6">Judul Kegiatan</th>
                      <th className="py-4 px-6">Kategori</th>
                      <th className="py-4 px-6">Tanggal</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#4f4538]/10">
                    {activities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-[#9b8f7f]">
                          Belum ada kegiatan ditambahkan. Klik tombol diatas untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      activities.map(act => (
                        <tr key={act.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <img src={act.cover_image} alt="Cover" className="w-16 h-10 object-cover rounded-sm border border-[#4f4538]/20" referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-4 px-6 font-semibold">
                            <div className="space-y-1">
                              <span className="block text-sm">{act.title}</span>
                              <span className="text-[10px] text-[#9b8f7f] block font-mono">/{act.slug}</span>
                              <div className="text-[10px] mt-1 font-normal">
                                {act.google_drive_url ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    Google Drive: ✓ Terhubung
                                  </span>
                                ) : (
                                  <span className="text-[#9b8f7f]">
                                    Google Drive: Belum ditambahkan
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[#d3c4b3]">{act.category}</td>
                          <td className="py-4 px-6 text-[#9b8f7f]">{act.date}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 text-[9px] font-subheading tracking-widest uppercase rounded-sm border ${
                              act.status === "published"
                                ? "bg-[#f6c374]/10 text-[#f6c374] border-[#f6c374]/30"
                                : "bg-neutral-800 text-neutral-400 border-neutral-700"
                            }`}>
                              {act.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditActivity(act)}
                                className="p-2 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-colors"
                                title="Edit Detail"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setActivityToDelete(act)}
                                className="p-2 border border-[#4f4538]/30 hover:border-red-500 hover:text-red-400 rounded transition-colors"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: PHOTOS & MEDIA MANAGEMENT --- */}
        {activeTab === "photos" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#eae1d8]">
                  Arsip Foto & Media
                </h2>
                <p className="font-body text-xs text-[#9b8f7f]">
                  Tambahkan, urutkan (sort), jadikan cover utama, atau hapus foto kegiatan.
                </p>
              </div>

              <button
                onClick={handleOpenAddPhoto}
                className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-[11px] tracking-widest uppercase px-5 py-3 rounded-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" /> Tambah Foto Baru
              </button>
            </div>

            {/* Filter Group Selector */}
            <div className="flex items-center gap-3 bg-[#17130e] p-3 border border-[#4f4538]/15 rounded-sm">
              <span className="font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f] pl-2">
                Saring Berdasarkan Kegiatan:
              </span>
              <select
                value={selectedActivityForPhotos}
                onChange={(e) => setSelectedActivityForPhotos(e.target.value)}
                className="bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-1.5 px-3 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
              >
                <option value="all">Semua Kegiatan</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>{act.title}</option>
                ))}
              </select>
            </div>

            {/* Photos List View Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPhotosForList.length === 0 ? (
                <div className="col-span-full text-center py-24 text-[#9b8f7f] font-body text-xs bg-[#17130e] border border-[#4f4538]/15 rounded-sm">
                  Tidak ada foto ditambahkan untuk penyaringan kegiatan ini. Klik "Tambah Foto Baru" diatas.
                </div>
              ) : (
                filteredPhotosForList.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="glass-panel rounded-sm border border-[#4f4538]/15 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[4/3] w-full overflow-hidden relative">
                      <img src={photo.image_url} alt="Photo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      
                      {/* Sort order Badge */}
                      <span className="absolute top-3 left-3 bg-[#110e09]/80 backdrop-blur border border-[#4f4538]/30 text-xs font-mono px-2 py-1 rounded text-[#f6c374]">
                        Sort: {photo.sort_order}
                      </span>

                      {/* Cover Stamp if it is used as active activity cover */}
                      {activities.some(act => act.id === photo.activity_id && act.cover_image === photo.image_url) && (
                        <span className="absolute top-3 right-3 bg-[#f6c374] text-[#110e09] font-subheading text-[8px] tracking-wider uppercase px-2 py-1 rounded font-bold">
                          Cover Utama
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="p-4 flex-1 space-y-2">
                      <p className="font-subheading text-[10px] tracking-widest text-[#f6c374] uppercase truncate">
                        {getActTitle(photo.activity_id)}
                      </p>
                      <h4 className="font-display text-sm font-bold text-[#eae1d8] line-clamp-1">
                        {photo.title || "Tanpa Judul"}
                      </h4>
                    </div>

                    {/* Control Row actions */}
                    <div className="p-4 border-t border-[#4f4538]/15 bg-[#17130e]/40 flex items-center justify-between gap-2">
                      {/* Left: Reorder up / down within group */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleMovePhoto(photo, "up")}
                          className="p-1.5 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-colors"
                          title="Pindahkan Atas"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMovePhoto(photo, "down")}
                          className="p-1.5 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-colors"
                          title="Pindahkan Bawah"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right: Cover, Edit, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetCoverImage(photo)}
                          className="px-2 py-1 text-[9px] font-subheading uppercase tracking-widest border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-all"
                          title="Jadikan Cover Utama Kegiatan"
                        >
                          Cover
                        </button>
                        <button
                          onClick={() => handleOpenEditPhoto(photo)}
                          className="p-1.5 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-colors"
                          title="Edit Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="p-1.5 border border-[#4f4538]/30 hover:border-red-500 hover:text-red-400 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: SETTINGS --- */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-[#eae1d8]">
                Pengaturan Sistem Website
              </h2>
              <p className="font-body text-xs text-[#9b8f7f]">
                Kelola identitas, visual, misi, dan urutan layout beranda publik secara real-time.
              </p>
            </div>

            {/* Sub Tabs Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-[#4f4538]/20 pb-4 font-subheading text-[10px] tracking-widest uppercase">
              <button
                type="button"
                onClick={() => setSettingsSubTab("school")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "school"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Identitas Sekolah
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("hero")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "hero"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Hero Header
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("about")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "about"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Tentang Kami
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("vision")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "vision"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Visi & Misi
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("sections")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "sections"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Tata Letak Beranda
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab("copyright")}
                className={`py-2 px-4 rounded-sm border transition-all cursor-pointer ${
                  settingsSubTab === "copyright"
                    ? "bg-[#f6c374] text-[#110e09] border-[#f6c374] font-bold"
                    : "border-[#4f4538]/30 text-[#9b8f7f] hover:text-[#eae1d8] hover:border-[#eae1d8]"
                }`}
              >
                Pengaturan Copyright
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="glass-panel p-6 sm:p-8 rounded-sm border border-[#4f4538]/15 space-y-8">
              
              {/* SUB TAB: Identitas Sekolah */}
              {settingsSubTab === "school" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-bold text-[#f6c374] border-b border-[#4f4538]/10 pb-2">
                    Informasi & Identitas Sekolah
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Nama Website (Site Name)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.site_name}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, site_name: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Nama Sekolah Resmi
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.school_name}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, school_name: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        URL/Tautan Gambar Logo Website (Kosongkan jika ingin memakai teks biasa)
                      </label>
                      <input
                        type="text"
                        value={settingsFormData.logo}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, logo: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Alamat Kampus Lengkap
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.address}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.city}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Provinsi
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.province}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, province: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Negara
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.country}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Surel / Email Resmi
                      </label>
                      <input
                        type="email"
                        required
                        value={settingsFormData.email}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Nomor Telepon Kantor
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.phone}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Jam Operasional Tata Usaha
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.tata_usaha}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, tata_usaha: e.target.value }))}
                        placeholder="Contoh: Senin - Sabtu (08:00 - 15:00)"
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Aksen Warna Website (Hex)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={settingsFormData.accent_color}
                          onChange={(e) => setSettingsFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="w-10 h-10 border-0 bg-transparent rounded cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          required
                          value={settingsFormData.accent_color}
                          onChange={(e) => setSettingsFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2 px-3 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2 border-t border-[#4f4538]/10 pt-4 mt-2">
                      <h4 className="font-display text-sm font-bold text-[#f6c374] mb-3">Narahubung Cepat WhatsApp</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Nomor WhatsApp Hubungi Admin (Gunakan kode negara, tanpa +)
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.whatsapp}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="Contoh: 628123456789"
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Judul Panel WhatsApp
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.whatsapp_title}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, whatsapp_title: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Deskripsi Panel WhatsApp
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={settingsFormData.whatsapp_description}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, whatsapp_description: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2 px-3 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors resize-none"
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* SUB TAB: Hero Header */}
              {settingsSubTab === "hero" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-bold text-[#f6c374] border-b border-[#4f4538]/10 pb-2">
                    Hero Header Carousel Beranda
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f] block">
                        Mode Tampilan Hero
                      </label>
                      <select
                        value={settingsFormData.hero_source}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_source: e.target.value as "auto" | "manual" }))}
                        className="bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs focus:outline-none focus:border-[#f6c374]"
                      >
                        <option value="auto">Siklus Otomatis (Menggunakan Seluruh Kegiatan Published)</option>
                        <option value="manual">Sorotan Manual (Satu Konten Kustom Pilihan Admin)</option>
                      </select>
                      <p className="text-[10px] text-[#9b8f7f] leading-relaxed">
                        <strong>Mode Otomatis:</strong> Slider akan berputar bergantian menampilkan seluruh arsip kegiatan yang telah Anda publikasikan.<br />
                        <strong>Sorotan Manual:</strong> Slider dikunci hanya menampilkan satu banner sorotan kustom yang Anda atur secara spesifik di bawah.
                      </p>
                    </div>

                    {settingsFormData.hero_source === "manual" && (
                      <div className="p-5 bg-[#110e09]/40 border border-[#4f4538]/20 rounded-sm space-y-4">
                        <h4 className="font-subheading text-xs uppercase tracking-widest text-[#f6c374] font-bold">Override Konten Sorotan Manual</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">Judul Kategori Eyebrow</label>
                            <input
                              type="text"
                              value={settingsFormData.hero_label || ""}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_label: e.target.value }))}
                              placeholder="Contoh: KEGIATAN UTAMA"
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs focus:outline-none focus:border-[#f6c374]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">Kaitkan ke Kegiatan Publik (Opsional)</label>
                            <select
                              value={settingsFormData.hero_activity_id || ""}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_activity_id: e.target.value }))}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs"
                            >
                              <option value="">-- Tanpa Tautan (Hanya Tampilan Visual) --</option>
                              {activities.map(act => (
                                <option key={act.id} value={act.id}>{act.title}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1 col-span-1 md:col-span-2">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">Judul Sorotan Utama</label>
                            <input
                              type="text"
                              value={settingsFormData.hero_title}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs focus:outline-none focus:border-[#f6c374]"
                            />
                          </div>

                          <div className="space-y-1 col-span-1 md:col-span-2">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">Deskripsi Naratif Sorotan</label>
                            <textarea
                              rows={2}
                              value={settingsFormData.hero_description}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_description: e.target.value }))}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs focus:outline-none focus:border-[#f6c374] resize-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">URL Gambar Latar Belakang (Backdrop Image)</label>
                            <input
                              type="text"
                              value={settingsFormData.hero_image || ""}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_image: e.target.value }))}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">URL Video Latar Belakang (Looping .mp4)</label>
                            <input
                              type="text"
                              value={settingsFormData.hero_video || ""}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, hero_video: e.target.value }))}
                              placeholder="https://example.com/loop.mp4"
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB TAB: Tentang Kami */}
              {settingsSubTab === "about" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-bold text-[#f6c374] border-b border-[#4f4538]/10 pb-2">
                    Tentang Kami & Filosofi Sekolah
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Judul Utama Section Tentang Kami
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.about_title}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, about_title: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Paragraf Deskripsi Utama 1
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={settingsFormData.about_desc1}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, about_desc1: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-3 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Paragraf Deskripsi Pendukung 2
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={settingsFormData.about_desc2}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, about_desc2: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-3 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Foto Filosofi / Pendukung
                      </label>
                      
                      {settingsFormData.about_photo ? (
                        <div className="space-y-3">
                          <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded border border-[#4f4538]/30 bg-[#110e09]">
                            <img
                              src={settingsFormData.about_photo}
                              alt="Foto Filosofi / Pendukung"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {isUploadingAboutPhoto && (
                              <div className="absolute inset-0 bg-[#110e09]/80 flex items-center justify-center">
                                <span className="text-xs text-[#f6c374] animate-pulse">Mengunggah...</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <label className="cursor-pointer py-1.5 px-3 bg-[#4f4538]/20 hover:bg-[#4f4538]/40 text-[#eae1d8] rounded border border-[#4f4538]/30 font-subheading text-[10px] uppercase tracking-wider transition-colors inline-block">
                              Ganti Foto
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                                disabled={isUploadingAboutPhoto}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const err = validateImageFile(file);
                                  if (err) {
                                    onShowToast(err, "error");
                                    return;
                                  }
                                  setIsUploadingAboutPhoto(true);
                                  try {
                                    const publicUrl = await uploadFileToSupabase(file, "images");
                                    setSettingsFormData(prev => ({ ...prev, about_photo: publicUrl }));
                                    onShowToast("Foto berhasil diunggah ke Supabase Storage.", "success");
                                  } catch (err: any) {
                                    onShowToast(err.message || "Gagal mengunggah foto.", "error");
                                  } finally {
                                    setIsUploadingAboutPhoto(false);
                                  }
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={isUploadingAboutPhoto}
                              onClick={() => {
                                setSettingsFormData(prev => ({ ...prev, about_photo: "" }));
                                onShowToast("Foto dihapus. Klik Simpan untuk memperbarui.", "success");
                              }}
                              className="py-1.5 px-3 bg-red-950/40 hover:bg-red-950/60 text-red-200 rounded border border-red-900/30 font-subheading text-[10px] uppercase tracking-wider transition-colors"
                            >
                              Hapus Foto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-md">
                          <label className={`flex flex-col items-center justify-center aspect-[16/9] w-full border-2 border-dashed rounded-sm cursor-pointer transition-colors ${
                            isUploadingAboutPhoto 
                              ? "border-[#f6c374] bg-[#f6c374]/5" 
                              : "border-[#4f4538]/30 bg-[#110e09] hover:border-[#4f4538]/50 hover:bg-[#4f4538]/5"
                          }`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-2 px-4 text-center">
                              {isUploadingAboutPhoto ? (
                                <span className="text-xs text-[#f6c374] animate-pulse font-body">Mengunggah file ke Supabase...</span>
                              ) : (
                                <>
                                  <div className="text-xs text-[#9b8f7f] font-body">
                                    Klik untuk memilih foto <span className="underline">atau seret file ke sini</span>
                                  </div>
                                  <div className="text-[10px] text-[#9b8f7f]/70 uppercase tracking-widest font-subheading">
                                    JPG, PNG, WEBP, GIF, AVIF — Maks. 100MB
                                  </div>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                              disabled={isUploadingAboutPhoto}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const err = validateImageFile(file);
                                if (err) {
                                  onShowToast(err, "error");
                                  return;
                                }
                                setIsUploadingAboutPhoto(true);
                                try {
                                  const publicUrl = await uploadFileToSupabase(file, "images");
                                  setSettingsFormData(prev => ({ ...prev, about_photo: publicUrl }));
                                  onShowToast("Foto berhasil diunggah ke Supabase Storage.", "success");
                                } catch (err: any) {
                                  onShowToast(err.message || "Gagal mengunggah foto.", "error");
                                } finally {
                                  setIsUploadingAboutPhoto(false);
                                }
                                e.target.value = "";
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: Visi & Misi */}
              {settingsSubTab === "vision" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-bold text-[#f6c374] border-b border-[#4f4538]/10 pb-2">
                    Visi & Misi Sekolah
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Judul Visi Sekolah
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.vision_title}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, vision_title: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Isi Konten Visi Utama
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={settingsFormData.vision_content}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, vision_content: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-3 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f] font-bold">
                          Daftar Misi Sekolah
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsFormData(prev => ({ ...prev, missions: [...prev.missions, ""] }));
                          }}
                          className="border border-[#f6c374] text-[#f6c374] hover:bg-[#f6c374]/10 font-subheading text-[9px] tracking-widest uppercase py-1.5 px-3 rounded transition-colors cursor-pointer"
                        >
                          + Tambah Baris Misi
                        </button>
                      </div>

                      <div className="space-y-2 mt-2">
                        {settingsFormData.missions.map((mission, mIdx) => (
                          <div key={mIdx} className="flex gap-2 items-center">
                            <span className="text-[#f6c374] font-mono text-xs">0{mIdx + 1}.</span>
                            <input
                              type="text"
                              required
                              value={mission}
                              onChange={(e) => {
                                const updatedMissions = [...settingsFormData.missions];
                                updatedMissions[mIdx] = e.target.value;
                                setSettingsFormData(prev => ({ ...prev, missions: updatedMissions }));
                              }}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2 px-3 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updatedMissions = settingsFormData.missions.filter((_, idx) => idx !== mIdx);
                                setSettingsFormData(prev => ({ ...prev, missions: updatedMissions }));
                              }}
                              className="p-2 border border-[#4f4538]/30 hover:border-red-500 hover:text-red-400 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {settingsFormData.missions.length === 0 && (
                          <p className="text-[11px] text-[#9b8f7f] italic py-3 text-center">Belum ada butir misi yang ditambahkan.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: Tata Letak Beranda (Sections manager) */}
              {settingsSubTab === "sections" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#4f4538]/10 pb-2">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#f6c374]">
                        Manajemen Urutan & Penataan Section
                      </h3>
                      <p className="text-[10px] text-[#9b8f7f]">
                        Atur urutan tampil, aktifkan/nonaktifkan modul, dan setel batas tampilan di website utama.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      className="border border-red-500/40 text-red-400 hover:bg-red-500/10 font-subheading text-[9px] tracking-widest uppercase py-1.5 px-3 rounded transition-colors cursor-pointer"
                    >
                      Reset Ke Tata Letak Bawaan
                    </button>
                  </div>

                  {/* Dedicated Page Toggles Panel */}
                  <div className="bg-[#1c160e] border border-[#f6c374]/15 rounded p-5 space-y-4">
                    <div>
                      <h4 className="font-display text-sm font-bold text-[#f6c374]">
                        Status Aktif Halaman Utama (Global Page Settings)
                      </h4>
                      <p className="text-[10px] text-[#9b8f7f] mt-1 leading-relaxed">
                        Tentukan apakah rute halaman publik utama diaktifkan. Jika dinonaktifkan, rute halaman tersebut tidak dapat diakses dan tombol navigasinya akan disembunyikan secara otomatis.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="flex items-center justify-between p-4 bg-[#110e09]/80 border border-[#4f4538]/20 rounded">
                        <div>
                          <span className="block font-subheading text-[10px] tracking-widest uppercase text-[#eae1d8] font-bold">
                            AKTIFKAN HALAMAN KEGIATAN
                          </span>
                          <span className="text-[9px] text-[#9b8f7f]">
                            Menampilkan seluruh arsip dokumentasi kegiatan.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettingsFormData(prev => ({ ...prev, enable_kegiatan_page: !prev.enable_kegiatan_page }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settingsFormData.enable_kegiatan_page ? 'bg-[#d8a85c]' : 'bg-[#4f4538]/40'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#110e09] shadow ring-0 transition duration-200 ease-in-out ${
                              settingsFormData.enable_kegiatan_page ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#110e09]/80 border border-[#4f4538]/20 rounded">
                        <div>
                          <span className="block font-subheading text-[10px] tracking-widest uppercase text-[#eae1d8] font-bold">
                            AKTIFKAN HALAMAN FOTO TERBARU
                          </span>
                          <span className="text-[9px] text-[#9b8f7f]">
                            Menampilkan mosaik foto terbaru sekolah.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettingsFormData(prev => ({ ...prev, enable_foto_terbaru_page: !prev.enable_foto_terbaru_page }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settingsFormData.enable_foto_terbaru_page ? 'bg-[#d8a85c]' : 'bg-[#4f4538]/40'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#110e09] shadow ring-0 transition duration-200 ease-in-out ${
                              settingsFormData.enable_foto_terbaru_page ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#4f4538]/10 pt-4">
                    <h4 className="font-display text-sm font-bold text-[#f6c374] mb-3">Tata Letak Beranda (Homepage Blocks)</h4>
                  </div>

                  <div className="space-y-4">
                    {settingsFormData.sections
                      .filter(s => s.id !== "kegiatan_page" && s.id !== "foto_terbaru_page")
                      .map((sec, visualIdx) => {
                        const originalIdx = settingsFormData.sections.findIndex(s => s.id === sec.id);
                        return (
                          <div key={sec.id} className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#4f4538]/10 pb-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  id={`check-${sec.id}`}
                                  checked={sec.enabled}
                                  onChange={(e) => {
                                    if (originalIdx !== -1) {
                                      const updated = [...settingsFormData.sections];
                                      updated[originalIdx].enabled = e.target.checked;
                                      setSettingsFormData(prev => ({ ...prev, sections: updated }));
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-[#f6c374] focus:ring-[#f6c374] bg-[#110e09] border-[#4f4538] cursor-pointer"
                                />
                                <label htmlFor={`check-${sec.id}`} className="font-display text-sm font-bold text-[#eae1d8] cursor-pointer">
                                  {sec.section_name} <span className="text-[10px] text-[#9b8f7f] font-mono font-normal">({sec.id})</span>
                                </label>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={visualIdx === 0}
                                  onClick={() => handleMoveSection(sec.id, "up")}
                                  className="p-1 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Pindahkan ke atas"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={visualIdx === settingsFormData.sections.filter(s => s.id !== "kegiatan_page" && s.id !== "foto_terbaru_page").length - 1}
                                  onClick={() => handleMoveSection(sec.id, "down")}
                                  className="p-1 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Pindahkan ke bawah"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">Label Judul Kustom (Custom Label)</label>
                                <input
                                  type="text"
                                  required
                                  value={sec.custom_label || ""}
                                  onChange={(e) => {
                                    if (originalIdx !== -1) {
                                      const updated = [...settingsFormData.sections];
                                      updated[originalIdx].custom_label = e.target.value;
                                      setSettingsFormData(prev => ({ ...prev, sections: updated }));
                                    }
                                  }}
                                  className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-1.5 px-2.5 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
                                />
                              </div>

                              {(sec.id === "kegiatan" || sec.id === "galeri" || sec.id === "foto-terbaru") && (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">Batas Tampilan (Item Limit)</label>
                                    <select
                                      value={sec.item_limit === "all" ? "all" : String(sec.item_limit)}
                                      onChange={(e) => {
                                        if (originalIdx !== -1) {
                                          const updated = [...settingsFormData.sections];
                                          const val = e.target.value;
                                          updated[originalIdx].item_limit = val === "all" ? "all" : Number(val);
                                          setSettingsFormData(prev => ({ ...prev, sections: updated }));
                                        }
                                      }}
                                      className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-1.5 px-2 text-xs text-[#eae1d8]"
                                    >
                                      <option value="3">3 Item</option>
                                      <option value="4">4 Item</option>
                                      <option value="6">6 Item</option>
                                      <option value="9">9 Item</option>
                                      <option value="12">12 Item</option>
                                      <option value="all">Tampilkan Semua</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">Urutan Data (Sorting)</label>
                                    <select
                                      value={sec.sorting || "latest"}
                                      onChange={(e) => {
                                        if (originalIdx !== -1) {
                                          const updated = [...settingsFormData.sections];
                                          updated[originalIdx].sorting = e.target.value as "latest" | "oldest";
                                          setSettingsFormData(prev => ({ ...prev, sections: updated }));
                                        }
                                      }}
                                      className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-1.5 px-2 text-xs text-[#eae1d8]"
                                    >
                                      <option value="latest">Terbaru Terlebih Dahulu</option>
                                      <option value="oldest">Terlama Terlebih Dahulu</option>
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* GALERI FOTO BERANDA */}
                  <div className="border-t border-[#4f4538]/10 pt-6 mt-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#f6c374] uppercase tracking-wider">
                          GALERI FOTO BERANDA
                        </h4>
                        <p className="text-xs text-[#9b8f7f] mt-0.5">
                          Atur batas jumlah foto (maksimal 15), pilih foto dari kegiatan sekolah, atur urutan tampil (↑ / ↓), dan tinjau live preview untuk Galeri Foto di Beranda.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* 1. JUMLAH FOTO YANG DITAMPILKAN */}
                      <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                              JUMLAH FOTO YANG DITAMPILKAN
                            </label>
                            <span className="text-[11px] text-[#eae1d8] block mt-0.5">
                              Pilih batas foto yang akan ditampilkan pada section Galeri Foto di Beranda (1 s.d. 15 foto).
                            </span>
                          </div>
                          <span className="text-[#f6c374] font-bold text-xs bg-[#f6c374]/10 border border-[#f6c374]/30 px-3 py-1 rounded">
                            {settingsFormData.homepage_gallery_limit ?? 6} Foto
                          </span>
                        </div>

                        <select
                          value={settingsFormData.homepage_gallery_limit ?? 6}
                          onChange={(e) => {
                            const newLimit = Number(e.target.value);
                            setSettingsFormData(prev => {
                              const currentIds = prev.homepage_gallery_photo_ids || [];
                              const updatedIds = currentIds.slice(0, newLimit);
                              return {
                                ...prev,
                                homepage_gallery_limit: newLimit,
                                homepage_gallery_photo_ids: updatedIds
                              };
                            });
                          }}
                          className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                            <option key={num} value={num}>
                              {num} Foto {num === 6 ? "(Bawaan)" : ""}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-[#9b8f7f]">
                            Status Pemilihan: <strong className="text-[#f6c374]">{(settingsFormData.homepage_gallery_photo_ids || []).length}</strong> dari <strong className="text-[#eae1d8]">{settingsFormData.homepage_gallery_limit ?? 6}</strong> foto terpilih
                          </span>
                          {(settingsFormData.homepage_gallery_photo_ids || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSettingsFormData(prev => ({ ...prev, homepage_gallery_photo_ids: [] }))}
                              className="text-[10px] text-red-400/80 hover:text-red-400 underline transition-colors"
                            >
                              Kosongkan Pilihan Foto
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. PILIH FOTO DARI KEGIATAN */}
                      <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                              PILIH FOTO DARI KEGIATAN
                            </label>
                            <p className="text-[11px] text-[#9b8f7f] mt-0.5">
                              Centang kegiatan di bawah untuk melihat dan memilih foto yang akan dimasukkan ke Beranda.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setHomepageGalleryActivityFilter(activities.map(a => a.id))}
                              className="text-[10px] px-2.5 py-1 rounded bg-[#4f4538]/20 hover:bg-[#4f4538]/40 text-[#eae1d8] transition-colors"
                            >
                              Pilih Semua Kegiatan
                            </button>
                            <button
                              type="button"
                              onClick={() => setHomepageGalleryActivityFilter([])}
                              className="text-[10px] px-2.5 py-1 rounded bg-[#4f4538]/20 hover:bg-[#4f4538]/40 text-[#9b8f7f] hover:text-[#eae1d8] transition-colors"
                            >
                              Bersihkan Filter
                            </button>
                          </div>
                        </div>

                        {/* Activity Filter Checkboxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-[#110e09]/80 border border-[#4f4538]/20 rounded">
                          {activities.length === 0 ? (
                            <p className="text-xs text-[#9b8f7f] p-2 col-span-full">Belum ada kegiatan terdaftar.</p>
                          ) : (
                            activities.map(act => {
                              const isActChecked = homepageGalleryActivityFilter.includes(act.id);
                              const actPhotos = photos.filter(p => p.activity_id === act.id);
                              const selectedInAct = (settingsFormData.homepage_gallery_photo_ids || []).filter(pId => actPhotos.some(p => p.id === pId)).length;

                              return (
                                <label
                                  key={act.id}
                                  className={`flex items-center gap-2.5 p-2 rounded cursor-pointer border transition-colors ${
                                    isActChecked
                                      ? "bg-[#f6c374]/10 border-[#f6c374]/40 text-[#eae1d8]"
                                      : "bg-black/30 border-[#4f4538]/20 text-[#9b8f7f] hover:border-[#4f4538]/50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isActChecked}
                                    onChange={() => {
                                      setHomepageGalleryActivityFilter(prev =>
                                        prev.includes(act.id) ? prev.filter(id => id !== act.id) : [...prev, act.id]
                                      );
                                    }}
                                    className="rounded border-[#4f4538] text-[#f6c374] focus:ring-0 cursor-pointer accent-[#f6c374]"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{act.title}</p>
                                    <p className="text-[9px] text-[#9b8f7f]">
                                      {actPhotos.length} foto {selectedInAct > 0 ? `(${selectedInAct} terpilih)` : ""}
                                    </p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>

                        {/* Photo Picker Grid for Selected Activities */}
                        <div className="space-y-3 pt-2">
                          <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                            DAFTAR FOTO UNTUK DIPILIH (KLIK ATAU CENTANG FOTO)
                          </label>

                          {(() => {
                            const effectiveActivities = homepageGalleryActivityFilter.length > 0
                              ? homepageGalleryActivityFilter
                              : [];
                            const displayedPhotos = photos.filter(p => effectiveActivities.includes(p.activity_id));

                            if (homepageGalleryActivityFilter.length === 0) {
                              return (
                                <div className="p-6 text-center border border-dashed border-[#4f4538]/30 rounded text-xs text-[#9b8f7f]">
                                  Centang minimal satu kegiatan di atas untuk melihat dan memilih foto.
                                </div>
                              );
                            }

                            if (displayedPhotos.length === 0) {
                              return (
                                <div className="p-6 text-center border border-dashed border-[#4f4538]/30 rounded text-xs text-[#9b8f7f]">
                                  Kegiatan yang dipilih belum memiliki foto di galeri.
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 bg-[#110e09]/80 border border-[#4f4538]/20 rounded">
                                {displayedPhotos.map(photo => {
                                  const currentSelectedIds = settingsFormData.homepage_gallery_photo_ids || [];
                                  const isSelected = currentSelectedIds.includes(photo.id);
                                  const orderIndex = currentSelectedIds.indexOf(photo.id);
                                  const actName = getActTitle(photo.activity_id);
                                  const limit = settingsFormData.homepage_gallery_limit ?? 6;

                                  const togglePhoto = () => {
                                    if (isSelected) {
                                      setSettingsFormData(prev => ({
                                        ...prev,
                                        homepage_gallery_photo_ids: (prev.homepage_gallery_photo_ids || []).filter(id => id !== photo.id)
                                      }));
                                    } else {
                                      if (currentSelectedIds.length >= limit) {
                                        onShowToast(`Maksimal ${limit} foto untuk Galeri Beranda.`, "error");
                                        return;
                                      }
                                      setSettingsFormData(prev => ({
                                        ...prev,
                                        homepage_gallery_photo_ids: [...(prev.homepage_gallery_photo_ids || []), photo.id]
                                      }));
                                    }
                                  };

                                  return (
                                    <div
                                      key={photo.id}
                                      onClick={togglePhoto}
                                      className={`group relative rounded overflow-hidden border cursor-pointer transition-all duration-300 ${
                                        isSelected
                                          ? "border-[#f6c374] ring-2 ring-[#f6c374]/40 shadow-lg scale-[1.02]"
                                          : "border-[#4f4538]/30 hover:border-[#f6c374]/50 opacity-75 hover:opacity-100"
                                      }`}
                                    >
                                      <div className="aspect-square relative bg-black">
                                        <img
                                          src={photo.image_url}
                                          alt={photo.title || ""}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />

                                        {/* Badge Order / Indicator */}
                                        <div className="absolute top-1.5 right-1.5 z-10">
                                          <div
                                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow ${
                                              isSelected
                                                ? "bg-[#f6c374] text-[#110e09]"
                                                : "bg-black/70 text-white/50 border border-white/30 group-hover:border-[#f6c374]"
                                            }`}
                                          >
                                            {isSelected ? `#${orderIndex + 1}` : ""}
                                          </div>
                                        </div>

                                        {/* Activity label bottom */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 text-left">
                                          <p className="text-[9px] font-bold text-[#eae1d8] truncate">{actName}</p>
                                          {photo.title && (
                                            <p className="text-[8px] text-[#9b8f7f] truncate">{photo.title}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* 3. ATUR URUTAN FOTO TERPILIH & PREVIEW */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left (6 cols): Reordering List */}
                        <div className="lg:col-span-6 bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                              ATUR URUTAN FOTO TERPILIH (↑ / ↓)
                            </label>
                            <span className="text-[10px] text-[#f6c374] font-semibold">
                              {(settingsFormData.homepage_gallery_photo_ids || []).length} Foto Terpilih
                            </span>
                          </div>
                          <p className="text-[10px] text-[#9b8f7f]">
                            Gunakan tombol panah untuk mengatur urutan tampil foto di Beranda. Urutan asli di kegiatan tidak terpengaruh.
                          </p>

                          {(settingsFormData.homepage_gallery_photo_ids || []).length === 0 ? (
                            <div className="p-6 text-center border border-dashed border-[#4f4538]/30 rounded text-xs text-[#9b8f7f]">
                              Belum ada foto yang dipilih. Centang foto dari kegiatan di atas untuk menambahkan.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                              {(settingsFormData.homepage_gallery_photo_ids || []).map((pId, idx, arr) => {
                                const photoObj = photos.find(p => p.id === pId);
                                if (!photoObj) return null;
                                const actName = getActTitle(photoObj.activity_id);

                                const moveUp = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  if (idx === 0) return;
                                  const newIds = [...arr];
                                  const temp = newIds[idx];
                                  newIds[idx] = newIds[idx - 1];
                                  newIds[idx - 1] = temp;
                                  setSettingsFormData(prev => ({ ...prev, homepage_gallery_photo_ids: newIds }));
                                };

                                const moveDown = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  if (idx === arr.length - 1) return;
                                  const newIds = [...arr];
                                  const temp = newIds[idx];
                                  newIds[idx] = newIds[idx + 1];
                                  newIds[idx + 1] = temp;
                                  setSettingsFormData(prev => ({ ...prev, homepage_gallery_photo_ids: newIds }));
                                };

                                const removePhoto = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setSettingsFormData(prev => ({
                                    ...prev,
                                    homepage_gallery_photo_ids: (prev.homepage_gallery_photo_ids || []).filter(id => id !== pId)
                                  }));
                                };

                                return (
                                  <div
                                    key={pId}
                                    className="flex items-center gap-3 p-2 rounded bg-black/40 border border-[#4f4538]/20 hover:border-[#f6c374]/30 transition-colors"
                                  >
                                    <span className="w-6 h-6 rounded bg-[#f6c374]/20 border border-[#f6c374]/40 text-[#f6c374] text-xs font-bold flex items-center justify-center shrink-0">
                                      {idx + 1}
                                    </span>

                                    <div className="w-12 h-10 rounded overflow-hidden bg-black shrink-0 border border-white/10">
                                      <img
                                        src={photoObj.image_url}
                                        alt={photoObj.title || ""}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-[#eae1d8] truncate">{actName}</p>
                                      <p className="text-[10px] text-[#9b8f7f] truncate">{photoObj.title || "Tanpa Judul"}</p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={moveUp}
                                        className="p-1 rounded bg-[#4f4538]/20 hover:bg-[#f6c374] hover:text-[#110e09] text-[#eae1d8] disabled:opacity-20 disabled:hover:bg-[#4f4538]/20 disabled:hover:text-[#eae1d8] transition-colors"
                                        title="Pindahkan ke atas"
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === arr.length - 1}
                                        onClick={moveDown}
                                        className="p-1 rounded bg-[#4f4538]/20 hover:bg-[#f6c374] hover:text-[#110e09] text-[#eae1d8] disabled:opacity-20 disabled:hover:bg-[#4f4538]/20 disabled:hover:text-[#eae1d8] transition-colors"
                                        title="Pindahkan ke bawah"
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={removePhoto}
                                        className="p-1 rounded bg-red-900/20 hover:bg-red-500 hover:text-white text-red-400 transition-colors ml-1"
                                        title="Hapus dari Beranda"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Right (6 cols): Live Preview */}
                        <div className="lg:col-span-6 bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                              PREVIEW GALERI BERANDA
                            </label>
                            <span className="text-[10px] text-[#f6c374] bg-[#f6c374]/10 border border-[#f6c374]/30 px-2 py-0.5 rounded">
                              Live Preview
                            </span>
                          </div>
                          <p className="text-[10px] text-[#9b8f7f]">
                            Simulasi tampilan grid galeri foto pada halaman Beranda sesuai foto dan urutan yang Anda pilih.
                          </p>

                          {(() => {
                            const selectedIds = settingsFormData.homepage_gallery_photo_ids || [];
                            const limit = settingsFormData.homepage_gallery_limit ?? 6;
                            let previewPhotos: Photo[] = [];

                            if (selectedIds.length > 0) {
                              selectedIds.forEach(id => {
                                const p = photos.find(item => item.id === id);
                                if (p && !previewPhotos.some(prevP => prevP.id === p.id)) {
                                  previewPhotos.push(p);
                                }
                              });
                              previewPhotos = previewPhotos.slice(0, limit);
                            } else {
                              previewPhotos = photos.slice(0, limit);
                            }

                            if (previewPhotos.length === 0) {
                              return (
                                <div className="p-8 text-center border border-dashed border-[#4f4538]/30 rounded text-xs text-[#9b8f7f]">
                                  Tidak ada foto untuk ditampilkan dalam preview.
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2 p-3 bg-black/60 border border-[#4f4538]/20 rounded">
                                  {previewPhotos.map((p, pIdx) => (
                                    <div
                                      key={p.id}
                                      className="group relative aspect-[4/3] rounded-sm overflow-hidden border border-[#4f4538]/20 bg-[#110e09]"
                                    >
                                      <img
                                        src={p.image_url}
                                        alt={p.title || ""}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute top-1 left-1 bg-black/80 text-[#f6c374] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#f6c374]/30">
                                        #{pIdx + 1}
                                      </div>
                                      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1.5 py-1">
                                        <p className="text-[9px] text-[#eae1d8] font-semibold truncate">{getActTitle(p.activity_id)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between text-[10px] text-[#9b8f7f] px-1">
                                  <span>Total Tampil di Beranda: <strong className="text-[#eae1d8]">{previewPhotos.length} Foto</strong></span>
                                  {selectedIds.length === 0 && (
                                    <span className="text-[#f6c374]/80 italic">(Default: Foto terbaru)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#4f4538]/10 pt-6 mt-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                      <div>
                        <h4 className="font-display text-sm font-bold text-[#f6c374] uppercase tracking-wider">
                          Pengaturan Slideshow
                        </h4>
                        <p className="text-xs text-[#9b8f7f] mt-0.5">
                          Atur batas jumlah slide, sumber foto kegiatan, durasi, transisi, dan tingkat keburaman latar belakang.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Form Controls (7 cols) */}
                      <div className="lg:col-span-7 space-y-6">
                        
                        {/* 1. BATAS JUMLAH SLIDE */}
                        <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading">
                              JUMLAH SLIDE
                            </label>
                            <span className="text-[#f6c374] font-bold text-xs">
                              {settingsFormData.slideshow_limit ?? 5} SLIDE
                            </span>
                          </div>

                          <select
                            value={settingsFormData.slideshow_limit ?? 5}
                            onChange={(e) => {
                              const newLimit = Number(e.target.value);
                              setSettingsFormData(prev => {
                                const currentIds = prev.slideshow_gallery_ids || [];
                                const trimmedIds = currentIds.slice(0, newLimit);
                                return {
                                  ...prev,
                                  slideshow_limit: newLimit,
                                  slideshow_gallery_ids: trimmedIds
                                };
                              });
                            }}
                            className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <option key={n} value={n}>
                                {n} Slide {n === 5 ? "(Bawaan / Default)" : ""}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-[#9b8f7f]">
                            Tentukan batas maksimum jumlah slide yang ditampilkan pada slideshow beranda (1 sampai 10 slide).
                          </p>
                        </div>

                        {/* 2. SUMBER SLIDESHOW */}
                        <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-4">
                          <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                            SUMBER SLIDESHOW
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Option A: GAMBAR TERBARU */}
                            <label
                              className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-all ${
                                (settingsFormData.slideshow_source ?? "latest") === "latest"
                                  ? "bg-[#f6c374]/15 border-[#f6c374] text-[#eae1d8]"
                                  : "bg-[#110e09] border-[#4f4538]/30 text-[#9b8f7f] hover:border-[#4f4538]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="slideshow_source"
                                value="latest"
                                checked={(settingsFormData.slideshow_source ?? "latest") === "latest"}
                                onChange={() => setSettingsFormData(prev => ({ ...prev, slideshow_source: "latest" }))}
                                className="mt-0.5 text-[#f6c374] focus:ring-[#f6c374] bg-[#110e09] border-[#4f4538]"
                              />
                              <div className="space-y-1">
                                <span className="font-display text-xs font-bold text-[#eae1d8] block">
                                  GAMBAR TERBARU
                                </span>
                                <p className="text-[10px] leading-relaxed text-[#9b8f7f]">
                                  Otomatis mengambil {settingsFormData.slideshow_limit ?? 5} foto kegiatan terbaru yang telah dipublikasikan.
                                </p>
                              </div>
                            </label>

                            {/* Option B: PILIH DARI GALERI */}
                            <label
                              className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-all ${
                                (settingsFormData.slideshow_source ?? "latest") === "gallery"
                                  ? "bg-[#f6c374]/15 border-[#f6c374] text-[#eae1d8]"
                                  : "bg-[#110e09] border-[#4f4538]/30 text-[#9b8f7f] hover:border-[#4f4538]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="slideshow_source"
                                value="gallery"
                                checked={(settingsFormData.slideshow_source ?? "latest") === "gallery"}
                                onChange={() => setSettingsFormData(prev => ({ ...prev, slideshow_source: "gallery" }))}
                                className="mt-0.5 text-[#f6c374] focus:ring-[#f6c374] bg-[#110e09] border-[#4f4538]"
                              />
                              <div className="space-y-1">
                                <span className="font-display text-xs font-bold text-[#eae1d8] block">
                                  PILIH DARI GALERI
                                </span>
                                <p className="text-[10px] leading-relaxed text-[#9b8f7f]">
                                  Pilih dan centang foto kegiatan secara manual dari galeri sesuai jumlah slide yang ditentukan.
                                </p>
                              </div>
                            </label>
                          </div>

                          {/* PENGATURAN PILIH DARI GALERI (Hanya bila mode gallery aktif) */}
                          {(settingsFormData.slideshow_source === "gallery") && (
                            <div className="space-y-4 pt-3 border-t border-[#4f4538]/20 mt-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                  <h5 className="font-display text-xs font-bold text-[#eae1d8] uppercase tracking-wider">
                                    Daftar Foto Galeri untuk Slideshow
                                  </h5>
                                  <p className="text-[10px] text-[#9b8f7f]">
                                    Centang foto yang ingin ditampilkan di slideshow.
                                  </p>
                                </div>
                                {/* Counter Badge */}
                                <div className={`px-3 py-1 rounded text-xs font-subheading font-bold uppercase tracking-wider border ${
                                  (settingsFormData.slideshow_gallery_ids?.length || 0) === (settingsFormData.slideshow_limit ?? 5)
                                    ? "bg-[#f6c374]/20 border-[#f6c374] text-[#f6c374]"
                                    : "bg-[#110e09] border-[#4f4538]/40 text-[#eae1d8]"
                                }`}>
                                  {settingsFormData.slideshow_gallery_ids?.length || 0} / {settingsFormData.slideshow_limit ?? 5} slide dipilih
                                </div>
                              </div>

                              {/* Alert if limit is reached */}
                              {(settingsFormData.slideshow_gallery_ids?.length || 0) >= (settingsFormData.slideshow_limit ?? 5) && (
                                <div className="p-2.5 rounded bg-[#f6c374]/10 border border-[#f6c374]/30 text-[10px] text-[#f6c374]">
                                  <span className="font-bold">Batas Tercapai:</span> Jumlah pilihan ({settingsFormData.slideshow_limit ?? 5} slide) sudah penuh. Lepas centang salah satu foto jika ingin memilih foto lain.
                                </div>
                              )}

                              {/* URUTAN SLIDE MANUAL (Reordering controls) */}
                              {(settingsFormData.slideshow_gallery_ids?.length || 0) > 0 && (
                                <div className="space-y-2 bg-[#17130e] p-3 rounded border border-[#4f4538]/20">
                                  <span className="text-[10px] text-[#f6c374] uppercase font-subheading font-bold block">
                                    Urutan Slide yang Ditampilkan:
                                  </span>
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {settingsFormData.slideshow_gallery_ids?.map((id, seqIdx) => {
                                      const act = activities.find(a => a.id === id);
                                      if (!act) return null;
                                      return (
                                        <div key={id} className="flex items-center justify-between p-2 rounded bg-[#110e09] border border-[#4f4538]/30 gap-2">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="w-5 h-5 rounded-full bg-[#f6c374] text-[#110e09] font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                              {seqIdx + 1}
                                            </span>
                                            <img
                                              src={act.cover_image}
                                              alt=""
                                              className="w-8 h-8 rounded object-cover flex-shrink-0 border border-white/10"
                                              referrerPolicy="no-referrer"
                                            />
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-[#eae1d8] truncate">{act.title}</p>
                                              <p className="text-[9px] text-[#9b8f7f] truncate">{act.category} • {act.date}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                              type="button"
                                              disabled={seqIdx === 0}
                                              onClick={() => {
                                                const current = [...(settingsFormData.slideshow_gallery_ids || [])];
                                                const [moved] = current.splice(seqIdx, 1);
                                                current.splice(seqIdx - 1, 0, moved);
                                                setSettingsFormData(prev => ({ ...prev, slideshow_gallery_ids: current }));
                                              }}
                                              className="p-1 rounded border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] text-[#9b8f7f] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                              title="Geser Naik"
                                            >
                                              <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={seqIdx === (settingsFormData.slideshow_gallery_ids?.length || 0) - 1}
                                              onClick={() => {
                                                const current = [...(settingsFormData.slideshow_gallery_ids || [])];
                                                const [moved] = current.splice(seqIdx, 1);
                                                current.splice(seqIdx + 1, 0, moved);
                                                setSettingsFormData(prev => ({ ...prev, slideshow_gallery_ids: current }));
                                              }}
                                              className="p-1 rounded border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] text-[#9b8f7f] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                                              title="Geser Turun"
                                            >
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSettingsFormData(prev => ({
                                                  ...prev,
                                                  slideshow_gallery_ids: (prev.slideshow_gallery_ids || []).filter(item => item !== id)
                                                }));
                                              }}
                                              className="p-1 rounded border border-red-500/30 hover:border-red-500 text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                                              title="Hapus dari Slideshow"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Daftar Foto Kegiatan untuk Dicentang */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] text-[#9b8f7f] uppercase font-subheading block">
                                  Daftar Foto / Kegiatan Tersedia:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                  {activities.filter(act => act.cover_image).map(act => {
                                    const isSelected = (settingsFormData.slideshow_gallery_ids || []).includes(act.id);
                                    const currentSelectedCount = settingsFormData.slideshow_gallery_ids?.length || 0;
                                    const limit = settingsFormData.slideshow_limit ?? 5;
                                    const isLimitReached = !isSelected && currentSelectedCount >= limit;

                                    return (
                                      <label
                                        key={act.id}
                                        className={`flex items-center gap-3 p-2.5 rounded border transition-all ${
                                          isSelected
                                            ? "bg-[#f6c374]/15 border-[#f6c374] text-[#eae1d8]"
                                            : isLimitReached
                                            ? "opacity-40 bg-[#110e09] border-[#4f4538]/20 cursor-not-allowed text-[#9b8f7f]"
                                            : "bg-[#110e09] border-[#4f4538]/30 hover:border-[#4f4538] cursor-pointer text-[#d3c4b3]"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          disabled={isLimitReached}
                                          onChange={(e) => {
                                            const current = [...(settingsFormData.slideshow_gallery_ids || [])];
                                            if (e.target.checked) {
                                              if (current.length < limit) {
                                                current.push(act.id);
                                                setSettingsFormData(prev => ({ ...prev, slideshow_gallery_ids: current }));
                                              }
                                            } else {
                                              const updated = current.filter(id => id !== act.id);
                                              setSettingsFormData(prev => ({ ...prev, slideshow_gallery_ids: updated }));
                                            }
                                          }}
                                          className="w-4 h-4 rounded text-[#f6c374] focus:ring-[#f6c374] bg-[#110e09] border-[#4f4538] cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <img
                                          src={act.cover_image}
                                          alt=""
                                          className="w-12 h-12 rounded object-cover flex-shrink-0 border border-white/10"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold text-[#eae1d8] truncate">{act.title}</p>
                                          <p className="text-[10px] text-[#9b8f7f] truncate">{act.category} • {act.date}</p>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. PENGATURAN DURASI, TRANSIASI & TINGKAT KEBURAMAN */}
                        <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading flex justify-between">
                              <span>Durasi Slideshow</span>
                              <span className="text-[#f6c374]">{settingsFormData.slideshow_duration ?? 5} DETIK</span>
                            </label>
                            <input
                              type="range"
                              min="2"
                              max="30"
                              value={settingsFormData.slideshow_duration ?? 5}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, slideshow_duration: Number(e.target.value) }))}
                              className="w-full accent-[#f6c374] cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#9b8f7f]">
                              <span>2s</span>
                              <span>30s</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading block mb-1">Mode Transisi</label>
                            <select
                              value={settingsFormData.slideshow_transition ?? "Fade"}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, slideshow_transition: e.target.value }))}
                              className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
                            >
                              <option value="Fade">Fade</option>
                              <option value="Crossfade">Crossfade</option>
                              <option value="Slide">Slide</option>
                              <option value="Slide Up">Slide Up</option>
                              <option value="Slide Down">Slide Down</option>
                              <option value="Zoom">Zoom</option>
                              <option value="Zoom + Fade">Zoom + Fade</option>
                              <option value="Blur + Fade">Blur + Fade</option>
                              <option value="Ken Burns">Ken Burns</option>
                              <option value="Parallax">Parallax</option>
                              <option value="Cinematic">Cinematic</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-[#9b8f7f] uppercase font-subheading flex justify-between">
                              <span>Tingkat Keburaman Latar Belakang (Blur)</span>
                              <span className="text-[#f6c374]">{settingsFormData.slideshow_blur ?? 35}%</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={settingsFormData.slideshow_blur ?? 35}
                              onChange={(e) => setSettingsFormData(prev => ({ ...prev, slideshow_blur: Number(e.target.value) }))}
                              className="w-full accent-[#f6c374] cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-[#9b8f7f]">
                              <span>0%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Right Column: Interactive Real-time Preview (5 cols) */}
                      <div className="lg:col-span-5">
                        {(() => {
                          const source = settingsFormData.slideshow_source ?? "latest";
                          const limit = settingsFormData.slideshow_limit ?? 5;
                          const selectedIds = settingsFormData.slideshow_gallery_ids || [];

                          let activeSlides: Activity[] = [];
                          if (source === "gallery") {
                            const picked: Activity[] = [];
                            selectedIds.forEach(id => {
                              const found = activities.find(a => a.id === id);
                              if (found && found.cover_image) picked.push(found);
                            });
                            activeSlides = picked.slice(0, limit);
                          } else {
                            const valid = activities
                              .filter(a => (a.status === "published" || a.status === undefined) && Boolean(a.cover_image))
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            activeSlides = valid.slice(0, limit);
                          }

                          const totalAvailableSlides = activeSlides.length;
                          const currentSlideIndex = totalAvailableSlides > 0 
                            ? (slideshowPreviewIndex % totalAvailableSlides) 
                            : 0;
                          const currentSlide = activeSlides[currentSlideIndex];
                          const previewCover = currentSlide?.cover_image || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80";

                          return (
                            <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 sticky top-6 space-y-4">
                              <div className="flex justify-between items-center">
                                <h5 className="text-[10px] text-[#9b8f7f] uppercase font-subheading font-bold">
                                  Preview Slideshow Halaman Utama
                                </h5>
                                <span className="text-[9px] font-mono text-[#f6c374] bg-[#f6c374]/10 border border-[#f6c374]/30 px-2 py-0.5 rounded">
                                  {totalAvailableSlides} Slide Aktif
                                </span>
                              </div>

                              <div className="relative aspect-video rounded overflow-hidden bg-[#17130e] border border-[#4f4538]/40 flex flex-col justify-between p-4 group">
                                {/* Blurred Background preview */}
                                <img 
                                  key={`prev-bg-${currentSlide?.id || 'default'}`}
                                  src={previewCover} 
                                  alt="preview background"
                                  className="absolute inset-0 w-full h-full object-cover transition-all duration-700 transform scale-105"
                                  style={{ filter: `brightness(0.35) blur(${((settingsFormData.slideshow_blur ?? 35) / 100) * 12}px)` }}
                                  referrerPolicy="no-referrer"
                                />

                                {/* Foreground Mock Card */}
                                <div className="relative z-10 flex flex-col items-center justify-center flex-1 my-auto">
                                  <div className="w-32 h-20 rounded-md overflow-hidden border border-white/20 shadow-2xl relative">
                                    <img 
                                      src={previewCover}
                                      alt="mock card"
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <span className="absolute bottom-1 left-1.5 text-[7px] text-[#f6c374] font-bold uppercase truncate max-w-[90%]">
                                      {currentSlide?.category || "DOKUMENTASI"}
                                    </span>
                                  </div>
                                </div>

                                {/* Text & Controls overlay in preview */}
                                <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/10 pt-2 bg-black/40 px-2.5 py-1.5 rounded backdrop-blur-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-white font-display font-bold text-xs truncate">
                                      {currentSlide?.title || "Judul Kegiatan Slideshow"}
                                    </p>
                                    <p className="text-white/70 text-[9px] truncate">
                                      Sumber: {source === "gallery" ? "PILIH DARI GALERI" : "GAMBAR TERBARU"} • {settingsFormData.slideshow_duration ?? 5}s • {settingsFormData.slideshow_transition ?? "Fade"}
                                    </p>
                                  </div>

                                  {/* Slide Switcher Arrows */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={totalAvailableSlides <= 1}
                                      onClick={() => setSlideshowPreviewIndex(prev => (prev - 1 + totalAvailableSlides) % totalAvailableSlides)}
                                      className="p-1 rounded bg-white/10 hover:bg-[#f6c374] hover:text-[#110e09] text-white disabled:opacity-20 transition-colors"
                                      title="Slide Sebelumnya"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] font-mono text-[#f6c374] px-1 font-bold">
                                      {totalAvailableSlides > 0 ? currentSlideIndex + 1 : 0}/{totalAvailableSlides}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={totalAvailableSlides <= 1}
                                      onClick={() => setSlideshowPreviewIndex(prev => (prev + 1) % totalAvailableSlides)}
                                      className="p-1 rounded bg-white/10 hover:bg-[#f6c374] hover:text-[#110e09] text-white disabled:opacity-20 transition-colors"
                                      title="Slide Berikutnya"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Summary Info */}
                              <div className="p-3 bg-[#17130e] rounded border border-[#4f4538]/20 space-y-1.5 text-xs">
                                <div className="flex justify-between text-[#9b8f7f] text-[10px]">
                                  <span>Konfigurasi Sumber:</span>
                                  <span className="text-[#eae1d8] font-bold">
                                    {source === "gallery" ? "PILIH DARI GALERI" : "GAMBAR TERBARU"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[#9b8f7f] text-[10px]">
                                  <span>Batas Tampilan:</span>
                                  <span className="text-[#eae1d8] font-bold">{limit} Slide</span>
                                </div>
                                <div className="flex justify-between text-[#9b8f7f] text-[10px]">
                                  <span>Durasi Pergantian:</span>
                                  <span className="text-[#eae1d8] font-bold">{settingsFormData.slideshow_duration ?? 5} Detik</span>
                                </div>
                                <div className="flex justify-between text-[#9b8f7f] text-[10px]">
                                  <span>Gaya Transisi:</span>
                                  <span className="text-[#eae1d8] font-bold">{settingsFormData.slideshow_transition ?? "Fade"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* SUB TAB: Pengaturan Copyright */}
              {settingsSubTab === "copyright" && (
                <div className="space-y-6">
                  <h3 className="font-display text-lg font-bold text-[#f6c374] border-b border-[#4f4538]/10 pb-2">
                    Pengaturan Copyright
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Tahun Copyright
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 2026"
                        value={settingsFormData.copyright_year || ""}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, copyright_year: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                      <p className="text-[9px] text-[#9b8f7f] leading-relaxed">
                        Tahun yang akan ditampilkan pada bagian footer website publik.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Nama Pencipta / Pembuat Website
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Nama Pembuat"
                        value={settingsFormData.copyright_author || ""}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, copyright_author: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
                      <p className="text-[9px] text-[#9b8f7f] leading-relaxed">
                        Nama pencipta website yang akan ditampilkan di sebelah info hak cipta. Kosongkan jika tidak ingin ditampilkan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* General Save Trigger */}
              <div className="border-t border-[#4f4538]/15 pt-6 flex justify-between items-center">
                <span className="text-[10px] text-[#9b8f7f] italic font-body">Pastikan Anda mengklik simpan setelah mengubah isi di sub-tab mana pun.</span>
                <button
                  type="submit"
                  className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading text-xs tracking-widest uppercase py-3.5 px-8 rounded-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      {/* --- FORM 1: ADD/EDIT ACTIVITY MODAL POPUP --- */}
      {isActivityFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#17130e] border border-[#4f4538]/20 max-w-2xl w-full rounded-sm p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#f6c374]">
              {editingActivity ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}
            </h3>

            <form onSubmit={handleSaveActivity} className="space-y-4 font-body text-xs">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Judul Kegiatan</label>
                  <input
                    type="text"
                    required
                    value={activityFormData.title}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Wisuda Angkatan 45"
                    className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Kategori</label>
                  <select
                    value={activityFormData.category}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                  >
                    <option value="Kegiatan Sekolah">Kegiatan Sekolah</option>
                    <option value="Event">Event</option>
                    <option value="Olahraga & Kreativitas">Olahraga & Kreativitas</option>
                    <option value="Kegiatan Siswa">Kegiatan Siswa</option>
                    <option value="Kelulusan">Kelulusan</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    required
                    value={activityFormData.date}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Status Penerbitan</label>
                  <select
                    value={activityFormData.status}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, status: e.target.value as "published" | "draft" }))}
                    className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                  >
                    <option value="draft">Draft (Disembunyikan)</option>
                    <option value="published">Published (Publik)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ceritakan kisah singkat tentang kegiatan ini..."
                  className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374] resize-none"
                />
              </div>

              {/* Cover Image Preview & Upload with 4:5 Crop */}
              <div className="space-y-4 border-t border-[#4f4538]/15 pt-4">
                <div className="space-y-1">
                  <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">FOTO UTAMA / COVER *</span>
                  <p className="text-xs text-[#9b8f7f]">Gunakan foto portrait dengan rasio 4:5 (lebar:tinggi). Resolusi yang disarankan minimal 1080x1350px agar tampilan lebih tajam.</p>
                </div>

                <div className="space-y-3">
                  {(coverPreview || existingCoverUrl) ? (
                    <div className="bg-[#110e09] border border-[#4f4538]/30 rounded-lg p-4 max-w-md space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="relative aspect-[4/5] w-28 overflow-hidden rounded border border-[#4f4538]/30 bg-black shrink-0">
                          <img
                            src={coverPreview || existingCoverUrl}
                            alt="Cover Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5 py-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-subheading text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Foto siap digunakan</span>
                          </div>
                          <div className="text-xs text-[#eae1d8] font-medium">
                            {cropFileInfo ? `${cropFileInfo.width} × ${cropFileInfo.height} px (4:5)` : "Rasio Portrait 4:5"}
                          </div>
                          {cropFileInfo && (
                            <div className="text-[11px] text-[#9b8f7f]">{cropFileInfo.sizeFormatted}</div>
                          )}
                          <div className="flex items-center gap-2 pt-2">
                            <label className="bg-[#17130e] hover:bg-[#252019] text-[#eae1d8] border border-[#4f4538]/40 hover:border-[#f6c374] font-subheading text-[10px] uppercase tracking-widest px-3 py-1.5 rounded cursor-pointer transition-all inline-flex items-center gap-1.5">
                              <span>Ganti Gambar</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const err = validateImageFile(file);
                                  if (err) {
                                    onShowToast(err, "error");
                                    return;
                                  }
                                  setRawImageFileForCrop(file);
                                  setIsCropModalOpen(true);
                                  e.target.value = "";
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (coverPreview) URL.revokeObjectURL(coverPreview);
                                setCoverFile(null);
                                setCoverPreview("");
                                setExistingCoverUrl("");
                                setCropFileInfo(null);
                              }}
                              className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-subheading transition-colors inline-flex items-center gap-1"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#4f4538]/40 hover:border-[#f6c374]/60 bg-[#110e09]/50 hover:bg-[#110e09] rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3 transition-all group max-w-md">
                      <div className="w-12 h-12 rounded-full bg-[#17130e] border border-[#4f4538]/40 flex items-center justify-center text-[#f6c374] group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-subheading text-xs uppercase tracking-widest text-[#eae1d8] font-bold">Unggah Foto Portrait (Rasio 4:5)</div>
                        <div className="text-xs text-[#9b8f7f]">
                          Klik untuk memilih foto <span className="underline">atau drag & drop file di sini</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#9b8f7f]/70 uppercase tracking-widest">
                        JPG, PNG, WEBP — Maks. 5MB
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const err = validateImageFile(file);
                          if (err) {
                            onShowToast(err, "error");
                            return;
                          }
                          setRawImageFileForCrop(file);
                          setIsCropModalOpen(true);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <ImageCropModal
                isOpen={isCropModalOpen}
                imageFile={rawImageFileForCrop}
                onClose={() => setIsCropModalOpen(false)}
                onCropComplete={(croppedFile, previewUrl, info) => {
                  if (coverPreview) URL.revokeObjectURL(coverPreview);
                  setCoverFile(croppedFile);
                  setCoverPreview(previewUrl);
                  setCropFileInfo(info);
                  onShowToast("Foto berhasil dicrop ke rasio 4:5.", "success");
                }}
              />

              {/* Background Video Preview & Upload */}
              <div className="space-y-3 border-t border-[#4f4538]/15 pt-4">
                <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">Background Video (Sinematik - Opsional)</span>
                
                <div className="space-y-3">
                  {(videoPreview || existingVideoUrl) ? (
                    <>
                      <div className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded border border-[#4f4538]/30 bg-[#110e09]">
                        <video
                          ref={videoRef}
                          src={videoPreview || existingVideoUrl}
                          controls
                          preload="metadata"
                          className="w-full h-full object-cover"
                          onLoadedMetadata={(e) => {
                            setVideoDuration(e.currentTarget.duration);
                          }}
                          onTimeUpdate={(e) => {
                            if (previewTrimMode) {
                              const start = isTrimConfirmed ? confirmedVideoStart : videoTrimStart;
                              const end = (isTrimConfirmed ? confirmedVideoEnd : videoTrimEnd) ?? videoDuration;
                              if (e.currentTarget.currentTime >= end - 0.1) {
                                if (videoTrimLoop) {
                                  e.currentTarget.currentTime = start;
                                  e.currentTarget.play().catch(() => {});
                                } else {
                                  e.currentTarget.pause();
                                  setPreviewTrimMode(false);
                                }
                              }
                            }
                          }}
                          onEnded={(e) => {
                            if (previewTrimMode) {
                              const start = isTrimConfirmed ? confirmedVideoStart : videoTrimStart;
                              if (videoTrimLoop) {
                                e.currentTarget.currentTime = start;
                                e.currentTarget.play().catch(() => {});
                              } else {
                                setPreviewTrimMode(false);
                              }
                            }
                          }}
                          onPause={() => {
                            if (!videoTrimLoop || !previewTrimMode) {
                              setPreviewTrimMode(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (videoPreview) URL.revokeObjectURL(videoPreview);
                            setVideoFile(null);
                            setVideoPreview("");
                            setExistingVideoUrl("");
                            setVideoTrimStart(0);
                            setVideoTrimEnd(null);
                            setConfirmedVideoStart(0);
                            setConfirmedVideoEnd(null);
                            setIsTrimConfirmed(true);
                            setVideoTrimLoop(true);
                            setVideoDuration(0);
                            setPreviewTrimMode(false);
                          }}
                          className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded text-[10px] uppercase tracking-wider font-subheading transition-colors z-10"
                        >
                          Hapus Video
                        </button>
                      </div>

                      {/* VIDEO TRIM PANEL */}
                      <VideoTrimmer 
                        videoUrl={videoPreview || existingVideoUrl}
                        duration={videoDuration}
                        startTime={videoTrimStart}
                        endTime={videoTrimEnd}
                        loop={videoTrimLoop}
                        onTrimChange={(start, end) => {
                          setVideoTrimStart(start);
                          setVideoTrimEnd(end);
                          setIsTrimConfirmed(false);
                        }}
                        onLoopChange={setVideoTrimLoop}
                        isTrimConfirmed={isTrimConfirmed}
                        onConfirmTrim={() => {
                          const actualEnd = videoTrimEnd === null ? videoDuration : videoTrimEnd;
                          if (videoTrimStart < 0 || (actualEnd > 0 && actualEnd <= videoTrimStart)) {
                            onShowToast("Rentang video tidak valid.", "error");
                            return;
                          }
                          setConfirmedVideoStart(videoTrimStart);
                          setConfirmedVideoEnd(videoTrimEnd);
                          setIsTrimConfirmed(true);
                          onShowToast("Trim video berhasil dikonfirmasi.", "success");
                          if (videoRef.current) {
                            videoRef.current.currentTime = videoTrimStart;
                          }
                        }}
                        previewMode={previewTrimMode}
                        videoRef={videoRef}
                        onPreview={() => {
                          if (videoRef.current) {
                            const startToUse = isTrimConfirmed ? confirmedVideoStart : videoTrimStart;
                            videoRef.current.currentTime = startToUse;
                            if (videoRef.current.paused) {
                              videoRef.current.play().catch(() => {});
                              setPreviewTrimMode(true);
                            } else {
                              videoRef.current.pause();
                              setPreviewTrimMode(false);
                            }
                          }
                        }}
                        onReset={() => {
                           setVideoTrimStart(0);
                           setVideoTrimEnd(null);
                           setConfirmedVideoStart(0);
                           setConfirmedVideoEnd(null);
                           setIsTrimConfirmed(false);
                           if (videoRef.current) {
                             videoRef.current.currentTime = 0;
                             videoRef.current.pause();
                           }
                           setPreviewTrimMode(false);
                           onShowToast("Trim video di-reset ke durasi penuh.", "success");
                        }}
                      />
                    </>
                  ) : (
                    <div className="text-[11px] text-[#9b8f7f] italic">Belum ada video latar yang dipilih.</div>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="bg-[#17130e] hover:bg-[#252019] text-[#eae1d8] border border-[#4f4538]/40 hover:border-[#f6c374] font-subheading text-[10px] uppercase tracking-widest px-4 py-2.5 rounded cursor-pointer transition-all inline-flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-[#f6c374]" />
                      <span>{videoPreview || existingVideoUrl ? "Ganti Video" : "Pilih Video"}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/mov"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const err = validateVideoFile(file);
                          if (err) {
                            onShowToast(err, "error");
                            return;
                          }
                          if (videoPreview) URL.revokeObjectURL(videoPreview);
                          const objUrl = URL.createObjectURL(file);
                          setVideoFile(file);
                          setVideoPreview(objUrl);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Google Drive Link */}
              <div className="space-y-2 border-t border-[#4f4538]/15 pt-4">
                <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">Link Google Drive</span>
                
                <div className="bg-[#110e09]/40 border border-[#4f4538]/20 rounded p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    {activityFormData.google_drive_url && activityFormData.google_drive_url.trim() !== "" ? (
                      <span className="text-emerald-400 font-subheading text-[10px] uppercase tracking-wider flex items-center gap-1 font-semibold">
                        ✓ Link foto tersedia
                      </span>
                    ) : (
                      <span className="text-[#9b8f7f] font-subheading text-[10px] uppercase tracking-wider block font-semibold">
                        Belum ada link foto
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[#9b8f7f] text-[10px]">Tautan Folder Google Drive:</label>
                    <input
                      type="text"
                      value={activityFormData.google_drive_url}
                      onChange={(e) => setActivityFormData(prev => ({ ...prev, google_drive_url: e.target.value }))}
                      placeholder="https://drive.google.com/drive/folders/XXXXXXXXXXXX"
                      className="w-full bg-[#17130e] border border-[#4f4538]/30 rounded py-2 px-3 text-[#eae1d8] focus:outline-none focus:border-[#f6c374] text-xs"
                    />
                    <p className="text-[10px] text-[#9b8f7f] mt-1">
                      Masukkan link tempat seluruh foto kegiatan dapat diambil oleh peserta/siswa.
                    </p>
                  </div>

                  {activityFormData.google_drive_url && activityFormData.google_drive_url.trim() !== "" && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActivityFormData(prev => ({ ...prev, google_drive_url: "" }));
                          onShowToast("Link Google Drive dihapus. Jangan lupa klik Simpan untuk memperbarui.", "success");
                        }}
                        className="bg-red-500/15 hover:bg-red-500/35 text-red-300 font-subheading text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-sm transition-all cursor-pointer"
                      >
                        Hapus Link
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form trigger buttons */}
              <div className="border-t border-[#4f4538]/15 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsActivityFormOpen(false)}
                  className="border border-[#4f4538]/30 hover:bg-[#3e3832]/20 text-[#eae1d8] font-subheading uppercase text-[10px] tracking-widest py-3 px-6 rounded transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading uppercase text-[10px] tracking-widest py-3 px-6 rounded font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {uploadStatusText || "Sedang Mengunggah..."}
                    </>
                  ) : (
                    "Simpan Kegiatan"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- FORM 2: ADD/EDIT PHOTO MODAL POPUP --- */}
      {isPhotoFormOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#17130e] border border-[#4f4538]/30 max-w-xl w-full rounded-sm p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="border-b border-[#4f4538]/20 pb-3">
              <h3 className="font-display text-xl sm:text-2xl font-bold text-[#f6c374]">
                {editingPhoto ? "Edit Foto Kegiatan" : "Upload Foto Kegiatan"}
              </h3>
              <p className="font-body text-xs text-[#9b8f7f] mt-1">
                Unggah foto langsung dari perangkat Anda ke Supabase Storage dan pilih rasio tampilan.
              </p>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-5 font-body text-xs">
              
              {/* Activity select */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8] flex items-center gap-1.5 font-semibold">
                  <span>Pilih Kegiatan Utama</span>
                  <span className="text-[#f6c374]">*</span>
                </label>
                <select
                  required
                  value={photoFormData.activity_id}
                  onChange={(e) => setPhotoFormData(prev => ({ ...prev, activity_id: e.target.value }))}
                  className="w-full bg-[#110e09] border border-[#4f4538]/40 rounded py-2.5 px-3 text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
                >
                  <option value="" disabled>Pilih Kegiatan</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.title}</option>
                  ))}
                </select>
              </div>

              {/* Title info */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8] font-semibold">
                  Judul Foto / Caption (Opsional)
                </label>
                <input
                  type="text"
                  value={photoFormData.title}
                  onChange={(e) => setPhotoFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Momen Pembukaan Acara"
                  className="w-full bg-[#110e09] border border-[#4f4538]/40 rounded py-2.5 px-3 text-[#eae1d8] focus:outline-none focus:border-[#f6c374]"
                />
              </div>

              {/* Photo Upload & Preview Section */}
              <div className="space-y-3 border-t border-[#4f4538]/20 pt-4">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8] flex items-center justify-between font-semibold">
                  <span>Berkas Foto</span>
                  <span className="text-[#9b8f7f] text-[9px] lowercase">format: jpg, png, webp (maks 100mb)</span>
                </label>

                {!photoPreview ? (
                  <div className="relative w-full bg-[#110e09] border-2 border-dashed border-[#4f4538]/40 hover:border-[#f6c374] rounded-md p-8 text-center transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-[#17130e] border border-[#4f4538]/30 flex items-center justify-center text-[#f6c374] group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-subheading text-xs tracking-wider uppercase text-[#eae1d8] block font-semibold">
                          Pilih / Unggah Foto
                        </span>
                        <span className="text-[11px] text-[#9b8f7f] block">
                          Klik untuk memilih berkas dari komputer Anda
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 bg-[#110e09] border border-[#4f4538]/30 rounded-md p-4">
                    
                    {/* Ratio Switcher (16:9 vs 9:16) */}
                    <div className="space-y-2">
                      <span className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f] block">
                        Pilih Rasio Tampilan Foto:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPhotoAspectRatio("landscape")}
                          className={`py-2 px-3 rounded text-xs font-subheading uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            photoAspectRatio === "landscape"
                              ? "bg-[#d8a85c] text-[#110e09] font-bold border-[#d8a85c] shadow"
                              : "bg-[#17130e] text-[#d3c4b3] border-[#4f4538]/40 hover:border-[#f6c374]/60"
                          }`}
                        >
                          <span className="text-sm">🖥️</span>
                          <span>Landscape (16:9)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoAspectRatio("portrait")}
                          className={`py-2 px-3 rounded text-xs font-subheading uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                            photoAspectRatio === "portrait"
                              ? "bg-[#d8a85c] text-[#110e09] font-bold border-[#d8a85c] shadow"
                              : "bg-[#17130e] text-[#d3c4b3] border-[#4f4538]/40 hover:border-[#f6c374]/60"
                          }`}
                        >
                          <span className="text-sm">📱</span>
                          <span>Portrait (9:16)</span>
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Ratio Preview Box */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] text-[#9b8f7f]">
                        <span>Pratinjau Foto ({photoAspectRatio === "landscape" ? "16:9 Landscape" : "9:16 Portrait"}):</span>
                      </div>
                      
                      <div className="bg-[#0c0a07] border border-[#4f4538]/30 rounded overflow-hidden flex items-center justify-center p-2">
                        <div
                          className={`relative overflow-hidden rounded shadow-lg transition-all duration-300 ${
                            photoAspectRatio === "landscape"
                              ? "w-full max-w-md aspect-video"
                              : "max-h-[340px] w-auto aspect-[9/16]"
                          }`}
                        >
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-full h-full object-cover object-center"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-subheading uppercase tracking-wider px-2 py-0.5 rounded text-[#f6c374]">
                            {photoAspectRatio === "landscape" ? "16:9" : "9:16"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions under preview */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button
                          type="button"
                          className="bg-[#17130e] hover:bg-[#3e3832]/30 border border-[#4f4538]/40 text-[#eae1d8] font-subheading text-[10px] uppercase tracking-wider py-1.5 px-3 rounded flex items-center gap-1.5 cursor-pointer pointer-events-none"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#f6c374]" /> Ganti Foto
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (photoPreview && photoPreview.startsWith("blob:")) {
                            URL.revokeObjectURL(photoPreview);
                          }
                          setPhotoFile(null);
                          setPhotoPreview("");
                          setPhotoFormData(prev => ({ ...prev, image_url: "" }));
                        }}
                        className="text-red-400 hover:text-red-300 font-subheading text-[10px] uppercase tracking-wider py-1.5 px-2 cursor-pointer transition-colors"
                      >
                        Hapus Pilihan
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Form trigger buttons */}
              <div className="border-t border-[#4f4538]/15 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (photoPreview && photoPreview.startsWith("blob:")) {
                      URL.revokeObjectURL(photoPreview);
                    }
                    setPhotoFile(null);
                    setPhotoPreview("");
                    setIsPhotoFormOpen(false);
                  }}
                  className="border border-[#4f4538]/30 hover:bg-[#3e3832]/20 text-[#eae1d8] font-subheading uppercase text-[10px] tracking-widest py-3 px-6 rounded transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="bg-[#d8a85c] hover:bg-[#eae1d8] text-[#110e09] font-subheading uppercase text-[10px] tracking-widest py-3 px-6 rounded font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunggah & Menyimpan...
                    </>
                  ) : (
                    "Simpan Foto"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-lg border border-[#4f4538]/30 bg-[#14100b] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2.5 rounded-full bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#eae1d8]">
                Hapus kegiatan ini?
              </h3>
            </div>
            
            <p className="font-body text-xs text-[#9b8f7f] leading-relaxed mb-4">
              Cover, gambar background, dan video yang terkait juga akan dihapus dari penyimpanan.
            </p>

            {activityToDelete.title && (
              <div className="mb-6 p-3 rounded bg-[#110e09] border border-[#4f4538]/20 font-body text-xs text-[#eae1d8] truncate">
                <span className="text-[#9b8f7f] font-subheading text-[10px] tracking-widest uppercase block mb-1">Judul Kegiatan:</span>
                {activityToDelete.title}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#4f4538]/15">
              <button
                type="button"
                disabled={isDeletingActivity}
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2 rounded-sm border border-[#4f4538]/30 font-subheading text-xs tracking-wider uppercase text-[#eae1d8] hover:bg-[#4f4538]/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                disabled={isDeletingActivity}
                onClick={() => handleConfirmDeleteActivity(activityToDelete)}
                className="px-5 py-2 rounded-sm bg-red-600 hover:bg-red-700 text-white font-subheading text-xs tracking-wider uppercase font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeletingActivity ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MENGHAPUS...</span>
                  </>
                ) : (
                  <span>HAPUS</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AdminSlideshowPreview({ activities, duration, transition, blurPercent }: { activities: Activity[]; duration: number; transition: string; blurPercent: number }) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeActs = activities;
  const currentAct = activeActs.length > 0 ? activeActs[previewIndex % activeActs.length] : null;
  const blurPx = Math.round((blurPercent / 100) * 12 * 10) / 10;

  useEffect(() => {
    if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    if (activeActs.length <= 1) return;
    const ms = Math.max(1000, duration * 1000);
    previewTimerRef.current = setInterval(() => {
      setPreviewIndex(prev => (prev + 1) % activeActs.length);
    }, ms);
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [duration, activeActs.length]);

  return (
    <div className="relative aspect-[16/9] w-full max-h-[260px] overflow-hidden rounded border border-[#4f4538]/30 bg-[#110e09] flex items-center justify-center">
      <div className="absolute inset-0">
        <img
          src={currentAct?.cover_image || ""}
          alt=""
          className="w-full h-full object-cover filter brightness-[0.25]"
          style={{ filter: `brightness(0.25) blur(${blurPx}px)` }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 p-6 text-center max-w-lg space-y-2">
        <span className="font-subheading text-[9px] text-[#f6c374] bg-[#110e09]/90 border border-[#f6c374]/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
          {currentAct?.category || "Kegiatan"} ({transition})
        </span>
        <h5 className="font-display text-base sm:text-lg font-bold text-[#eae1d8] uppercase tracking-wide truncate">
          {currentAct?.title || "Judul Kegiatan"}
        </h5>
        <p className="font-body text-[11px] text-[#d3c4b3] line-clamp-2">
          {currentAct?.description || "Deskripsi kegiatan..."}
        </p>
      </div>
    </div>
  );
}
