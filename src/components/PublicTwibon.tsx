import { useState, useEffect } from "react";
import { Sparkles, Share2, ArrowLeft, Download, Info, HelpCircle, Heart, Search, Calendar, ChevronRight, Check } from "lucide-react";
import { Twibbon } from "../types";
import { getStoredTwibbons, saveStoredTwibbons } from "../lib/twibbonUtils";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Load all campaigns and locate the active one if a slug was requested
  useEffect(() => {
    const list = getStoredTwibbons().filter((t) => t.isActive);
    setTwibbons(list);

    if (campaignSlug) {
      const found = list.find((t) => t.slug === campaignSlug);
      if (found) {
        setActiveCampaign(found);
      } else {
        setActiveCampaign(null);
        onShowToast("Kampanye Twibbon tidak ditemukan atau sudah dinonaktifkan.", "error");
      }
    } else {
      setActiveCampaign(null);
    }
  }, [campaignSlug]);

  // Handle share event
  const handleShareCampaign = async () => {
    if (!activeCampaign) return;
    
    // Construct the absolute share URL
    const shareUrl = `${window.location.origin}${window.location.pathname}#twibon/${activeCampaign.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: activeCampaign.title,
          text: activeCampaign.description,
          url: shareUrl
        });
        onShowToast("Tautan kampanye berhasil dibagikan!", "success");
      } catch (err) {
        // Fallback if shared cancelled
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

  // Record a download increment in local storage
  const handleDownloadCompleted = () => {
    if (!activeCampaign) return;
    
    const allList = getStoredTwibbons();
    const updated = allList.map((t) =>
      t.id === activeCampaign.id ? { ...t, useCount: t.useCount + 1 } : t
    );
    saveStoredTwibbons(updated);
    
    // Sync current list
    setTwibbons(updated.filter((t) => t.isActive));
    // Sync current active model
    setActiveCampaign((prev) => prev ? { ...prev, useCount: prev.useCount + 1 } : null);
  };

  // Filter explore list
  const filteredCampaigns = twibbons.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {/* Left Panel: Campaign Meta Info (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block font-semibold">
                KAMPANYE AKTIF
              </span>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#eae1d8] tracking-tight leading-tight">
                {activeCampaign.title}
              </h1>
              
              {/* Campaign Stats badges */}
              <div className="flex gap-3 pt-1">
                <span className="font-subheading text-[10px] tracking-wider text-[#9b8f7f] bg-[#110e09] border border-[#4f4538]/20 px-3 py-1 rounded-sm uppercase">
                  Rasio {activeCampaign.ratio}
                </span>
                <span className="font-subheading text-[10px] tracking-wider text-[#f6c374] bg-[#110e09] border border-[#4f4538]/20 px-3 py-1 rounded-sm uppercase font-bold flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-[#f6c374]" /> {activeCampaign.useCount} Diunduh
                </span>
              </div>
            </div>

            <p className="font-body text-xs sm:text-sm text-[#d3c4b3] leading-relaxed bg-[#110e09]/50 border border-[#4f4538]/10 p-5 rounded-sm">
              {activeCampaign.description}
            </p>

            {/* Step-by-step instructions */}
            <div className="glass-panel p-6 border border-[#4f4538]/15 rounded-sm space-y-4">
              <h4 className="font-display text-xs font-bold text-[#eae1d8] uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-[#f6c374]" /> Panduan Penggunaan:
              </h4>
              <ul className="space-y-3.5">
                <li className="flex gap-3 text-xs text-[#d3c4b3]">
                  <span className="w-5 h-5 rounded-full bg-[#110e09] border border-[#4f4538]/30 flex items-center justify-center text-[#f6c374] font-bold shrink-0">1</span>
                  <span className="leading-relaxed">Klik tombol <strong>"PILIH FOTO ANDA"</strong> untuk memuat foto yang ingin Anda jadikan Twibbon.</span>
                </li>
                <li className="flex gap-3 text-xs text-[#d3c4b3]">
                  <span className="w-5 h-5 rounded-full bg-[#110e09] border border-[#4f4538]/30 flex items-center justify-center text-[#f6c374] font-bold shrink-0">2</span>
                  <span className="leading-relaxed">Gunakan fitur drag, zoom slider, dan rotasi tombol untuk memosisikan wajah/foto di belakang frame.</span>
                </li>
                <li className="flex gap-3 text-xs text-[#d3c4b3]">
                  <span className="w-5 h-5 rounded-full bg-[#110e09] border border-[#4f4538]/30 flex items-center justify-center text-[#f6c374] font-bold shrink-0">3</span>
                  <span className="leading-relaxed">Klik tombol <strong>"UNDUH TWIBBON SEKARANG"</strong> untuk mengekspor hasil ke perangkat Anda dengan kualitas super tajam!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Interactive Sandbox Editor (7 cols) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-lg bg-[#110e09]/30 border border-[#4f4538]/15 p-6 rounded-sm shadow-2xl flex flex-col items-center">
              <TwibbonEditor
                ratio={activeCampaign.ratio}
                frameUrl={activeCampaign.designUrl}
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

  // VIEW 2: EXPLORE CENTRAL TWIBBON DIRECTORY
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 space-y-16">
      
      {/* Editorial Header */}
      <div className="space-y-4 max-w-3xl">
        <span className="font-subheading text-xs tracking-widest text-[#f6c374] uppercase block font-semibold">
          KAMPANYE PROMOSI SEKOLAH
        </span>
        <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-[#eae1d8] tracking-tight leading-tight">
          Twibon EMKA
        </h1>
        <p className="font-body text-base text-[#d3c4b3] leading-relaxed">
          Pilih dari koleksi frame kegiatan resmi SMK Multi Karya Medan. Dukung acara sekolah, ikuti keseruannya, dan bagikan foto keren Anda di media sosial!
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
            Maaf, tidak ada kampanye Twibbon aktif yang cocok dengan pencarian Anda saat ini.
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
                    src={twibbon.designUrl}
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
