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
  method: "GET" | "POST" | "DELETE" = "GET",
  body: any = null,
  isFormData: boolean = false,
  logTag?: string
): Promise<{ data: ApiResponse<T> | null; error: Error | null }> {
  // LiteSpeed hosting blocks PUT and PATCH (HTTP 403 Forbidden). Force POST for any update requests.
  const safeMethod = ((method as any) === "PUT" || (method as any) === "PATCH") ? "POST" : method;
  const tag = logTag || `[GALERI API] ${safeMethod} ${endpoint}`;
  const headers: Record<string, string> = {};

  if (!isFormData && body && safeMethod !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    method: safeMethod,
    headers,
  };

  if (body && safeMethod !== "GET") {
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
    // If browser threw CORS "Failed to fetch" on external domain, try same-origin proxy fallback
    if (typeof window !== "undefined" && url.startsWith("https://api.mkverse.my.id") && String(err?.message || "").toLowerCase().includes("fetch")) {
      try {
        const fallbackUrl = `/api/${cleanEndpoint}`;
        console.log(`${tag} CORS Failed to fetch detected, retrying via same-origin proxy: ${fallbackUrl}`);
        const fbRes = await fetch(fallbackUrl, config);
        const fbText = await fbRes.text();
        const fbResult = JSON.parse(fbText);
        if (fbResult && typeof fbResult === "object" && fbResult.success !== false) {
          return { data: fbResult, error: null };
        }
      } catch {
        // Fall back to original error
      }
    }
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
  const res = await apiRequest("settings.php", "GET", null, false, "[GALERI API] GET settings");
  if (res.data) {
    console.log("[GALERI SETTINGS] LOAD", res.data);
  }
  return res;
}

/**
 * 3b. SAVE SETTINGS
 * POST https://api.mkverse.my.id/api/save-settings.php
 */
export async function saveSettings(payload: Record<string, any>) {
  console.log("[GALERI SETTINGS] SAVE PAYLOAD", payload);
  const res = await apiRequest("save-settings.php", "POST", payload, false, "[GALERI API] SAVE settings");
  console.log("[GALERI SETTINGS] SAVE RESPONSE", res.data || res.error);
  return res;
}

/**
 * 3c. GET VISION & MISSION
 * GET https://api.mkverse.my.id/api/vision-mission.php
 */
export async function fetchVisionMission() {
  console.log("[GALERI API] GET vision-mission");
  return apiRequest("vision-mission.php", "GET", null, false, "[GALERI API] GET vision-mission");
}

/**
 * 3d. SAVE VISION & MISSION ITEM
 * POST https://api.mkverse.my.id/api/vision-mission.php
 */
export async function saveVisionMission(item: {
  id?: number | string;
  title: string;
  content: string;
  display_order?: number;
  is_active?: number;
}) {
  console.log("[GALERI API] SAVE vision-mission", item);
  return apiRequest("vision-mission.php", "POST", item, false, "[GALERI API] SAVE vision-mission");
}

/**
 * 3e. DELETE VISION & MISSION ITEM
 * POST https://api.mkverse.my.id/api/vision-mission.php
 */
export async function deleteVisionMission(id: number | string) {
  console.log("[GALERI API] DELETE vision-mission", id);
  return apiRequest("vision-mission.php", "POST", { action: "delete", id: Number(id) }, false, "[GALERI API] DELETE vision-mission");
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
  if (data instanceof FormData) {
    console.log("[GALERI API] UPDATE photo (FormData)");
    return apiRequest("update-photo.php", "POST", data, true, "[GALERI API] UPDATE photo");
  }

  // Bangun payload hanya dari field yang tersedia agar tidak menghilangkan data lama di server
  const payload: Record<string, any> = {
    id: Number(data.id),
  };

  if (data.title !== undefined && data.title !== null) {
    payload.title = String(data.title).trim();
  }
  if (data.description !== undefined && data.description !== null) {
    payload.description = String(data.description);
  }
  if (data.image_url !== undefined && data.image_url !== null && data.image_url !== "") {
    payload.image_url = String(data.image_url).trim();
  }
  if (data.category_id !== undefined && data.category_id !== null && data.category_id !== "") {
    payload.category_id = Number(data.category_id);
  }
  if (data.activity_id !== undefined && data.activity_id !== null && data.activity_id !== "") {
    payload.activity_id = Number(data.activity_id);
  } else if (data.activity_id === null) {
    payload.activity_id = null;
  }
  if (data.event_date !== undefined && data.event_date !== null && data.event_date !== "") {
    payload.event_date = String(data.event_date);
  }
  if (data.is_featured !== undefined && data.is_featured !== null) {
    payload.is_featured = data.is_featured ? 1 : 0;
  }
  if (data.display_order !== undefined && data.display_order !== null) {
    payload.display_order = Number(data.display_order);
  }

  console.log('[GALERI API] UPDATE photo payload:', payload);

  const url = `${API_BASE_URL}/update-photo.php`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log('[GALERI API] UPDATE photo STATUS', response.status);

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      const errorMsg = `Server mengembalikan response bukan JSON (HTTP ${response.status}).`;
      console.error("[GALERI API] UPDATE photo Non-JSON Response:", errorMsg);
      return { data: null, error: new Error(errorMsg) };
    }

    if (!response.ok || result?.success !== true) {
      const errorMsg = result?.message || `Gagal memperbarui foto (HTTP ${response.status}).`;
      console.error("[GALERI API] UPDATE photo Error:", errorMsg, result);
      return { data: result, error: new Error(errorMsg) };
    }

    if (response.status === 200 && result?.success === true) {
      console.log("[GALERI API] UPDATE photo Success:", result);
      return { data: result, error: null };
    }

    return { data: result, error: null };
  } catch (err: any) {
    const detailedError = err instanceof Error ? err.message : String(err);
    console.error("[GALERI API] UPDATE photo Network/Runtime Error:", detailedError);
    return { data: null, error: new Error(detailedError) };
  }
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

  const payload: Record<string, any> = {
    id: Number(data.id),
    title: data.title.trim(),
    slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    google_drive_url: data.google_drive_url !== undefined
      ? (data.google_drive_url ? data.google_drive_url.trim() : null)
      : null,
    description: data.description || "",
    category_id: data.category_id ? Number(data.category_id) : null,
    event_date: data.event_date || new Date().toISOString().split("T")[0],
    cover_url: data.cover_url || "",
    is_published: data.is_published === undefined ? 1 : (data.is_published ? 1 : 0),
    display_order: Number(data.display_order ?? 0),
  };

  console.log('[GALERI API] UPDATE activity payload:', payload);

  const url = `${API_BASE_URL}/update-activity.php`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log('[GALERI API] UPDATE activity STATUS', response.status);

    const raw = await response.text();
    console.log('[GALERI API] UPDATE activity RAW RESPONSE', raw);

    let parsedData: any;
    try {
      parsedData = JSON.parse(raw);
    } catch {
      const errorMsg = `Server mengembalikan response bukan JSON (HTTP ${response.status}): ${raw.substring(0, 300)}`;
      console.error("[GALERI API] UPDATE activity Non-JSON Response:", errorMsg);
      return { data: null, error: new Error(errorMsg) };
    }

    if (response.ok && (parsedData?.success === true || response.status === 200)) {
      console.log("[GALERI API] UPDATE activity Success:", parsedData);
      return { data: parsedData, error: null };
    }

    const errorMsg = parsedData?.message || `Gagal memperbarui kegiatan (HTTP ${response.status}).`;
    console.error("[GALERI API] UPDATE activity Error:", errorMsg, parsedData);
    return { data: parsedData, error: new Error(errorMsg) };
  } catch (err: any) {
    const detailedError = err instanceof Error ? err.message : String(err);
    console.error("[GALERI API] UPDATE activity Network/Runtime Error:", detailedError);
    return { data: null, error: new Error(detailedError) };
  }
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

// ============================================================================
// ============================================================================
// TWIBON API CLIENT (MySQL + PHP Backend as Single Source of Truth)
// Direct endpoints:
//   - GET  twibon-list.php
//   - GET  twibon-detail.php?id=ID / ?slug=SLUG
//   - POST twibon-upload.php
//   - POST twibon-save.php
//   - POST twibon-update.php
//   - POST twibon-delete.php
//   - POST twibon-delete-file.php
//   - GET  twibon-settings.php
//   - GET  twibon-health.php
// ============================================================================

/**
 * Helper to determine best API endpoint URL for Twibon.
 * Routes through same-origin /api proxy in preview/dev, or direct to PHP API.
 */
export function getTwibonApiUrl(endpoint: string = "twibon-list.php", query: string = ""): string {
  const isPreviewOrLocal =
    typeof window !== "undefined" &&
    window.location.origin &&
    !window.location.origin.includes("galerifoto.mkverse.my.id");

  const base = isPreviewOrLocal ? "/api" : API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `${base}/${cleanEndpoint}${q}`;
}

export function getDirectTwibonApiUrl(endpoint: string = "twibon-list.php", query: string = ""): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `${API_BASE_URL}/${cleanEndpoint}${q}`;
}

const formatTwibbonItem = (item: any) => {
  const frameUrl = item.frame_url || item.design_url || item.designUrl || "";
  const isActive = item.is_active === 1 || item.isActive === true || item.is_active === "1" || item.is_active === true;
  return {
    id: item.id !== undefined ? String(item.id) : "",
    title: String(item.title || ""),
    slug: String(item.slug || ""),
    description: String(item.description || ""),
    ratio: (item.ratio || "1:1") as "1:1" | "4:3" | "16:9" | "9:16",
    frame_url: frameUrl,
    frameUrl: frameUrl,
    designUrl: frameUrl,
    design_url: frameUrl,
    isActive: isActive,
    is_active: isActive ? 1 : 0,
    useCount: Number(item.use_count ?? item.useCount ?? 0),
    use_count: Number(item.use_count ?? item.useCount ?? 0),
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
  };
};

/**
 * 1. Fetch all Twibons or published/active-only Twibons
 * Endpoint: twibon-list.php
 * Single source of truth: PHP API + MySQL Database
 */
export async function fetchTwibbons(activeOnly: boolean = false): Promise<{ data: any[] | null; error: Error | null }> {
  const query = activeOnly ? `active=1&_t=${Date.now()}` : `_t=${Date.now()}`;
  const directUrl = `${API_BASE_URL}/twibon-list.php?${query}`;
  const proxyUrl = `/api/twibon-list.php?${query}`;

  const fetchWithUrl = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  let json: any = null;
  let lastError: Error | null = null;

  // Primary: direct call to PHP backend (https://api.mkverse.my.id/api/twibon-list.php)
  try {
    json = await fetchWithUrl(directUrl);
  } catch (err: any) {
    lastError = err;
    // Fallback in dev/preview container if browser enforces cross-origin restriction
    try {
      json = await fetchWithUrl(proxyUrl);
      lastError = null;
    } catch (err2: any) {
      lastError = err2;
    }
  }

  if (json) {
    if (json.success === true && Array.isArray(json.data)) {
      return { data: json.data.map(formatTwibbonItem), error: null };
    }
    if (Array.isArray(json.data)) {
      return { data: json.data.map(formatTwibbonItem), error: null };
    }
    if (Array.isArray(json)) {
      return { data: json.map(formatTwibbonItem), error: null };
    }
    if (json.success === false) {
      return { data: null, error: new Error(json.message || "Gagal memuat data Twibon dari server.") };
    }
    return { data: [], error: null };
  }

  return {
    data: null,
    error: lastError || new Error("Gagal menghubungi server untuk memuat daftar Twibon."),
  };
}

/**
 * 2. Fetch Twibon detail by slug or ID
 * Endpoint: twibon-detail.php?id=ID / ?slug=SLUG
 * Single source of truth: PHP API + MySQL Database
 */
export async function fetchTwibbonDetail(slugOrId: string | number): Promise<{ data: any | null; error: Error | null }> {
  const isId = typeof slugOrId === "number" || (/^\d+$/.test(String(slugOrId)) && !String(slugOrId).includes("-"));
  const param = isId ? `id=${slugOrId}` : `slug=${encodeURIComponent(slugOrId)}`;
  const query = `${param}&_t=${Date.now()}`;
  const primaryUrl = getTwibonApiUrl("twibon-detail.php", query);
  const directUrl = getDirectTwibonApiUrl("twibon-detail.php", query);

  const fetchWithUrl = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    });
    const text = await res.text();
    return { status: res.status, json: JSON.parse(text) };
  };

  try {
    let result: { status: number; json: any };
    try {
      result = await fetchWithUrl(primaryUrl);
    } catch {
      result = await fetchWithUrl(directUrl);
    }

    const { status, json } = result;

    if (status === 404 || (json && json.success === false && json.message?.toLowerCase().includes("tidak ditemukan"))) {
      return { data: null, error: new Error("Twibon tidak ditemukan atau sudah dihapus.") };
    }

    if (json && json.success === true && json.data) {
      return { data: formatTwibbonItem(json.data), error: null };
    }

    return { data: null, error: new Error(json?.message || "Twibon tidak ditemukan atau sudah dihapus.") };
  } catch (err: any) {
    try {
      const { json } = await fetchWithUrl(directUrl);
      if (json && json.success === true && json.data) {
        return { data: formatTwibbonItem(json.data), error: null };
      }
    } catch {}

    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 3. Upload Twibon Frame PNG file to backend endpoint:
 * Endpoint: twibon-upload.php
 * Field: 'file' (FormData)
 * Content-Type: multipart/form-data boundary automatically set by browser
 */
export async function uploadTwibbonFrame(
  file: File
): Promise<{ url: string | null; filename?: string; error: string | null }> {
  const formData = new FormData();
  formData.append("file", file);

  const directEndpoint = "https://api.mkverse.my.id/api/twibon-upload.php";
  const proxyEndpoint = "/api/twibon-upload.php";

  const isPreviewOrLocal =
    typeof window !== "undefined" &&
    window.location.origin &&
    !window.location.origin.includes("galerifoto.mkverse.my.id");

  const primaryUrl = isPreviewOrLocal ? proxyEndpoint : directEndpoint;
  const secondaryUrl = isPreviewOrLocal ? directEndpoint : proxyEndpoint;

  const doUpload = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "POST",
      // CRITICAL: Do NOT set Content-Type header so browser generates multipart boundary automatically
      body: formData,
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Server mengembalikan response bukan JSON (HTTP ${res.status}): ${text.substring(0, 100)}`);
    }
    return json;
  };

  try {
    let result: any;
    try {
      result = await doUpload(primaryUrl);
    } catch {
      result = await doUpload(secondaryUrl);
    }

    if (result && result.success && result.data) {
      const serverUrl = result.data.url || result.data.public_url;
      if (serverUrl) {
        return {
          url: serverUrl,
          filename: result.data.filename,
          error: null,
        };
      }
    }

    return {
      url: null,
      error: result?.message || "Gagal mengunggah frame Twibon ke server.",
    };
  } catch (err: any) {
    return {
      url: null,
      error: err?.message || "Gagal menghubungi endpoint twibon-upload.php",
    };
  }
}

/**
 * 4. Add / Create Twibon in MySQL via PHP Backend
 * Endpoint: twibon-save.php
 */
export async function addTwibbon(data: {
  title: string;
  slug?: string;
  description?: string;
  ratio?: "1:1" | "4:3" | "16:9" | "9:16";
  design_url?: string;
  frame_filename?: string;
  filename?: string;
  is_active?: boolean | number;
  file?: File;
}): Promise<{ data: any | null; error: Error | null }> {
  const frameUrl = data.design_url || "";
  const frameFilename =
    data.frame_filename ||
    data.filename ||
    (frameUrl ? frameUrl.split("/").pop() : "") ||
    "";

  const body = {
    title: data.title.trim(),
    slug: data.slug?.trim() || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""),
    description: data.description?.trim() || "",
    ratio: data.ratio || "1:1",
    frame_filename: frameFilename,
    frame_url: frameUrl,
    design_url: frameUrl,
    is_active: data.is_active === 0 || data.is_active === false ? 0 : 1,
  };

  const primaryUrl = getTwibonApiUrl("twibon-save.php");
  const directUrl = getDirectTwibonApiUrl("twibon-save.php");

  const executePost = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  try {
    let json: any;
    try {
      json = await executePost(primaryUrl);
    } catch {
      json = await executePost(directUrl);
    }

    if (json && json.success) {
      return { data: json.data ? formatTwibbonItem(json.data) : json.data, error: null };
    }
    return { data: null, error: new Error(json?.message || "Gagal menambahkan Twibon.") };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 5. Update Twibon in MySQL via PHP Backend
 * Endpoint: twibon-update.php
 */
export async function updateTwibbon(data: {
  id: string | number;
  title?: string;
  slug?: string;
  description?: string;
  ratio?: "1:1" | "4:3" | "16:9" | "9:16";
  design_url?: string;
  frame_filename?: string;
  filename?: string;
  is_active?: boolean | number;
  file?: File;
}): Promise<{ data: any | null; error: Error | null }> {
  const frameUrl = data.design_url;
  const frameFilename =
    data.frame_filename ||
    data.filename ||
    (frameUrl ? frameUrl.split("/").pop() : undefined);

  const body: Record<string, any> = {
    id: Number(data.id),
  };

  if (data.title !== undefined) body.title = data.title.trim();
  if (data.slug !== undefined) body.slug = data.slug.trim();
  if (data.description !== undefined) body.description = data.description.trim();
  if (data.ratio !== undefined) body.ratio = data.ratio;
  if (frameUrl !== undefined) {
    body.frame_url = frameUrl;
    body.design_url = frameUrl;
  }
  if (frameFilename !== undefined) {
    body.frame_filename = frameFilename;
  }
  if (data.is_active !== undefined) {
    body.is_active = data.is_active ? 1 : 0;
  }

  const primaryUrl = getTwibonApiUrl("twibon-update.php");
  const directUrl = getDirectTwibonApiUrl("twibon-update.php");

  const executePost = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  try {
    let json: any;
    try {
      json = await executePost(primaryUrl);
    } catch {
      json = await executePost(directUrl);
    }

    if (json && json.success) {
      return { data: json.data ? formatTwibbonItem(json.data) : json.data, error: null };
    }
    return { data: null, error: new Error(json?.message || "Gagal memperbarui Twibon.") };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 6. Delete Twibon from MySQL via PHP Backend
 * Endpoint: twibon-delete.php
 */
export async function deleteTwibbon(id: string | number): Promise<{ data: any | null; error: Error | null }> {
  const numericId = Number(id);
  const body = { id: numericId };
  const primaryUrl = getTwibonApiUrl("twibon-delete.php");
  const directUrl = getDirectTwibonApiUrl("twibon-delete.php");

  const executePost = async (targetUrl: string) => {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return JSON.parse(text);
  };

  try {
    let json: any;
    try {
      json = await executePost(primaryUrl);
    } catch {
      json = await executePost(directUrl);
    }

    if (json && json.success) {
      return { data: json.data, error: null };
    }
    return { data: null, error: new Error(json?.message || "Gagal menghapus Twibon.") };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * 7. Delete Twibon Frame file on disk via PHP Backend
 * Endpoint: twibon-delete-file.php
 */
export async function deleteTwibbonFile(filename: string): Promise<{ data: any | null; error: Error | null }> {
  if (!filename) return { data: null, error: null };
  const body = { filename };
  const primaryUrl = getTwibonApiUrl("twibon-delete-file.php");
  const directUrl = getDirectTwibonApiUrl("twibon-delete-file.php");

  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() =>
      fetch(directUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
    const json = await res.json();
    return { data: json.data, error: null };
  } catch (err: any) {
    return { data: null, error: null }; // Non-blocking
  }
}

/**
 * 8. Increment use/download count for a Twibon in MySQL
 * Endpoint: twibon-update.php or twibon.php (action=increment_use)
 */
export async function incrementTwibbonUse(id: string | number): Promise<void> {
  const numericId = Number(id);
  const primaryUrl = getTwibonApiUrl("twibon.php");
  try {
    await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment_use", id: numericId }),
    });
  } catch {
    // Non-blocking statistic increment
  }
}

/**
 * 9. Fetch Twibon Settings
 * Endpoint: twibon-settings.php
 */
export async function fetchTwibbonSettings(): Promise<{ data: any | null; error: Error | null }> {
  const primaryUrl = getTwibonApiUrl("twibon-settings.php");
  try {
    const res = await fetch(primaryUrl, {
      method: "GET",
      cache: "no-store",
    });
    const json = await res.json();
    return { data: json.data || json, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}



