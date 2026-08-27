/**
 * Helper to get storage object path from relative path, public URL, or signed URL.
 * Example:
 * https://xxxx.supabase.co/storage/v1/object/public/gallery-media/images/2026/test.jpg
 * -> images/2026/test.jpg
 */
export function getStorageObjectPath(value: string | null | undefined, bucketName: string = 'gallery-media'): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Blob URLs or data URIs are not stored in Supabase storage bucket
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return null;
  }

  const bucketPublicMarker = `/storage/v1/object/public/${bucketName}/`;
  const bucketSignMarker = `/storage/v1/object/sign/${bucketName}/`;
  const bucketAltMarker = `/storage/v1/object/${bucketName}/`;

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

  // If it's a full http/https URL:
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname;
      const marker = `/${bucketName}/`;
      const idx = pathname.indexOf(marker);
      if (idx !== -1) {
        return pathname.substring(idx + marker.length);
      }
    } catch (_) {
      // Ignore URL parse error
    }
    return null; // External URL (e.g., Google Drive or external image)
  }

  // Relative path like "images/2026/test.jpg"
  return trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
