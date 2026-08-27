import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, ArrowLeft, Loader2, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "../lib/supabase.js";

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
  onBackToHome: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export default function AdminLogin({ onLoginSuccess, onBackToHome, onShowToast }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin) return;

    setIsLoading(true);
    setIsError(false);

    let isTimeout = false;
    let timeoutId: any;
    const timeoutPromise = new Promise<null>((_, reject) => {
      timeoutId = setTimeout(() => {
        isTimeout = true;
        reject(new Error("TIMEOUT"));
      }, 7000);
    });

    try {
      let authSuccessful = false;
      let isExplicitInvalid = false;
      let serverError = false;

      // 1. Primary Method: Try Supabase Edge Function
      try {
        const edgeFunctionPromise = supabase.functions.invoke("admin-login", {
          body: {
            username: username.trim(),
            pin: pin
          }
        });

        const edgeResponse = await Promise.race([edgeFunctionPromise, timeoutPromise]);

        if (edgeResponse && edgeResponse.data) {
          const result = edgeResponse.data;
          if (result.authenticated === true || result.success === true) {
            authSuccessful = true;
          } else if (result.authenticated === false || result.success === false) {
            isExplicitInvalid = true;
          }
        } else if (edgeResponse && edgeResponse.error) {
          // If edge function is not deployed or unreachable, we fallback to RPC
          serverError = true;
        }
      } catch (edgeErr: any) {
        if (edgeErr?.message === "TIMEOUT") throw edgeErr;
        serverError = true;
      }

      // 2. Secondary Method: If Edge Function was not reachable, fallback to PostgreSQL RPC
      if (!authSuccessful && !isExplicitInvalid && serverError) {
        try {
          const rpcPromise = supabase.rpc("verify_admin_pin", {
            p_username: username.trim(),
            p_pin: pin
          });

          const rpcResponse = await Promise.race([rpcPromise, timeoutPromise]);

          if (rpcResponse && typeof rpcResponse.data === "boolean") {
            if (rpcResponse.data === true) {
              authSuccessful = true;
            } else {
              isExplicitInvalid = true;
            }
          }
        } catch (rpcErr: any) {
          if (rpcErr?.message === "TIMEOUT") throw rpcErr;
        }
      }

      clearTimeout(timeoutId);

      if (authSuccessful) {
        onShowToast("Login Berhasil! Selamat datang di dashboard admin.", "success");
        onLoginSuccess("emka_admin_session_active");
      } else if (isExplicitInvalid) {
        setIsError(true);
        onShowToast("Username atau PIN salah.", "error");
      } else {
        setIsError(true);
        onShowToast("Server sedang tidak dapat dihubungi. Silakan coba lagi.", "error");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsError(true);
      if (isTimeout || err?.message === "TIMEOUT") {
        onShowToast("Koneksi berakhir (timeout). Silakan coba lagi.", "error");
      } else {
        onShowToast("Server sedang tidak dapat dihubungi. Silakan coba lagi.", "error");
      }
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
              Masukkan kredensial keamanan untuk mengelola konten Galeri Emka.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username-input" className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                USERNAME
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9b8f7f]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  placeholder="Masukkan Username"
                  autoFocus
                  className="w-full bg-[#17130e] border border-[#4f4538]/30 rounded-sm py-3 pl-10 pr-4 font-body text-sm text-[#eae1d8] placeholder-[#4f4538] focus:outline-none focus:border-[#f6c374] transition-colors"
                />
              </div>
            </div>

            {/* Password/PIN Field */}
            <div className="space-y-2">
              <label htmlFor="pin-input" className="block font-subheading text-[10px] tracking-widest uppercase text-[#9b8f7f]">
                PIN
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 4) {
                      setPin(val);
                      if (isError) setIsError(false);
                    }
                  }}
                  maxLength={4}
                  placeholder="Masukkan PIN"
                  className="w-full bg-[#17130e] border border-[#4f4538]/30 rounded-sm py-3 pl-4 pr-12 font-body text-sm text-[#eae1d8] placeholder-[#4f4538] focus:outline-none focus:border-[#f6c374] transition-colors tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#9b8f7f] hover:text-[#f6c374] transition-colors focus:outline-none"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !username || !pin}
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
