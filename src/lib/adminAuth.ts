import { loginAdmin } from "./api.js";

export interface AdminAuthSession {
  session: { access_token: string };
  user: any;
}

/**
 * Helper terpusat untuk mengambil session dari localStorage
 */
export async function getAdminSession(): Promise<AdminAuthSession | null> {
  try {
    const token = localStorage.getItem("emka_admin_token");
    if (!token) {
      return null;
    }
    
    return { session: { access_token: token }, user: { id: "admin", username: "ADMIN" } };
  } catch (err) {
    console.error("[ADMIN AUTH] Error getting session:", err);
    return null;
  }
}

/**
 * Require active Auth session or throw error
 */
export async function requireAdminSession(): Promise<AdminAuthSession> {
  const authSession = await getAdminSession();
  if (!authSession) {
    throw new Error("Session admin tidak tersedia. Silakan login kembali.");
  }
  return authSession;
}

/**
 * Check if admin is currently authenticated
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const authSession = await getAdminSession();
  return authSession !== null;
}

/**
 * Perform Admin Login with Username & PIN using PHP API (POST /api/login.php)
 */
export async function performAdminLogin(
  username: string,
  pin: string
): Promise<{ success: boolean; session?: { access_token: string }; user?: any; error?: string }> {
  const cleanUsername = username.trim();
  
  try {
    const { data, error } = await loginAdmin(cleanUsername, pin);
    
    if (error || !data) {
      return {
        success: false,
        error: error?.message || data?.message || "Username atau PIN salah.",
      };
    }

    if (data.success === true) {
      const sessionToken = (data as any).token || "emka_session_active";
      localStorage.setItem("emka_admin_token", sessionToken);
      
      return {
        success: true,
        session: { access_token: sessionToken },
        user: data.data || { id: "admin", username: cleanUsername },
      };
    } else {
      return {
        success: false,
        error: data.message || "Username atau PIN salah.",
      };
    }
  } catch (err: any) {
    console.error("[ADMIN AUTH LOGIN ERROR]", err);
    return {
      success: false,
      error: "Koneksi ke server gagal. Periksa jaringan internet Anda.",
    };
  }
}

/**
 * Perform Admin Logout
 */
export async function performAdminLogout(): Promise<void> {
  try {
    localStorage.removeItem("emka_admin_token");
  } catch (e) {
    console.error("[ADMIN LOGOUT] Error signing out:", e);
  }
}
