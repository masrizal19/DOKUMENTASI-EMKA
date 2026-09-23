import { useState, useEffect } from "react";
import { Sparkles, Share2, ArrowLeft, Download, Info, HelpCircle, Heart, Search, Calendar, ChevronRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { Twibbon } from "../types";
import { clearLegacyTwibbonCache, generateMockFrame } from "../lib/twibbonUtils";
import { fetchTwibbons, fetchTwibbonDetail, incrementTwibbonUse } from "../lib/api";
import TwibbonEditor from "./TwibbonEditor";

interface PublicTwibonProps {
  campaignSlug?: string;
  onNavigate: (tab: string, slug?: string) => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function PublicTwibon({
  campaignSlug,
  onNavigate,
  onShowToast
}: PublicTwibonProps) {
  const [twibbons, setTwibbons] = useState<Twibbon[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Twibbon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Load campaigns from MySQL via PHP Backend (Single Source of Truth)
  useEffect(() => {
    let isMounted = true;
    clearLegacyTwibbonCache();

    async function loadData() {
      setIsLoading(true);
      setNotFound(false);

      if (campaignSlug) {
        // Fetch detail Twibon directly from PHP API
        const res = await fetchTwibbonDetail(campaignSlug);
        if (!isMounted) return;

        if (res.data && res.data.isActive) {
          setActiveCampaign(res.data);
          setNotFound(false);
        } else {
          setActiveCampaign(null);
          setNotFound(true);
          onShowToast("Twibon tidak ditemukan atau sudah dihapus.", "error");
        }
      } else {
        // Fetch published/active Twibons list from PHP API
        setActiveCampaign(null);
        setNotFound(false);
        const res = await fetchTwibbons(true);
        if (!isMounted) return;

        if (res.data) {
          setTwibbons(res.data);
        } else {
          setTwibbons([]);
          if (res.error) {
            onShowToast(res.error.message || "Gagal memuat kampanye Twibon.", "error");
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [campaignSlug]);

  // Handle share event
  const handleShareCampaign = async () => {
    if (!activeCampaign) return;
    
    // Construct the absolute share URL
    const origin = typeof window !== "undefined" && window.location.origin.includes("mkverse.my.id")
      ? "https://galerifoto.mkverse.my.id"
      : (window.location.origin || "https://galerifoto.mkverse.my.id");
    const shareUrl = `${origin}/twibon/${activeCampaign.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: activeCampaign.title,
          text: activeCampaign.description,
          url: shareUrl
        });
        onShowToast("Tautan kampanye berhasil dibagikan!", "success");
      } catch (err) {
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    onShowToast("Tautan disalin ke papan klip!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Record a download increment in MySQL via PHP Backend
  const handleDownloadCompleted = async () => {
    if (!activeCampaign) return;
    
    // Increment count in MySQL database
    await incrementTwibbonUse(activeCampaign.id);

    // Sync current active model in local state
    setActiveCampaign((prev) => prev ? { ...prev, useCount: prev.useCount + 1 } : null);
    setTwibbons((prev) =>
      prev.map((t) => (t.id === activeCampaign.id ? { ...t, useCount: t.useCount + 1 } : t))
    );
  };

  // Filter explore list
  const filteredCampaigns = twibbons.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col items-center justify-center space-y-4 text-center">
        <Loader2 className="w-10 h-10 text-[#f6c374] animate-spin" />
        <p className="font-body text-sm text-[#d3c4b3]">Memuat data kampanye Twibon dari database...</p>
      </div>
    );
  }

  // NOT FOUND STATE (Requirement 7)
  if (campaignSlug && notFound) {
    return (
      <div className="max-w-xl mx-auto px-4 py-32 text-center space-y-6">
        <div className="w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-[#eae1d8]">Twibon Tidak Ditemukan</h2>
          <p className="font-body text-sm text-[#9b8f7f] leading-relaxed">
            Twibon tidak ditemukan atau sudah dihapus dari server Galeri EMKA.
          </p>
        </div>
        <div>
          <button
            onClick={() => onNavigate("twibon")}
            className="inline-flex items-center gap-2 bg-[#f6c374] hover:bg-[#d8a85c] text-[#17130e] font-subheading text-xs tracking-widest uppercase font-bold py-3 px-6 rounded-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Jelajahi Twibon Lain
          </button>
        </div>
      </div>
    );
  }

  // VIEW 1: CAMPAIGN DETAIL WORKSPACE
  if (campaignSlug && activeCampaign) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate("twibon")}
            className="flex items-center gap-2 font-subheading text-xs tracking-widest text-[#9b8f7f] hover:text-[#eae1d8] uppercase transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#f6c374]" /> Jelajahi Twibon Lain
          </button>

          <button
            onClick={handleShareCampaign}
            className="bg-[#17130e] hover:bg-[#39342e]/30 border border-[#4f4538]/30 font-subheading text-[10px] tracking-widest text-[#f6c374] px-4 py-2.5 rounded-sm uppercase transition-all flex items-center gap-2 cursor-pointer font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "TAUTAN DISALIN" : "BAGIKAN KAMPANYE"}</span>
          </button>
        </div>

        {/* WORKSPACE FLEX GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Panel: Campaign Meta Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="font-subheading text-[10px] tracking-widest text-[#f6c374] uppercase block">
                KAMPANYE RESMI SMK MULTI KARYA
              </span>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-[#eae1d8] tracking-tight leading-tight">
                {activeCampaign.title}
              </h1>
            </div>

            <p className="font-body text-sm text-[#d3c4b3]/85 leading-relaxed">
              {activeCampaign.description || "Mari berpartisipasi dan semarakkan momen ini dengan memasang foto terbaik Anda menggunakan bingkai resmi kami."}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#4f4538]/20">
              <div className="bg-[#110e09] border border-[#4f4538]/20 p-4 rounded-sm space-y-1">
                <span className="font-subheading text-[9px] tracking-widest text-[#9b8f7f] uppercase block">
                  Format Proporsi
                </span>
                <span className="font-display text-lg font-bold text-[#f6c374]">
                  {activeCampaign.ratio}
                </span>
              </div>

              <div className="bg-[#110e09] border border-[#4f4538]/20 p-4 rounded-sm space-y-1">
                <span className="font-subheading text-[9px] tracking-widest text-[#9b8f7f] uppercase block">
                  Digunakan Sebanyak
                </span>
                <span className="font-display text-lg font-bold text-[#eae1d8]">
                  {activeCampaign.useCount.toLocaleString("id-ID")} Kali
                </span>
              </div>
            </div>

            {/* Instruction Checklist Card */}
            <div className="bg-[#17130e] border border-[#4f4538]/20 p-5 rounded-sm space-y-3">
              <span className="font-subheading text-[10px] tracking-widest text-[#eae1d8] uppercase flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-[#f6c374]" /> Petunjuk Penggunaan
              </span>
              <ul className="space-y-2 font-body text-xs text-[#d3c4b3]/85">
                <li className="flex items-start gap-2">
                  <span className="text-[#f6c374] font-bold">1.</span> Pilih foto terbaik dari galeri atau kamera HP/laptop Anda.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f6c374] font-bold">2.</span> Atur posisi, zoom, atau rotasi agar wajah pas di dalam bingkai transparan.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f6c374] font-bold">3.</span> Klik tombol Unduh Twibbon Foto untuk menyimpan hasil resolusi tinggi.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Interactive Canvas Editor (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#110e09] border border-[#4f4538]/20 rounded-sm p-6 sm:p-8 shadow-2xl">
              <TwibbonEditor
                ratio={activeCampaign.ratio}
                frameUrl={activeCampaign.frame_url || activeCampaign.frameUrl || activeCampaign.designUrl || activeCampaign.design_url || generateMockFrame(activeCampaign.title, activeCampaign.ratio)}
                slug={activeCampaign.slug}
                title={activeCampaign.title}
                onShowToast={onShowToast}
                onDownloadCompleted={handleDownloadCompleted}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: PUBLIC DIRECTORY EXPLORATION
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 space-y-12">
      {/* DIRECTORY HERO BANNER */}
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#f6c374]/30 bg-[#f6c374]/10 text-[#f6c374] font-subheading text-[10px] tracking-widest uppercase font-bold">
          <Sparkles className="w-3 h-3" /> RUANG KAMPANYE EMKA
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-[#eae1d8] tracking-tight">
          Twibbon Resmi Galeri EMKA
        </h1>
        <p className="font-body text-sm text-[#d3c4b3]/85 leading-relaxed">
          Pilih kampanye favorit, pasang foto Anda dengan mudah tanpa aplikasi tambahan, dan bagikan ke media sosial untuk mendukung setiap momen kebanggaan sekolah.
        </p>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="flex bg-[#110e09] border border-[#4f4538]/15 p-4 rounded-sm items-center gap-3">
        <Search className="w-5 h-5 text-[#9b8f7f] shrink-0" />
        <input
          type="text"
          placeholder="Cari kampanye Twibbon aktif..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none text-[#eae1d8] font-body text-xs placeholder:text-[#4f4538] focus:outline-none"
        />
      </div>

      {/* PUBLIC GRID DIRECTORY */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-[#110e09]/40 border border-dashed border-[#4f4538]/20 rounded-sm space-y-4">
          <div className="w-12 h-12 rounded-full border border-[#4f4538]/30 flex items-center justify-center text-[#9b8f7f] bg-[#110e09]">
            <HelpCircle className="w-6 h-6" />
          </div>
          <p className="font-body text-xs text-[#9b8f7f] max-w-sm leading-relaxed">
            {searchQuery
              ? "Maaf, tidak ada kampanye Twibon aktif yang cocok dengan pencarian Anda saat ini."
              : "Belum ada kampanye Twibon aktif yang tersedia saat ini."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCampaigns.map((twibbon) => (
            <div
              key={twibbon.id}
              onClick={() => onNavigate("twibon", twibbon.slug)}
              className="group relative bg-[#110e09] border border-[#4f4538]/15 rounded-sm overflow-hidden cursor-pointer hover:border-[#f6c374]/40 transition-all duration-300 shadow-lg flex flex-col justify-between"
            >
              {/* Campaign preview card layout */}
              <div>
                <div className="aspect-square w-full overflow-hidden relative bg-[#17130e] flex items-center justify-center p-6">
                  {/* Checkerboard */}
                  <div
                    className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity"
                    style={{
                      backgroundImage: "linear-gradient(45deg, #1f1a12 25%, transparent 25%), linear-gradient(-45deg, #1f1a12 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1a12 75%), linear-gradient(-45deg, transparent 75%, #1f1a12 75%)",
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                    }}
                  />
                  <img
                    src={twibbon.frame_url || twibbon.frameUrl || twibbon.designUrl || twibbon.design_url || generateMockFrame(twibbon.title, twibbon.ratio)}
                    alt={twibbon.title}
                    className="max-w-full max-h-full object-contain relative z-10 group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Ratio pill info */}
                  <span className="absolute top-4 left-4 bg-[#110e09]/80 backdrop-blur-md border border-[#4f4538]/30 font-subheading text-[9px] tracking-widest text-[#f6c374] px-3 py-1.5 rounded-sm uppercase">
                    Rasio {twibbon.ratio}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="font-display text-lg font-bold text-[#eae1d8] group-hover:text-[#f6c374] transition-colors leading-tight line-clamp-1">
                    {twibbon.title}
                  </h3>
                  
                  <p className="font-body text-xs text-[#d3c4b3]/85 line-clamp-2 leading-relaxed">
                    {twibbon.description}
                  </p>
                </div>
              </div>

              {/* Card CTA Footer */}
              <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-[#4f4538]/10 mt-2">
                <span className="font-subheading text-[10px] tracking-wider text-[#9b8f7f] flex items-center gap-1 uppercase">
                  <Calendar className="w-3.5 h-3.5 text-[#f6c374]" />
                  {new Date(twibbon.createdAt).toLocaleDateString("id-ID", {
                    month: "short",
                    year: "numeric"
                  })}
                </span>

                <button
                  onClick={() => onNavigate("twibon", twibbon.slug)}
                  className="bg-transparent hover:bg-[#d8a85c] hover:text-[#110e09] border border-[#d8a85c]/30 hover:border-[#d8a85c] text-[#f6c374] font-subheading text-[10px] tracking-widest uppercase py-2 px-4 rounded-sm transition-all font-bold flex items-center gap-1"
                >
                  Ikuti Kampanye <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
