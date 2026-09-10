/**
 * Centralized API Client for GALERI EMKA
 * Connects directly to the PHP & MySQL backend at https://api.mkverse.my.id/api
 */

const getApiBaseUrl = (): string => {
  const envUrl = (
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
    "https://api.mkverse.my.id"
  )
    .trim()
    .replace(/\/+$/, "");
  return envUrl.endsWith("/api") ? envUrl : `${envUrl}/api`;
};

const getStorageBaseUrl = (): string => {
  const envUrl = (
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_STORAGE_URL) ||
    "https://galeri.mkverse.my.id/uploads"
  )
    .trim()
    .replace(/\/+$/, "");
  return envUrl.endsWith("/uploads") ? envUrl : `${envUrl}/uploads`;
};

export const API_BASE_URL = getApiBaseUrl();
export const STORAGE_BASE_URL = getStorageBaseUrl();

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

/**
 * Generic API Request Handler
 */
export async function apiRequest<T = any>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body: any = null,
  isFormData: boolean = false,
  logTag?: string
): Promise<{ data: ApiResponse<T> | null; error: Error | null }> {
  const tag = logTag || `[GALERI API] ${method} ${endpoint}`;
  const headers: Record<string, string> = {};

  if (!isFormData && body && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;

  console.log(`${tag} -> Requesting ${url}`);

  try {
    const res = await fetch(url, config);
    
    // Check HTTP status code
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson?.message) {
          errorMsg = errJson.message;
        }
      } catch (_) {
        // Response might not be JSON
      }
      console.error(`${tag} Failed with HTTP ${res.status}`, errorMsg);
      return { data: null, error: new Error(errorMsg) };
    }

    const result = await res.json();
    console.log(`${tag} <- Success:`, result);

    if (result && typeof result === "object" && "success" in result) {
      if (result.success === false) {
        return {
          data: result,
          error: new Error(result.message || "Request failed according to API response"),
        };
      }
    }

    return { data: result, error: null };
  } catch (err: any) {
    console.error(`${tag} Network/Runtime Error:`, err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 1. GET PHOTOS
 * GET https://api.mkverse.my.id/api/photos.php
 */
export async function fetchPhotos() {
  console.log("[GALERI API] GET photos");
  return apiRequest("photos.php", "GET", null, false, "[GALERI API] GET photos");
}

/**
 * 2. GET CATEGORIES
 * GET https://api.mkverse.my.id/api/categories.php
 */
export async function fetchCategories() {
  console.log("[GALERI API] GET categories");
  return apiRequest("categories.php", "GET", null, false, "[GALERI API] GET categories");
}

/**
 * 3. GET SETTINGS
 * GET https://api.mkverse.my.id/api/settings.php
 */
export async function fetchSettings() {
  console.log("[GALERI API] GET settings");
  return apiRequest("settings.php", "GET", null, false, "[GALERI API] GET settings");
}

/**
 * 4. ADMIN LOGIN
 * POST https://api.mkverse.my.id/api/login.php
 * Payload: { username: "...", password: "..." }
 */
export async function loginAdmin(username: string, password: string) {
  console.log("[GALERI API] LOGIN");
  return apiRequest(
    "login.php",
    "POST",
    {
      username: username.trim(),
      password: password,
    },
    false,
    "[GALERI API] LOGIN"
  );
}

/**
 * 5. UPLOAD IMAGE
 * POST https://api.mkverse.my.id/api/upload.php
 * Payload: FormData with 'file' field
 */
export async function uploadPhoto(file: File): Promise<{ data: any; error: Error | null; url?: string }> {
  console.log("[GALERI API] UPLOAD image", file.name);
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiRequest("upload.php", "POST", formData, true, "[GALERI API] UPLOAD image");
  
  if (res.error || !res.data) {
    return { data: null, error: res.error || new Error("Upload gagal"), url: undefined };
  }

  // Extract returned URL from backend data structure
  const rawData: any = res.data;
  const uploadedUrl =
    rawData?.data?.url ||
    rawData?.url ||
    rawData?.image_url ||
    (rawData?.data?.filename ? `${STORAGE_BASE_URL}/${rawData.data.filename}` : undefined);

  return { data: res.data, error: null, url: uploadedUrl };
}

/**
 * 6. ADD PHOTO / KEGIATAN
 * POST https://api.mkverse.my.id/api/add-photo.php
 * Fields: title, description, image_url, category_id, event_date, is_featured, display_order
 */
export async function addPhoto(data: {
  title: string;
  description?: string;
  image_url: string;
  category_id: string | number;
  event_date?: string;
  is_featured?: number | boolean;
  display_order?: number;
} | FormData) {
  console.log("[GALERI API] ADD photo", data);
  let formData: FormData;

  if (data instanceof FormData) {
    formData = data;
  } else {
    formData = new FormData();
    formData.append("title", data.title || "");
    formData.append("description", data.description || "");
    formData.append("image_url", data.image_url || "");
    formData.append("category_id", String(data.category_id || "1"));
    formData.append("event_date", data.event_date || new Date().toISOString().split("T")[0]);
    formData.append("is_featured", data.is_featured ? "1" : "0");
    formData.append("display_order", String(data.display_order ?? 1));
  }

  return apiRequest("add-photo.php", "POST", formData, true, "[GALERI API] ADD photo");
}

/**
 * 7. UPDATE PHOTO / KEGIATAN
 * POST https://api.mkverse.my.id/api/update-photo.php
 * Fields: id, title, description, image_url, category_id, event_date, is_featured, display_order
 */
export async function updatePhoto(data: {
  id: string | number;
  title?: string;
  description?: string;
  image_url?: string;
  category_id?: string | number;
  event_date?: string;
  is_featured?: number | boolean;
  display_order?: number;
} | FormData) {
  console.log("[GALERI API] UPDATE photo", data);
  let formData: FormData;

  if (data instanceof FormData) {
    formData = data;
  } else {
    formData = new FormData();
    formData.append("id", String(data.id));
    if (data.title !== undefined) formData.append("title", data.title);
    if (data.description !== undefined) formData.append("description", data.description);
    if (data.image_url !== undefined) formData.append("image_url", data.image_url);
    if (data.category_id !== undefined) formData.append("category_id", String(data.category_id));
    if (data.event_date !== undefined) formData.append("event_date", data.event_date);
    if (data.is_featured !== undefined) formData.append("is_featured", data.is_featured ? "1" : "0");
    if (data.display_order !== undefined) formData.append("display_order", String(data.display_order));
  }

  return apiRequest("update-photo.php", "POST", formData, true, "[GALERI API] UPDATE photo");
}

/**
 * 8. DELETE PHOTO / KEGIATAN
 * POST https://api.mkverse.my.id/api/delete-photo.php
 * Field: id
 */
export async function deletePhoto(id: string | number) {
  console.log("[GALERI API] DELETE photo", id);
  const formData = new FormData();
  formData.append("id", String(id));
  return apiRequest("delete-photo.php", "POST", formData, true, "[GALERI API] DELETE photo");
}
