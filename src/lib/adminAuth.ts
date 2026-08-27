import { supabase } from "./supabase.js";
import { Session, User } from "@supabase/supabase-js";

export interface AdminAuthSession {
  session: Session;
  user: User;
}

/**
 * Helper terpusat untuk mengambil Supabase Auth session & user resmi
 */
export async function getAdminSession(): Promise<AdminAuthSession | null> {
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session) {
      return null;
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return null;
    }

    return { session, user };
  } catch (err) {
    console.error("[ADMIN AUTH] Error getting session:", err);
    return null;
  }
}

/**
 * Require active Supabase Auth session or throw error
 */
export async function requireAdminSession(): Promise<AdminAuthSession> {
  const authSession = await getAdminSession();
  if (!authSession) {
    throw new Error("Session admin tidak tersedia. Silakan login kembali.");
  }
  return authSession;
}

/**
 * Check if admin is currently authenticated via Supabase Auth
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const authSession = await getAdminSession();
  return authSession !== null;
}

/**
 * Perform Admin Login with Username & PIN using official Supabase Auth
 */
export async function performAdminLogin(
  username: string,
  pin: string
): Promise<{ success: boolean; session?: Session; user?: User; error?: string }> {
  const cleanUsername = username.trim();

  // Internal mapping: ADMIN -> emkakeren@gmail.com
  let email = cleanUsername;
  if (cleanUsername.toUpperCase() === "ADMIN") {
    email = "emkakeren@gmail.com";
  } else if (!cleanUsername.includes("@")) {
    email = "emkakeren@gmail.com";
  }

  try {
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

    if (error || !data.session) {
      // Fallback: create admin user in Supabase Auth if not yet provisioned
      if (email === "emkakeren@gmail.com" && pin === "1902") {
        try {
          const signUpRes = await supabase.auth.signUp({
            email,
            password: pin,
            options: { data: { role: "admin", username: "ADMIN" } },
          });
          if (signUpRes.data?.session) {
            data = signUpRes.data;
            error = null;
          } else {
            const retryRes = await supabase.auth.signInWithPassword({
              email,
              password: pin,
            });
            if (retryRes.data?.session) {
              data = retryRes.data;
              error = null;
            }
          }
        } catch (_) {}
      }
    }

    if (error || !data.session || !data.user) {
      return {
        success: false,
        error: "Username atau PIN (Password) salah.",
      };
    }

    return {
      success: true,
      session: data.session,
      user: data.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: "Username atau PIN (Password) salah.",
    };
  }
}

/**
 * Perform Admin Logout via official Supabase Auth
 */
export async function performAdminLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("[ADMIN LOGOUT] Error signing out:", e);
  }
}
