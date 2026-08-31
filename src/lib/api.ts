const API_BASE_URL = (import.meta as any).env.VITE_API_URL || "https://api.mkverse.my.id";

export async function apiRequest(endpoint: string, method: string = "GET", body: any = null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  // You may need to add auth headers here if the PHP API requires them (e.g., JWT)
  // const token = localStorage.getItem("auth_token");
  // if (token) headers["Authorization"] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}/${endpoint}`;
  console.log(`[API REQUEST] ${method} ${url}`, body);
  
  try {
    const res = await fetch(url, config);
    const result = await res.json();
    console.log(`[API RESPONSE] ${endpoint}`, result);
    return { data: result, error: result.success ? null : new Error(result.message) };
  } catch (e: any) {
    console.error(`[API ERROR] ${endpoint}`, e);
    return { data: null, error: e };
  }
}
