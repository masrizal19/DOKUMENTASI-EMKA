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
    "https://api.mkverse.my.id/uploads"
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
    const text = await res.text();
    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      const errorMsg = `Server mengembalikan response bukan JSON (HTTP ${res.status}): ${text}`;
      console.error(`${tag} Non-JSON Response:`, errorMsg);
      return { data: null, error: new Error(errorMsg) };
    }

    if (!res.ok) {
      const errorMsg = result?.message || `HTTP Error ${res.status}: ${res.statusText}`;
      if (res.status === 404 && result?.message?.toLowerCase().includes("tidak ditemukan")) {
        console.log(`${tag} Resource not found on server (404):`, errorMsg);
      } else {
        console.error(`${tag} Failed with HTTP ${res.status}:`, errorMsg, result);
      }
      return { data: result, error: new Error(errorMsg) };
    }

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
 * Optional: ?activity_id=1
 */
export async function fetchPhotos(activityId?: string | number) {
  const query = activityId && activityId !== "all" ? `?activity_id=${encodeURIComponent(activityId)}` : "";
  console.log(`[GALERI API] GET photos${query}`);
  return apiRequest(`photos.php${query}`, "GET", null, false, `[GALERI API] GET photos${query}`);
}

/**
 * 2. GET CATEGORIES
 * GET https://api.mkverse.my.id/api/categories.php
 */
export async function fetchCategories() {
  const url = `${API_BASE_URL}/categories.php`;
  console.log(`[GALERI API] GET categories → Requesting ${url}`);
  const res = await apiRequest("categories.php", "GET", null, false, "[GALERI API] GET categories");
  if (res.data && res.data.success) {
    console.log("[GALERI API] GET categories → Success");
    console.log("[GALERI API] Categories loaded:", res.data.data);
  } else if (res.error) {
    console.error("[GALERI API] GET categories error:", res.error.message);
  }
  return res;
}

/**
 * 2b. ADD CATEGORY
 * POST https://api.mkverse.my.id/api/add-category.php
 */
export async function addCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: number;
}) {
  const payload = {
    name: data.name.trim(),
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    description: data.description || "",
    display_order: Number(data.display_order ?? 0),
    is_active: data.is_active === undefined ? 1 : Number(data.is_active),
  };
  console.log("[GALERI API] ADD category", payload);
  const res = await apiRequest("add-category.php", "POST", payload, false, "[GALERI API] ADD category");
  console.log("[GALERI API] ADD category response", res.data || res.error);
  return res;
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
 * 5. UPLOAD MEDIA (PHOTO & VIDEO)
 * POST https://api.mkverse.my.id/api/upload.php
 * Supports onProgress callback (0% - 100%) and large files without client size limits
 */
export async function uploadPhoto(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ data: any; error: Error | null; url?: string }> {
  console.log("[GALERI API] Upload request", {
    name: file?.name,
    type: file?.type,
    size: file?.size,
  });

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", `${API_BASE_URL}/upload.php`, true);

    // Set timeout to 1 hour (3600000 ms) for large video/image transfers
    xhr.timeout = 3600000;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const text = xhr.responseText;
        let result: any = null;
        try {
          result = JSON.parse(text);
        } catch {
          resolve({
            data: null,
            error: new Error(
              `Upload API mengembalikan response bukan JSON (status ${xhr.status}): ${text.substring(0, 300)}`
            ),
            url: undefined,
          });
          return;
        }

        console.log("[GALERI API] Upload response", result);

        if (xhr.status >= 200 && xhr.status < 300 && result?.success === true) {
          const fileUrl = result?.data?.url;
          if (!fileUrl) {
            resolve({
              data: result,
              error: new Error("URL berkas tidak ditemukan dalam respons upload server."),
              url: undefined,
            });
            return;
          }
          if (onProgress) onProgress(100);
          resolve({ data: result, error: null, url: fileUrl });
        } else {
          const detail = result?.error ? ` [${result.error}]` : "";
          const msg =
            result?.message ||
            `Upload gagal dengan kode status HTTP ${xhr.status}${detail}`;
          resolve({ data: result, error: new Error(msg), url: undefined });
        }
      } catch (err: any) {
        console.error("[GALERI API] Upload exception:", err);
        resolve({
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
          url: undefined,
        });
      }
    };

    xhr.onerror = () => {
      console.error("[GALERI API] Upload network error");
      resolve({
        data: null,
        error: new Error("Gagal terhubung ke server upload (koneksi jaringan terputus atau CORS error)."),
        url: undefined,
      });
    };

    xhr.ontimeout = () => {
      console.error("[GALERI API] Upload timed out");
      resolve({
        data: null,
        error: new Error("Waktu unggah berkas melebihi batas waktu (timeout)."),
        url: undefined,
      });
    };

    xhr.send(formData);
  });
}

/**
 * 5b. GET PHP UPLOAD CONFIG
 * GET https://api.mkverse.my.id/api/upload.php
 */
export async function fetchUploadConfig(): Promise<{ data: any; error: Error | null }> {
  return apiRequest("upload.php", "GET", null, false, "[GALERI API] GET upload config");
}

/**
 * 6. ADD PHOTO
 * POST https://api.mkverse.my.id/api/add-photo.php
 * JSON Payload: { title, description, image_url, category_id, activity_id, event_date, is_featured, display_order }
 */
export async function addPhoto(data: {
  title?: string;
  description?: string;
  image_url: string;
  category_id?: string | number;
  activity_id?: string | number | null;
  event_date?: string;
  is_featured?: number | boolean;
  display_order?: number;
} | FormData) {
  if (data instanceof FormData) {
    console.log("[GALERI API] Add photo request (FormData)");
    const res = await apiRequest("add-photo.php", "POST", data, true, "[GALERI API] Add photo");
    console.log("[GALERI API] Add photo response", res.data || res.error);
    return res;
  }

  // Safe title fallback so title is never empty
  const safeTitle =
    (typeof data.title === "string" ? data.title.trim() : "") || "Foto Kegiatan";

  const payload = {
    title: safeTitle,
    description: data.description || "",
    image_url: data.image_url || "",
    category_id: data.category_id ? Number(data.category_id) : 1,
    activity_id:
      data.activity_id !== undefined &&
      data.activity_id !== null &&
      data.activity_id !== ""
        ? Number(data.activity_id)
        : null,
    event_date: data.event_date || new Date().toISOString().split("T")[0],
    is_featured: data.is_featured ? 1 : 0,
    display_order: Number(data.display_order ?? 0),
  };

  console.log("[GALERI API] SAVE PHOTO PAYLOAD:", payload);

  try {
    const addResponse = await fetch(`${API_BASE_URL}/add-photo.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const addText = await addResponse.text();
    let addResult: any;

    try {
      addResult = JSON.parse(addText);
    } catch {
      console.error("[GALERI API] SAVE PHOTO ERROR", {
        status: addResponse.status,
        body: addText,
      });
      throw new Error(`Add Photo API mengembalikan response bukan JSON (HTTP ${addResponse.status}): ${addText}`);
    }

    console.log("[GALERI API] Add photo response", addResult);

    if (!addResponse.ok || addResult?.success !== true) {
      console.error("[GALERI API] SAVE PHOTO ERROR", {
        status: addResponse.status,
        body: addResult,
        message: addResult?.message,
        data: addResult?.data,
        error: addResult?.error,
      });
      return {
        data: addResult,
        error: new Error(addResult?.message || "Gagal menyimpan data foto ke database."),
      };
    }

    return { data: addResult, error: null };
  } catch (err: any) {
    console.error("[GALERI API] SAVE PHOTO ERROR", err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 7. UPDATE PHOTO
 * POST https://api.mkverse.my.id/api/update-photo.php
 * Fields: id, title, description, image_url, category_id, activity_id, event_date, is_featured, display_order
 */
export async function updatePhoto(data: {
  id: string | number;
  title?: string;
  description?: string;
  image_url?: string;
  category_id?: string | number;
  activity_id?: string | number | null;
  event_date?: string;
  is_featured?: number | boolean;
  display_order?: number;
} | FormData) {
  console.log("[GALERI API] UPDATE photo request", data);
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
    if (data.activity_id !== undefined && data.activity_id !== null) formData.append("activity_id", String(data.activity_id));
    if (data.event_date !== undefined) formData.append("event_date", data.event_date);
    if (data.is_featured !== undefined) formData.append("is_featured", data.is_featured ? "1" : "0");
    if (data.display_order !== undefined) formData.append("display_order", String(data.display_order));
  }

  const res = await apiRequest("update-photo.php", "POST", formData, true, "[GALERI API] UPDATE photo");
  console.log("[GALERI API] UPDATE photo response", res);
  return res;
}

/**
 * 8. DELETE PHOTO / MEDIA
 * POST https://api.mkverse.my.id/api/delete-photo.php
 * Content-Type: application/json
 * Payload: { "id": Number(photo.id) }
 */
export async function deletePhoto(id: string | number) {
  const numericId = Number(id);
  console.log("[GALERI API] DELETE PHOTO REQUEST", {
    id: numericId,
  });

  try {
    const url = `${API_BASE_URL}/delete-photo.php`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: numericId }),
    });

    const text = await res.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch {
      console.warn("[GALERI API] DELETE photo non-JSON response:", text);
    }

    const responseBody = result || text;
    console.log("[GALERI API] DELETE PHOTO RESPONSE", responseBody);

    if (!res.ok || result?.success !== true) {
      console.error("[GALERI API] DELETE ERROR", {
        status: res.status,
        body: responseBody,
      });
      const errMsg = result?.message || `HTTP Error ${res.status}: ${res.statusText}`;
      return { data: result, error: new Error(errMsg) };
    }

    return { data: result, error: null };
  } catch (err: any) {
    console.error("[GALERI API] DELETE ERROR", err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 9. GET ACTIVITIES
 * GET https://api.mkverse.my.id/api/activities.php
 * Filter ?published=1 for public page
 */
export async function fetchActivities(publishedOnly: boolean = false) {
  const query = publishedOnly ? "?published=1" : "";
  console.log(`[GALERI API] GET activities${query}`);
  const res = await apiRequest(
    `activities.php${query}`,
    "GET",
    null,
    false,
    `[GALERI API] GET activities${query}`
  );
  console.log(`[GALERI API] GET activities response`, res.data || res.error);
  return res;
}

/**
 * 10. ADD ACTIVITY
 * POST https://api.mkverse.my.id/api/add-activity.php
 */
export async function addActivity(data: {
  title: string;
  slug?: string;
  google_drive_url?: string | null;
  description?: string;
  category_id?: string | number | null;
  event_date?: string;
  cover_url?: string;
  is_published?: number | boolean;
  display_order?: number;
} | FormData) {
  if (data instanceof FormData) {
    console.log("[GALERI API] ADD activity (FormData)");
    const res = await apiRequest("add-activity.php", "POST", data, true, "[GALERI API] ADD activity");
    console.log("[GALERI API] ADD activity response", res.data || res.error);
    return res;
  }

  const payload = {
    title: data.title.trim(),
    slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    google_drive_url: data.google_drive_url ? data.google_drive_url.trim() : null,
    description: data.description || "",
    category_id: data.category_id ? Number(data.category_id) : null,
    event_date: data.event_date || new Date().toISOString().split("T")[0],
    cover_url: data.cover_url || "",
    is_published: data.is_published === undefined ? 1 : (data.is_published ? 1 : 0),
    display_order: Number(data.display_order ?? 0),
  };

  console.log("[GALERI API] ADD activity", payload);
  const res = await apiRequest("add-activity.php", "POST", payload, false, "[GALERI API] ADD activity");
  console.log("[GALERI API] ADD activity response", res.data || res.error);
  return res;
}

/**
 * 11. UPDATE ACTIVITY
 * POST https://api.mkverse.my.id/api/update-activity.php
 */
export async function updateActivity(data: {
  id: string | number;
  title: string;
  slug?: string;
  google_drive_url?: string | null;
  description?: string;
  category_id?: string | number | null;
  event_date?: string;
  cover_url?: string;
  is_published?: number | boolean;
  display_order?: number;
} | FormData) {
  if (data instanceof FormData) {
    console.log("[GALERI API] UPDATE activity (FormData)");
    return apiRequest("update-activity.php", "POST", data, true, "[GALERI API] UPDATE activity");
  }

  const payload = {
    id: Number(data.id),
    title: data.title.trim(),
    slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    google_drive_url: data.google_drive_url !== undefined ? (data.google_drive_url ? data.google_drive_url.trim() : null) : undefined,
    description: data.description || "",
    category_id: data.category_id ? Number(data.category_id) : null,
    event_date: data.event_date || new Date().toISOString().split("T")[0],
    cover_url: data.cover_url || "",
    is_published: data.is_published === undefined ? 1 : (data.is_published ? 1 : 0),
    display_order: Number(data.display_order ?? 0),
  };

  console.log("[GALERI API] UPDATE activity request", payload);
  return apiRequest("update-activity.php", "POST", payload, false, "[GALERI API] UPDATE activity");
}

/**
 * 12. DELETE ACTIVITY
 * POST https://api.mkverse.my.id/api/delete-activity.php
 */
export async function deleteActivity(id: string | number) {
  const numericId = Number(id);
  console.log("[GALERI API] DELETE ACTIVITY REQUEST", {
    id: numericId,
  });

  try {
    const url = `${API_BASE_URL}/delete-activity.php`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: numericId }),
    });

    const text = await res.text();
    let result: any = null;
    try {
      result = JSON.parse(text);
    } catch {
      console.warn("[GALERI API] DELETE activity non-JSON response:", text);
    }

    const responseBody = result || text;
    console.log("[GALERI API] DELETE ACTIVITY RESPONSE", responseBody);

    if (
      res.status === 404 ||
      (result && result.success === false && result.message?.toLowerCase().includes("tidak ditemukan"))
    ) {
      console.log(`[GALERI API] Activity ID ${numericId} is already absent.`);
      return {
        data: {
          success: true,
          message: "Data kegiatan telah dihapus dari daftar.",
          data: { id: numericId },
        },
        error: null,
      };
    }

    if (!res.ok || result?.success !== true) {
      console.error("[GALERI API] DELETE ERROR", {
        status: res.status,
        body: responseBody,
      });
      const errMsg = result?.message || `HTTP Error ${res.status}: ${res.statusText}`;
      return { data: result, error: new Error(errMsg) };
    }

    return { data: result, error: null };
  } catch (err: any) {
    console.error("[GALERI API] DELETE ERROR", err);
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

