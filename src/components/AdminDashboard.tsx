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
  FileText
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
    slideshow_duration: 5,
    slideshow_transition: "Fade",
    slideshow_blur: 35
  });

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
          slideshow_duration: raw.slideshow_duration ?? 5,
          slideshow_transition: raw.slideshow_transition ?? "Fade",
          slideshow_blur: raw.slideshow_blur ?? 35,
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
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[SUPABASE SESSION]', session);

    console.log('[UPLOAD START]', {
      bucket: 'gallery-media',
      path: filePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      hasSession: !!session
    });

    const { data, error } = await supabase.storage
      .from('gallery-media')
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
        userMessage = "Masalah permission Storage (403 Unauthorized / RLS policy error). Pastikan policy Supabase Storage 'gallery-media' sudah diatur.";
      } else if (statusCode === 404 || error.message?.includes('Bucket not found')) {
        userMessage = "Bucket 'gallery-media' tidak ditemukan di Supabase Storage.";
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
      .from('gallery-media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Cleanup object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [coverPreview, videoPreview]);

  // Handle File upload for Photo Tab
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "photo_url") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) {
      onShowToast(err, "error");
      return;
    }

    setUploadLoading(true);
    try {
      const publicUrl = await uploadFileToSupabase(file, 'images');
      setPhotoFormData(prev => ({ ...prev, image_url: publicUrl }));
      onShowToast("File berhasil diunggah ke Supabase Storage.", "success");
    } catch (err: any) {
      onShowToast(err.message || "Gagal memproses file.", "error");
    } finally {
      setUploadLoading(false);
    }
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

      // 4. Extract storage object paths for 'gallery-media' bucket (Requirement B & C)
      const pathsToRemove: string[] = [];
      const coverPath = getStorageObjectPath(cover_image, 'gallery-media');
      const bgImagePath = getStorageObjectPath(background_image, 'gallery-media');
      const bgVideoPath = getStorageObjectPath(background_video, 'gallery-media');

      if (coverPath) pathsToRemove.push(coverPath);
      if (bgImagePath) pathsToRemove.push(bgImagePath);
      if (bgVideoPath) pathsToRemove.push(bgVideoPath);

      const uniquePaths = Array.from(new Set(pathsToRemove));

      if (uniquePaths.length > 0) {
        console.log('[DELETE ACTIVITY] Removing storage files:', uniquePaths);
        const { error: storageErr } = await supabase.storage
          .from('gallery-media')
          .remove(uniquePaths);

        if (storageErr) {
          console.warn('[DELETE ACTIVITY] Storage deletion warning:', storageErr);
          // Storage removal warning shouldn't block database deletion
        }
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
    setEditingPhoto(null);
    setPhotoFormData({
      activity_id: selectedActivityForPhotos !== "all" ? selectedActivityForPhotos : (activities[0]?.id || ""),
      title: "",
      image_url: "",
      sort_order: photos.filter(p => p.activity_id === selectedActivityForPhotos).length + 1
    });
    setIsPhotoFormOpen(true);
  };

  const handleOpenEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
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
    if (!photoFormData.activity_id || !photoFormData.image_url) {
      onShowToast("Pilih Kegiatan dan unggah/masukkan link foto.", "error");
      return;
    }

    try {
      const photoId = editingPhoto ? editingPhoto.id : `photo-${Date.now()}`;
      const dbRow = {
        id: photoId,
        activity_id: photoFormData.activity_id,
        type: "image",
        url: photoFormData.image_url,
        caption: photoFormData.title,
        sort_order: photoFormData.sort_order || 0
      };

      const { error } = await supabase
        .from("activity_media")
        .upsert(dbRow);

      if (error) {
        onShowToast(error.message || "Gagal menyimpan foto.", "error");
        return;
      }

      // Also upsert to latest_photos table
      const latestRow = {
        id: photoId,
        image_url: photoFormData.image_url,
        caption: photoFormData.title,
        activity_id: photoFormData.activity_id,
        sort_order: photoFormData.sort_order || 0,
        published: true
      };
      await supabase.from("latest_photos").upsert(latestRow);

      onShowToast(
        editingPhoto ? "Detail foto berhasil diperbarui." : "Foto berhasil ditambahkan.",
        "success"
      );
      setIsPhotoFormOpen(false);
      fetchData();
    } catch (err) {
      onShowToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm("Hapus foto ini?")) return;

    try {
      const { error } = await supabase
        .from("activity_media")
        .delete()
        .eq("id", id);

      if (error) {
        onShowToast(error.message || "Gagal menghapus foto.", "error");
        return;
      }

      await supabase.from("latest_photos").delete().eq("id", id);

      onShowToast("Foto berhasil dihapus.", "success");
      fetchData();
    } catch (err) {
      onShowToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Reordering handler
  const handleMovePhoto = async (photo: Photo, direction: "up" | "down") => {
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

        await supabase
          .from("latest_photos")
          .update({ sort_order: order.sort_order })
          .eq("id", order.id);
      }

      onShowToast("Urutan foto berhasil diubah.", "success");
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

                  <div className="border-t border-[#4f4538]/10 pt-6 mt-8">
                    <h4 className="font-display text-sm font-bold text-[#f6c374] mb-1 uppercase tracking-wider">Pengaturan Slideshow</h4>
                    <p className="text-xs text-[#9b8f7f] mb-6">Atur durasi, gaya transisi, dan tingkat keburaman slideshow pada halaman utama.</p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
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
                              <span>Tingkat Keburaman</span>
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

                      <div className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4">
                        <h5 className="text-[10px] text-[#9b8f7f] uppercase font-subheading mb-3">Preview Slideshow</h5>
                        
                        <div className="relative aspect-video rounded overflow-hidden bg-[#17130e] border border-[#4f4538]/40 flex items-center justify-center">
                          <img 
                             src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80" 
                             alt="preview"
                             className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 transform scale-105"
                             style={{ filter: `brightness(0.5) blur(${((settingsFormData.slideshow_blur ?? 35) / 100) * 12}px)` }}
                          />
                          <div className="relative z-10 text-center space-y-1">
                             <div className="text-white font-display font-bold text-sm shadow-black drop-shadow-md">PREVIEW FOTO</div>
                             <div className="text-white/90 text-[10px] font-subheading bg-black/60 px-3 py-2 rounded backdrop-blur">
                               Transisi: {settingsFormData.slideshow_transition ?? 'Fade'} <br/>
                               Durasi: {settingsFormData.slideshow_duration ?? 5} detik <br/>
                               Blur: {settingsFormData.slideshow_blur ?? 35}%
                             </div>
                          </div>
                        </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#17130e] border border-[#4f4538]/20 max-w-xl w-full rounded-sm p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#f6c374]">
              {editingPhoto ? "Edit Detail Foto" : "Unggah/Tambah Foto Baru"}
            </h3>

            <form onSubmit={handleSavePhoto} className="space-y-4 font-body text-xs">
              
              {/* Activity select */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Pilih Kegiatan Utama</label>
                <select
                  required
                  value={photoFormData.activity_id}
                  onChange={(e) => setPhotoFormData(prev => ({ ...prev, activity_id: e.target.value }))}
                  className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                >
                  <option value="" disabled>Pilih Kegiatan</option>
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>{act.title}</option>
                  ))}
                </select>
              </div>

              {/* Title info */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] uppercase tracking-widest text-[#9b8f7f]">Judul Foto / Caption</label>
                <input
                  type="text"
                  value={photoFormData.title}
                  onChange={(e) => setPhotoFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Ekspresi Bahagia Siswa"
                  className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2.5 px-3 focus:outline-none focus:border-[#f6c374]"
                />
              </div>

              {/* Image upload options */}
              <div className="space-y-2 border-t border-[#4f4538]/15 pt-4">
                <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">Unggah Foto</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Link Option */}
                  <div className="space-y-1">
                    <label className="text-[#9b8f7f] text-[10px]">Tautan Link Link Foto URL:</label>
                    <input
                      type="text"
                      value={photoFormData.image_url}
                      onChange={(e) => setPhotoFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 focus:outline-none focus:border-[#f6c374]"
                    />
                  </div>

                  {/* File Upload Option */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[#9b8f7f] text-[10px]">Atau Unggah Berkas Gambar:</label>
                    <div className="relative w-full bg-[#110e09] border border-dashed border-[#4f4538]/40 hover:border-[#f6c374] rounded p-2 text-center transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "photo_url")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center justify-center gap-2 text-[#9b8f7f]">
                        <Upload className="w-4 h-4 text-[#f6c374]" />
                        <span>Pilih Gambar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form trigger buttons */}
              <div className="border-t border-[#4f4538]/15 pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPhotoFormOpen(false)}
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunggah
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
