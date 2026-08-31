/**
 * Helper to get storage object path from relative path, public URL, or signed URL.
 * Example:
 * https://xxxx.supabase.co/storage/v1/object/public/gallery-media/images/2026/test.jpg
 * -> images/2026/test.jpg
 */
export function getStorageObjectPath(value: string | null | undefined, bucketName: string = 'gallery'): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Blob URLs or data URIs are not stored in Supabase storage bucket
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return null;
  }

  const bucketNames = [bucketName, 'gallery', 'gallery-media'];
  for (const bName of bucketNames) {
    const bucketPublicMarker = `/storage/v1/object/public/${bName}/`;
    const bucketSignMarker = `/storage/v1/object/sign/${bName}/`;
    const bucketAltMarker = `/storage/v1/object/${bName}/`;

    if (trimmed.includes(bucketPublicMarker)) {
      const parts = trimmed.split(bucketPublicMarker);
      const pathWithQuery = parts[1];
      return pathWithQuery ? pathWithQuery.split('?')[0] : null;
    }
    if (trimmed.includes(bucketSignMarker)) {
      const parts = trimmed.split(bucketSignMarker);
      const pathWithQuery = parts[1];
      return pathWithQuery ? pathWithQuery.split('?')[0] : null;
    }
    if (trimmed.includes(bucketAltMarker)) {
      const parts = trimmed.split(bucketAltMarker);
      const pathWithQuery = parts[1];
      return pathWithQuery ? pathWithQuery.split('?')[0] : null;
    }
  }

  // If it's a full http/https URL:
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname;
      for (const bName of bucketNames) {
        const marker = `/${bName}/`;
        const idx = pathname.indexOf(marker);
        if (idx !== -1) {
          return pathname.substring(idx + marker.length);
        }
      }
    } catch (_) {
      // Ignore URL parse error
    }
    return null; // External URL (e.g., Google Drive or external image)
  }

  // Relative path like "images/2026/test.jpg"
  return trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
}


/**
 * Normalizes image URLs. If the URL is already absolute, it returns it exactly as is.
 * If it's a relative path from the PHP server, it prepends the correct domain.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // 1. If it's already an absolute URL, USE IT DIRECTLY.
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    console.log("[IMAGE DEBUG] Absolute URL (pass-through):", trimmed);
    return trimmed;
  }

  // 2. Handle paths starting with /uploads/ or uploads/
  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (cleanUrl.startsWith('/uploads/')) {
    const resolved = `https://galeri.mkverse.my.id${cleanUrl}`;
    console.log("[IMAGE DEBUG] Resolved from uploads path:", { original: trimmed, resolved });
    return resolved;
  }
  
  // 3. Fallback for filenames to /uploads/
  const resolved = `https://galeri.mkverse.my.id/uploads/${trimmed}`;
  console.log("[IMAGE DEBUG] Resolved from filename:", { original: trimmed, resolved });
  return resolved;
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  // If it's a numeric ID (MySQL), it's valid for this context
  if (/^\d+$/.test(id)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
