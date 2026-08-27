import React, { useState, useEffect } from "react";
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

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function AdminDashboard({ token, onLogout, onShowToast }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "activities" | "photos" | "settings">("dashboard");
  const [settingsSubTab, setSettingsSubTab] = useState<"school" | "hero" | "about" | "vision" | "sections">("school");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityFormData, setActivityFormData] = useState({
    title: "",
    category: "",
    date: "",
    description: "",
    cover_image: "",
    background_video: "",
    google_drive_url: "",
    status: "draft" as "published" | "draft"
  });

  const [isPhotoFormOpen, setIsPhotoFormOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [photoFormData, setPhotoFormData] = useState({
    activity_id: "",
    title: "",
    image_url: "",
    sort_order: 1
  });

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
    sections: []
  });

  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedActivityForPhotos, setSelectedActivityForPhotos] = useState<string>("all");

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "Authorization": token }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
        setPhotos(data.photos || []);
        setSettings(data.settings || null);
        if (data.settings) {
          setSettingsFormData({
            site_name: data.settings.site_name || "",
            logo: data.settings.logo || "",
            whatsapp: data.settings.whatsapp || "",
            accent_color: data.settings.accent_color || "#f6c374",
            updated_at: data.settings.updated_at || "",
            school_name: data.settings.school_name || "",
            address: data.settings.address || "",
            city: data.settings.city || "",
            province: data.settings.province || "",
            country: data.settings.country || "",
            email: data.settings.email || "",
            phone: data.settings.phone || "",
            tata_usaha: data.settings.tata_usaha || "",
            whatsapp_title: data.settings.whatsapp_title || "",
            whatsapp_description: data.settings.whatsapp_description || "",
            about_title: data.settings.about_title || "",
            about_desc1: data.settings.about_desc1 || "",
            about_desc2: data.settings.about_desc2 || "",
            about_photo: data.settings.about_photo || "",
            vision_title: data.settings.vision_title || "",
            vision_content: data.settings.vision_content || "",
            missions: data.settings.missions || [],
            hero_label: data.settings.hero_label || "",
            hero_title: data.settings.hero_title || "",
            hero_description: data.settings.hero_description || "",
            hero_image: data.settings.hero_image || "",
            hero_video: data.settings.hero_video || "",
            hero_source: data.settings.hero_source || "auto",
            hero_activity_id: data.settings.hero_activity_id || "",
            sections: data.settings.sections || []
          });
        }
      } else {
        onShowToast("Sesi habis atau tidak sah. Silakan login kembali.", "error");
        onLogout();
      }
    } catch (err) {
      onShowToast("Gagal mengambil data dari server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Base64 file upload for Activity Cover or Photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: "cover_image" | "background_video" | "photo_url") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          },
          body: JSON.stringify({
            filename: file.name,
            content: base64String
          })
        });

        const data = await res.json();
        if (res.ok && data.url) {
          onShowToast("File berhasil diunggah ke server.", "success");
          if (targetField === "cover_image") {
            setActivityFormData(prev => ({ ...prev, cover_image: data.url }));
          } else if (targetField === "background_video") {
            setActivityFormData(prev => ({ ...prev, background_video: data.url }));
          } else if (targetField === "photo_url") {
            setPhotoFormData(prev => ({ ...prev, image_url: data.url }));
          }
        } else {
          onShowToast(data.error || "Gagal mengunggah file.", "error");
        }
      } catch (err) {
        onShowToast("Kesalahan jaringan saat mengunggah file.", "error");
      } finally {
        setUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Activity CRUD
  const handleOpenAddActivity = () => {
    setEditingActivity(null);
    setActivityFormData({
      title: "",
      category: "Kegiatan Sekolah",
      date: new Date().toISOString().split("T")[0],
      description: "",
      cover_image: "",
      background_video: "",
      google_drive_url: "",
      status: "draft"
    });
    setIsActivityFormOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    setEditingActivity(act);
    setActivityFormData({
      title: act.title,
      category: act.category,
      date: act.date,
      description: act.description,
      cover_image: act.cover_image,
      background_video: act.background_video || "",
      google_drive_url: act.google_drive_url || "",
      status: act.status
    });
    setIsActivityFormOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityFormData.title) {
      onShowToast("Judul kegiatan wajib diisi.", "error");
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

    try {
      const url = editingActivity
        ? `/api/admin/activities/${editingActivity.id}`
        : "/api/admin/activities";
      const method = editingActivity ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(activityFormData)
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(
          editingActivity ? "Kegiatan berhasil diperbarui." : "Kegiatan baru berhasil ditambahkan.",
          "success"
        );
        setIsActivityFormOpen(false);
        fetchData();
      } else {
        onShowToast(data.error || "Gagal menyimpan kegiatan.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm("Hapus kegiatan ini beserta seluruh foto di dalamnya? Tindakan ini tidak dapat dibatalkan.")) return;

    try {
      const res = await fetch(`/api/admin/activities/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        onShowToast("Kegiatan berhasil dihapus.", "success");
        fetchData();
      } else {
        onShowToast("Gagal menghapus kegiatan.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
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
      const url = editingPhoto
        ? `/api/admin/photos/${editingPhoto.id}`
        : "/api/admin/photos";
      const method = editingPhoto ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(photoFormData)
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast(
          editingPhoto ? "Detail foto berhasil diperbarui." : "Foto berhasil ditambahkan.",
          "success"
        );
        setIsPhotoFormOpen(false);
        fetchData();
      } else {
        onShowToast(data.error || "Gagal menyimpan foto. Silakan periksa kembali link tautan foto.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm("Hapus foto ini?")) return;

    try {
      const res = await fetch(`/api/admin/photos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        onShowToast("Foto berhasil dihapus.", "success");
        fetchData();
      } else {
        onShowToast("Gagal menghapus foto.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
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
      const res = await fetch("/api/admin/photos/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ orders: updatedOrders })
      });

      if (res.ok) {
        onShowToast("Urutan foto berhasil diubah.", "success");
        fetchData();
      } else {
        onShowToast("Gagal menyimpan perubahan urutan.", "error");
      }
    } catch (err) {
      onShowToast("Kesalahan jaringan.", "error");
    }
  };

  const handleSetCoverImage = async (photo: Photo) => {
    try {
      const res = await fetch(`/api/admin/activities/${photo.activity_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ cover_image: photo.image_url })
      });

      if (res.ok) {
        onShowToast("Foto ini berhasil dijadikan Cover Utama kegiatan.", "success");
        fetchData();
      } else {
        onShowToast("Gagal mengatur cover kegiatan.", "error");
      }
    } catch (err) {
      onShowToast("Kesalahan jaringan.", "error");
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
      const res = await fetch("/api/admin/settings/reset-layout", {
        method: "POST",
        headers: { "Authorization": token }
      });
      if (res.ok) {
        onShowToast("Tata letak beranda berhasil disetel ulang ke konfigurasi bawaan.", "success");
        fetchData();
      } else {
        onShowToast("Gagal menyetel ulang tata letak.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify(settingsFormData)
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("Pengaturan sistem berhasil disimpan.", "success");
        fetchData();
      } else {
        onShowToast(data.error || "Gagal menyimpan pengaturan.", "error");
      }
    } catch (err) {
      onShowToast("Terjadi kesalahan jaringan.", "error");
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
                                onClick={() => handleDeleteActivity(act.id)}
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

                    <div className="space-y-2">
                      <label className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                        Tautan Foto Filosofi / Pendukung
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsFormData.about_photo}
                        onChange={(e) => setSettingsFormData(prev => ({ ...prev, about_photo: e.target.value }))}
                        className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded-sm py-2.5 px-4 font-body text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374] transition-colors"
                      />
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

                  <div className="space-y-4">
                    {settingsFormData.sections.map((sec, sIdx) => (
                      <div key={sec.id} className="bg-[#110e09]/60 border border-[#4f4538]/20 rounded p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#4f4538]/10 pb-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`check-${sec.id}`}
                              checked={sec.enabled}
                              onChange={(e) => {
                                const updated = [...settingsFormData.sections];
                                updated[sIdx].enabled = e.target.checked;
                                setSettingsFormData(prev => ({ ...prev, sections: updated }));
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
                              disabled={sIdx === 0}
                              onClick={() => handleMoveSection(sec.id, "up")}
                              className="p-1 border border-[#4f4538]/30 hover:border-[#f6c374] hover:text-[#f6c374] rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                              title="Pindahkan ke atas"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={sIdx === settingsFormData.sections.length - 1}
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
                                const updated = [...settingsFormData.sections];
                                updated[sIdx].custom_label = e.target.value;
                                setSettingsFormData(prev => ({ ...prev, sections: updated }));
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
                                    const updated = [...settingsFormData.sections];
                                    const val = e.target.value;
                                    updated[sIdx].item_limit = val === "all" ? "all" : Number(val);
                                    setSettingsFormData(prev => ({ ...prev, sections: updated }));
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
                                    const updated = [...settingsFormData.sections];
                                    updated[sIdx].sorting = e.target.value as "latest" | "oldest";
                                    setSettingsFormData(prev => ({ ...prev, sections: updated }));
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
                    ))}
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

              {/* Cover Image Upload/Link */}
              <div className="space-y-2 border-t border-[#4f4538]/15 pt-4">
                <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">Foto Utama / Cover</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Link */}
                  <div className="space-y-1">
                    <label className="text-[#9b8f7f] text-[10px]">Tautan Link Foto URL:</label>
                    <input
                      type="text"
                      value={activityFormData.cover_image}
                      onChange={(e) => setActivityFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 focus:outline-none focus:border-[#f6c374]"
                    />
                  </div>

                  {/* Option B: Local File upload */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[#9b8f7f] text-[10px]">Atau Unggah Foto dari Perangkat:</label>
                    <div className="relative w-full bg-[#110e09] border border-dashed border-[#4f4538]/40 hover:border-[#f6c374] rounded p-2 text-center transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "cover_image")}
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

              {/* Background Video Upload/Link */}
              <div className="space-y-2 border-t border-[#4f4538]/15 pt-4">
                <span className="block font-subheading text-[10px] uppercase tracking-widest text-[#eae1d8]">Background Video (Sinematik)</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Link */}
                  <div className="space-y-1">
                    <label className="text-[#9b8f7f] text-[10px]">Tautan Link Video (.mp4):</label>
                    <input
                      type="text"
                      value={activityFormData.background_video}
                      onChange={(e) => setActivityFormData(prev => ({ ...prev, background_video: e.target.value }))}
                      placeholder="https://example.com/loop.mp4"
                      className="w-full bg-[#110e09] border border-[#4f4538]/30 rounded py-2 px-3 focus:outline-none focus:border-[#f6c374]"
                    />
                  </div>

                  {/* Option B: Local File upload */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[#9b8f7f] text-[10px]">Atau Unggah Video (.mp4 / .webm):</label>
                    <div className="relative w-full bg-[#110e09] border border-dashed border-[#4f4538]/40 hover:border-[#f6c374] rounded p-2 text-center transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e, "background_video")}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex items-center justify-center gap-2 text-[#9b8f7f]">
                        <Upload className="w-4 h-4 text-[#f6c374]" />
                        <span>Pilih Video</span>
                      </div>
                    </div>
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengunggah
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

    </div>
  );
}
