import { createClient } from "@supabase/supabase-js";

const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = rawUrl && rawUrl.trim() ? rawUrl.trim() : "https://placeholder-project.supabase.co";
const supabaseAnonKey = rawKey && rawKey.trim() ? rawKey.trim() : "placeholder-anon-key";

if (!rawUrl || !rawKey) {
  console.warn("Supabase credentials missing. GALERI EMKA is running with safe local fallbackData.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
