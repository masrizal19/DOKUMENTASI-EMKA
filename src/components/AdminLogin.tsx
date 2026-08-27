import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBackToHome: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function AdminLogin({ onLoginSuccess, onBackToHome, onShowToast }: AdminLoginProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setIsLoading(true);
    setIsError(false);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@multikarya.sch.id",
        password: pin
      });

      if (error) {
        setIsError(true);
        onShowToast("PIN atau kredensial yang dimasukkan salah. Silakan coba lagi.", "error");
      } else if (data.session) {
        onShowToast("Login Berhasil! Selamat datang di dashboard admin.", "success");
        onLoginSuccess(data.session.access_token);
      } else {
        setIsError(true);
        onShowToast("Gagal memulai sesi. Silakan coba lagi.", "error");
      }
    } catch (err) {
      setIsError(true);
      onShowToast("Terjadi kesalahan jaringan atau koneksi Supabase.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#110e09] text-[#eae1d8] min-h-screen flex items-center justify-center px-4 relative">
      
      {/* Floating Back Button */}
      <div className="absolute top-8 left-4 sm:left-8">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 bg-[#17130e]/80 backdrop-blur-md border border-[#4f4538]/30 px-4 py-2 text-xs tracking-widest font-subheading uppercase text-[#eae1d8] hover:text-[#f6c374] hover:border-[#f6c374] transition-all rounded-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Galeri
        </button>
      </div>

      <div className="max-w-md w-full">
        {/* Card Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={
            isError 
              ? { x: [-6, 6, -6, 6, -3, 3, 0], opacity: 1, y: 0 } 
              : { opacity: 1, y: 0 }
          }
          transition={
            isError 
              ? { duration: 0.4, ease: "easeInOut" }
              : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
          }
          className={`glass-panel p-8 sm:p-12 rounded-sm space-y-8 shadow-2xl text-center border transition-all duration-300 ${
            isError ? "border-red-500/50 shadow-red-950/20" : "border-[#4f4538]/20"
          }`}
        >
          {/* Header */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f6c374]/15 border border-[#f6c374]/30 flex items-center justify-center text-[#f6c374]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide text-[#eae1d8] flex flex-col">
              <span>Dashboard</span>
              <span>Admin</span>
            </h1>
            <p className="font-body text-xs text-[#9b8f7f] max-w-xs mx-auto leading-relaxed">
              Masukkan PIN Keamanan untuk mengelola konten Galeri Emka.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="space-y-2">
              <label htmlFor="pin-input" className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                PIN KREDENSIAL
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  placeholder="Masukkan PIN Anda"
                  autoFocus
                  maxLength={10}
                  className="w-full bg-[#17130e] border border-[#4f4538]/30 rounded-sm py-3 px-4 font-body text-sm text-[#eae1d8] placeholder-[#4f4538] focus:outline-none focus:border-[#f6c374] transition-colors tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !pin}
              className="w-full bg-[#d8a85c] disabled:bg-[#39342e] disabled:text-[#9b8f7f] disabled:cursor-not-allowed hover:bg-[#eae1d8] text-[#110e09] font-subheading text-xs tracking-widest uppercase py-3.5 rounded-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> SEDANG MEMPROSES
                </>
              ) : (
                "MASUK KE DASHBOARD"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
