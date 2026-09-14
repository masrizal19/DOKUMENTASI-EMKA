import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit2, Eye, ShieldAlert, ToggleLeft, ToggleRight, Upload, Sparkles, AlertCircle, X, Check, HelpCircle } from "lucide-react";
import { Twibbon } from "../types";
import { getStoredTwibbons, saveStoredTwibbons, checkPngTransparency, generateMockFrame } from "../lib/twibbonUtils";
import TwibbonEditor from "./TwibbonEditor";

interface AdminTwibonProps {
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function AdminTwibon({ onShowToast }: AdminTwibonProps) {
  const [twibbons, setTwibbons] = useState<Twibbon[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTwibbon, setEditingTwibbon] = useState<Twibbon | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [twibbonToDelete, setTwibbonToDelete] = useState<Twibbon | null>(null);
  
  // Preview modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTwibbon, setPreviewTwibbon] = useState<Twibbon | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    ratio: "1:1" as "1:1" | "4:3" | "16:9" | "9:16",
    designUrl: "",
    isActive: true
  });
  
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isCheckingTransparency, setIsCheckingTransparency] = useState(false);
  const [transparencyWarn, setTransparencyWarn] = useState(false);

  // Initialize data
  useEffect(() => {
    setTwibbons(getStoredTwibbons());
  }, []);

  // Sync data with localStorage
  const refreshList = () => {
    const data = getStoredTwibbons();
    setTwibbons(data);
  };

  // Helper to generate a slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title: val,
      // Auto-generate slug only if we are creating a new one
      slug: editingTwibbon ? prev.slug : generateSlug(val)
    }));
  };

  // Handle transparent file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate PNG
    if (file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png")) {
      onShowToast("File frame harus berupa format PNG transparan.", "error");
      return;
    }

    setUploadedFileName(file.name);
    setIsCheckingTransparency(true);
    setTransparencyWarn(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      
      // Perform automated transparency checks
      const isTransparent = await checkPngTransparency(dataUrl);
      setIsCheckingTransparency(false);
      
      if (!isTransparent) {
        setTransparencyWarn(true);
        onShowToast("Peringatan: Gambar PNG tidak memiliki area transparan!", "error");
      } else {
        onShowToast("Frame PNG transparan terverifikasi dengan sukses.", "success");
      }

      setFormData((prev) => ({ ...prev, designUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Toggle active campaign
  const handleToggleActive = (twibbon: Twibbon, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = twibbons.map((t) =>
      t.id === twibbon.id ? { ...t, isActive: !t.isActive } : t
    );
    saveStoredTwibbons(updated);
    setTwibbons(updated);
    onShowToast(
      `Kampanye "${twibbon.title}" berhasil ${!twibbon.isActive ? "diaktifkan" : "dinonaktifkan"}.`,
      "success"
    );
  };

  // Open creation form
  const openCreateModal = () => {
    setEditingTwibbon(null);
    setUploadedFileName("");
    setTransparencyWarn(false);
    setIsCheckingTransparency(false);
    setFormData({
      title: "",
      slug: "",
      description: "",
      ratio: "1:1",
      designUrl: "",
      isActive: true
    });
    setIsFormOpen(true);
  };

  // Open edit form
  const openEditModal = (twibbon: Twibbon) => {
    setEditingTwibbon(twibbon);
    setUploadedFileName("frame_existing.png");
    setTransparencyWarn(false);
    setIsCheckingTransparency(false);
    setFormData({
      title: twibbon.title,
      slug: twibbon.slug,
      description: twibbon.description,
      ratio: twibbon.ratio,
      designUrl: twibbon.designUrl,
      isActive: twibbon.isActive
    });
    setIsFormOpen(true);
  };

  // Submit form (Save / Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      onShowToast("Judul kampanye tidak boleh kosong.", "error");
      return;
    }
    if (!formData.slug.trim()) {
      onShowToast("Slug kampanye tidak boleh kosong.", "error");
      return;
    }

    // Check slug duplication
    const duplicate = twibbons.find(
      (t) => t.slug === formData.slug && (!editingTwibbon || t.id !== editingTwibbon.id)
    );
    if (duplicate) {
      onShowToast("Slug kampanye sudah digunakan oleh kampanye lain.", "error");
      return;
    }

    let finalDesignUrl = formData.designUrl;
    // Generate fallback template design if no file uploaded
    if (!finalDesignUrl) {
      onShowToast("Membuat desain frame template emas otomatis untuk kampanye...", "success");
      finalDesignUrl = generateMockFrame(formData.title, formData.ratio);
    }

    let updatedTwibbons: Twibbon[] = [];

    if (editingTwibbon) {
      // Update existing
      updatedTwibbons = twibbons.map((t) =>
        t.id === editingTwibbon.id
          ? {
              ...t,
              title: formData.title,
              slug: formData.slug,
              description: formData.description,
              ratio: formData.ratio,
              designUrl: finalDesignUrl,
              isActive: formData.isActive
            }
          : t
      );
      onShowToast(`Kampanye "${formData.title}" berhasil diperbarui.`, "success");
    } else {
      // Create new campaign
      const newTwibbon: Twibbon = {
        id: Date.now().toString(),
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        ratio: formData.ratio,
        designUrl: finalDesignUrl,
        isActive: formData.isActive,
        useCount: 0,
        createdAt: new Date().toISOString()
      };
      updatedTwibbons = [newTwibbon, ...twibbons];
      onShowToast(`Kampanye Twibbon "${formData.title}" berhasil dibuat!`, "success");
    }

    saveStoredTwibbons(updatedTwibbons);
    setTwibbons(updatedTwibbons);
    setIsFormOpen(false);
  };

  // Handle delete trigger
  const confirmDelete = (twibbon: Twibbon, e: React.MouseEvent) => {
    e.stopPropagation();
    setTwibbonToDelete(twibbon);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!twibbonToDelete) return;
    const updated = twibbons.filter((t) => t.id !== twibbonToDelete.id);
    saveStoredTwibbons(updated);
    setTwibbons(updated);
    setIsDeleteModalOpen(false);
    onShowToast(`Kampanye "${twibbonToDelete.title}" telah dihapus secara permanen.`, "success");
    setTwibbonToDelete(null);
  };

  // Open workspace preview
  const handlePreview = (twibbon: Twibbon, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewTwibbon(twibbon);
    setIsPreviewOpen(true);
  };

  // Filter campaigns
  const filteredTwibbons = twibbons.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="font-subheading text-[10px] tracking-widest text-[#f6c374] uppercase block">
            MODUL KAMPANYE PROMOSI
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#eae1d8]">
            Daftar Twibon
          </h2>
          <p className="font-body text-xs text-[#9b8f7f]">
            Kelola frame kampanye promosi sekolah secara real-time menggunakan penyimpanan lokal.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-[#d8a85c] hover:bg-[#f6c374] text-[#110e09] font-subheading text-xs tracking-widest uppercase font-bold py-3 px-6 rounded-sm transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> TAMBAH KAMPANYE
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex bg-[#110e09] border border-[#4f4538]/15 p-4 rounded-sm items-center gap-3">
        <Search className="w-5 h-5 text-[#9b8f7f] shrink-0" />
        <input
          type="text"
          placeholder="Cari nama kampanye, slug, atau deskripsi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none text-[#eae1d8] font-body text-xs placeholder:text-[#4f4538] focus:outline-none"
        />
      </div>

      {/* TWIBBON GRID */}
      {filteredTwibbons.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#110e09]/40 border border-dashed border-[#4f4538]/20 rounded-sm space-y-4">
          <div className="w-12 h-12 rounded-full border border-[#4f4538]/30 flex items-center justify-center text-[#9b8f7f] bg-[#110e09]">
            <HelpCircle className="w-6 h-6" />
          </div>
          <p className="font-body text-xs text-[#9b8f7f] max-w-sm leading-relaxed">
            Tidak ada kampanye Twibbon yang cocok dengan pencarian Anda atau belum ada kampanye yang ditambahkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTwibbons.map((twibbon) => (
            <div
              key={twibbon.id}
              className={`bg-[#110e09] border transition-all duration-300 rounded-sm p-5 space-y-4 shadow-lg flex flex-col justify-between ${
                twibbon.isActive ? "border-[#4f4538]/20 hover:border-[#f6c374]/30" : "border-[#4f4538]/10 opacity-70"
              }`}
            >
              <div className="space-y-4">
                {/* Visual Thumbnail Frame Container */}
                <div className="aspect-square w-full rounded-sm overflow-hidden bg-[#17130e] border border-[#4f4538]/20 relative flex items-center justify-center p-2">
                  {/* Checkerboard inside */}
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: "linear-gradient(45deg, #1f1a12 25%, transparent 25%), linear-gradient(-45deg, #1f1a12 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1a12 75%), linear-gradient(-45deg, transparent 75%, #1f1a12 75%)",
                      backgroundSize: "15px 15px",
                      backgroundPosition: "0 0, 0 7.5px, 7.5px -7.5px, -7.5px 0px"
                    }}
                  />
                  <img
                    src={twibbon.designUrl}
                    alt={twibbon.title}
                    className="max-w-full max-h-full object-contain relative z-10"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 bg-[#110e09]/90 border border-[#4f4538]/30 font-subheading text-[9px] tracking-widest text-[#f6c374] px-2.5 py-1 rounded-sm uppercase">
                    Rasio {twibbon.ratio}
                  </span>
                </div>

                {/* Title & Stats */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display text-sm font-bold text-[#eae1d8] line-clamp-1">
                      {twibbon.title}
                    </h3>
                    <span className="font-subheading text-[10px] tracking-wider text-[#9b8f7f] bg-[#17130e] px-2 py-0.5 rounded-sm shrink-0 border border-[#4f4538]/10">
                      {twibbon.useCount} Diunduh
                    </span>
                  </div>
                  
                  {/* Public link copy button or visual */}
                  <p className="font-body text-[10px] text-[#f6c374]/80 break-all bg-[#17130e]/50 py-1 px-2 rounded-sm border border-[#4f4538]/5">
                    /twibon/{twibbon.slug}
                  </p>

                  <p className="font-body text-xs text-[#9b8f7f] line-clamp-2 leading-relaxed">
                    {twibbon.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#4f4538]/10 mt-2">
                <button
                  onClick={(e) => handleToggleActive(twibbon, e)}
                  className="flex items-center gap-1.5 font-subheading text-[10px] tracking-wider uppercase text-[#d3c4b3] hover:text-[#eae1d8]"
                  title={twibbon.isActive ? "Nonaktifkan" : "Aktifkan"}
                >
                  {twibbon.isActive ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-green-500" />
                      <span>Aktif</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-[#4f4538]" />
                      <span>Draft</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => handlePreview(twibbon, e)}
                    className="p-2 rounded-sm bg-[#17130e] border border-[#4f4538]/25 text-[#f6c374] hover:bg-[#39342e]/30 transition-all"
                    title="Uji Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(twibbon)}
                    className="p-2 rounded-sm bg-[#17130e] border border-[#4f4538]/25 text-[#d3c4b3] hover:bg-[#39342e]/30 transition-all"
                    title="Edit Kampanye"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => confirmDelete(twibbon, e)}
                    className="p-2 rounded-sm bg-[#17130e] border border-[#4f4538]/25 text-red-400 hover:bg-red-950/20 transition-all"
                    title="Hapus Kampanye"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE & EDIT CAMPAIGN MODAL FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#17130e] border border-[#4f4538]/20 rounded-sm w-full max-w-xl shadow-2xl overflow-hidden my-8">
            <div className="bg-[#110e09] border-b border-[#4f4538]/15 py-4 px-6 flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#f6c374]">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-display text-sm font-bold tracking-wider uppercase">
                  {editingTwibbon ? "Edit Kampanye Twibon" : "Kampanye Twibon Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-[#9b8f7f] hover:text-[#eae1d8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Campaign Title */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold block">
                  Judul Kampanye <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MPLS SMK MULTI KARYA 2026"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full bg-[#110e09] border border-[#4f4538]/20 rounded-sm py-2 px-3 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]/50"
                />
              </div>

              {/* Campaign Slug */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold block">
                  Slug URL <span className="text-red-400">*</span>
                </label>
                <div className="flex bg-[#110e09] border border-[#4f4538]/20 rounded-sm overflow-hidden text-xs">
                  <span className="bg-[#17130e] py-2 px-3 text-[#4f4538] border-r border-[#4f4538]/20 select-none">
                    /twibon/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="mpls-2026"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))
                    }
                    className="flex-1 bg-transparent py-2 px-3 text-[#eae1d8] focus:outline-none"
                  />
                </div>
              </div>

              {/* Campaign Description */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold block">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan petunjuk singkat atau ajakan promosi tentang twibbon ini..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#110e09] border border-[#4f4538]/20 rounded-sm py-2 px-3 text-xs text-[#eae1d8] focus:outline-none focus:border-[#f6c374]/50 resize-none"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold block">
                  Rasio Frame
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["1:1", "4:3", "16:9", "9:16"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, ratio: r }))}
                      className={`py-2 rounded-sm border text-[10px] font-subheading tracking-wider uppercase text-center transition-all ${
                        formData.ratio === r
                          ? "bg-[#d8a85c] text-[#110e09] border-[#d8a85c] font-bold"
                          : "bg-[#110e09] text-[#9b8f7f] border-[#4f4538]/20 hover:border-[#4f4538]/50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* PNG Frame File Upload */}
              <div className="space-y-1.5">
                <label className="font-subheading text-[10px] tracking-widest text-[#9b8f7f] uppercase font-bold block">
                  Desain Frame PNG (Wajib Transparansi)
                </label>
                
                <div className="bg-[#110e09] border border-dashed border-[#4f4538]/20 rounded-sm p-4 flex flex-col items-center justify-center text-center space-y-3">
                  <Upload className="w-8 h-8 text-[#f6c374]" />
                  
                  <div className="space-y-1">
                    <p className="font-subheading text-[10px] tracking-wider text-[#eae1d8] uppercase font-bold">
                      {uploadedFileName || "Pilih File PNG Transparan"}
                    </p>
                    <p className="font-body text-[10px] text-[#4f4538]">
                      Format PNG maksimal 5MB. Kosongkan untuk menggunakan template otomatis.
                    </p>
                  </div>

                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="twibbon-frame-input"
                  />
                  <label
                    htmlFor="twibbon-frame-input"
                    className="bg-[#17130e] hover:bg-[#39342e]/30 text-[#eae1d8] border border-[#4f4538]/30 font-subheading text-[9px] tracking-widest uppercase py-2 px-4 rounded-sm transition-all cursor-pointer font-bold inline-block"
                  >
                    PILIH FILE FRAME
                  </label>
                </div>

                {/* Transparency Validation Warnings */}
                {isCheckingTransparency && (
                  <p className="font-body text-[10px] text-[#f6c374] animate-pulse">
                    Menganalisis transparansi alfa file gambar...
                  </p>
                )}

                {transparencyWarn && (
                  <div className="bg-red-950/20 border border-red-500/20 rounded-sm p-3 flex gap-2.5 items-start text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <p className="font-body text-[10px] leading-relaxed">
                      <strong>Peringatan Transparansi!</strong> File gambar ini terdeteksi sepenuhnya solid. Pengguna publik tidak akan bisa menaruh foto di belakang frame ini. Pastikan Anda mengunggah format PNG yang transparan.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit / Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#4f4538]/10 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-[#110e09] border border-[#4f4538]/25 hover:bg-[#17130e] text-[#d3c4b3] font-subheading text-xs tracking-widest uppercase py-3 rounded-sm font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#d8a85c] hover:bg-[#f6c374] text-[#110e09] font-subheading text-xs tracking-widest uppercase py-3 rounded-sm font-bold transition-all shadow-md"
                >
                  SIMPAN KAMPANYE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && twibbonToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#17130e] border border-red-500/20 rounded-sm w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-red-950/35 border-b border-red-500/10 p-4 flex gap-2 items-center text-red-300 font-display font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-red-400" /> Hapus Kampanye?
            </div>
            <div className="p-5 space-y-4">
              <p className="font-body text-xs text-[#d3c4b3] leading-relaxed">
                Apakah Anda yakin ingin menghapus kampanye Twibbon <strong>{twibbonToDelete.title}</strong>? Seluruh statistik unduhan akan ikut terhapus permanen dari lokal browser.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 bg-[#110e09] border border-[#4f4538]/25 text-[#d3c4b3] font-subheading text-xs tracking-widest uppercase py-2.5 rounded-sm transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-subheading text-xs tracking-widest uppercase py-2.5 rounded-sm transition-all font-bold"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE PREVIEW MODAL */}
      {isPreviewOpen && previewTwibbon && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#17130e] border border-[#4f4538]/20 rounded-sm w-full max-w-lg shadow-2xl overflow-hidden my-8">
            <div className="bg-[#110e09] border-b border-[#4f4538]/15 py-4 px-6 flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="font-subheading text-[9px] tracking-widest text-[#f6c374] uppercase block font-bold">
                  Simulasi Pengujian Frame
                </span>
                <h3 className="font-display text-sm font-bold tracking-tight text-[#eae1d8]">
                  {previewTwibbon.title}
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-[#9b8f7f] hover:text-[#eae1d8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <TwibbonEditor
                ratio={previewTwibbon.ratio}
                frameUrl={previewTwibbon.designUrl}
                slug={previewTwibbon.slug}
                title={previewTwibbon.title}
                onShowToast={onShowToast}
                onDownloadCompleted={() => {
                  // Admin download increment locally for test
                  const updated = twibbons.map((t) =>
                    t.id === previewTwibbon.id ? { ...t, useCount: t.useCount + 1 } : t
                  );
                  saveStoredTwibbons(updated);
                  setTwibbons(updated);
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
