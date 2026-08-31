export interface AdminAuthSession {
  session: { access_token: string };
  user: any;
}

const API_BASE_URL = `${(import.meta as any).env.VITE_API_URL || "https://api.mkverse.my.id"}/api`;

/**
 * Helper terpusat untuk mengambil session
 */
export async function getAdminSession(): Promise<AdminAuthSession | null> {
  try {
    const token = localStorage.getItem("emka_admin_token");
    if (!token) {
      return null;
    }
    
    return { session: { access_token: token }, user: { id: "admin", username: "admin" } };
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
 * Perform Admin Login with Username & PIN using API
 */
export async function performAdminLogin(
  username: string,
  pin: string
): Promise<{ success: boolean; session?: { access_token: string }; user?: any; error?: string }> {
  const cleanUsername = username.trim();
  
  try {
    const response = await fetch(`${API_BASE_URL}/login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        username: cleanUsername, 
        email: cleanUsername, // Send both to be compatible with whatever the PHP script expects
        password: pin 
      }),
    });
    
    if (!response.ok) {
       return { success: false, error: "Gagal menghubungi server login." };
    }
    
    const data = await response.json();
    
    if (data.success && data.token) {
      localStorage.setItem("emka_admin_token", data.token);
      return {
        success: true,
        session: { access_token: data.token },
        user: data.data || { id: "1", username: cleanUsername },
      };
    } else {
      return {
        success: false,
        error: data.message || "Username atau PIN salah.",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: "Koneksi ke server gagal.",
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
