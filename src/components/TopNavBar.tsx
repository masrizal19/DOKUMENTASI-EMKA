import { useState, useEffect } from "react";
import { Settings } from "../types.js";
import { Menu, X, MessageSquare, Shield } from "lucide-react";

interface TopNavBarProps {
  activeTab: string;
  onChangeTab: (tab: "beranda" | "galeri" | "kegiatan" | "foto-terbaru" | "tentang" | "admin", slug?: string) => void;
  settings: Settings;
  isAdminLoggedIn: boolean;
}

export default function TopNavBar({ activeTab, onChangeTab, settings, isAdminLoggedIn }: TopNavBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWhatsApp = () => {
    const cleanNumber = settings.whatsapp.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanNumber}`, "_blank", "noopener,noreferrer");
  };

  const isKegiatanPageEnabled = settings.enable_kegiatan_page !== false;
  const isFotoTerbaruPageEnabled = settings.enable_foto_terbaru_page !== false;

  const navItems = [
    { id: "beranda", label: "Beranda" },
    { id: "galeri", label: "Galeri" },
    ...(isKegiatanPageEnabled ? [{ id: "kegiatan", label: "Kegiatan" } as const] : []),
    ...(isFotoTerbaruPageEnabled ? [{ id: "foto-terbaru", label: "Foto Terbaru" } as const] : []),
    { id: "tentang", label: "Tentang" }
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ease-out ${
        isScrolled || activeTab !== "beranda"
          ? "bg-[#17130e]/95 backdrop-blur-xl border-b border-[#4f4538]/15 py-4 shadow-lg"
          : "bg-gradient-to-b from-[#110e09]/70 to-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div
            onClick={() => onChangeTab("beranda")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="h-8 object-contain" />
            ) : (
              <span className="font-display text-lg sm:text-2xl font-extrabold tracking-wider text-[#eae1d8] group-hover:text-[#f6c374] transition-colors">
                {settings.site_name || "GALERI EMKA"}
              </span>
            )}
            {isAdminLoggedIn && (
              <span className="flex items-center gap-1 text-[10px] font-subheading uppercase bg-[#f6c374]/15 text-[#f6c374] px-2 py-0.5 rounded-sm tracking-widest border border-[#f6c374]/30 ml-2">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-6">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChangeTab(item.id as any);
                    }}
                    className={`font-subheading text-[13px] tracking-widest uppercase transition-all duration-300 relative py-1 hover:scale-105 ${
                      isActive
                        ? "text-[#f6c374] font-bold border-b-2 border-[#f6c374]"
                        : "text-[#d3c4b3] hover:text-[#eae1d8]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleWhatsApp}
              className="bg-[#d8a85c] text-[#110e09] font-subheading text-[12px] tracking-widest uppercase px-5 py-2.5 rounded-sm font-semibold transition-transform hover:scale-[1.04] active:scale-95 duration-300 flex items-center gap-2 shadow-md cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Hubungi Admin
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-4">
            <button
              onClick={handleWhatsApp}
              className="bg-[#d8a85c] text-[#110e09] p-2 rounded-sm transition-transform active:scale-95"
              title="Hubungi Admin"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#eae1d8] p-2 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#17130e]/98 backdrop-blur-xl border-b border-[#4f4538]/15 py-4 px-4 space-y-3 absolute top-full left-0 w-full shadow-2xl">
          <div className="flex flex-col space-y-3">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onChangeTab(item.id as any);
                  }}
                  className={`text-left font-subheading text-[14px] tracking-widest uppercase py-2 border-b border-[#4f4538]/10 block ${
                    isActive ? "text-[#f6c374] font-bold" : "text-[#d3c4b3]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {isAdminLoggedIn && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onChangeTab("admin");
                }}
                className="text-left font-subheading text-[14px] tracking-widest uppercase py-2 text-[#f6c374] flex items-center gap-2"
              >
                <Shield className="w-4 h-4" /> Dashboard Admin
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
