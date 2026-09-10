/**
 * Normalizes image URLs.
 * - If the URL is absolute (http/https), it returns it exactly as is.
 * - If it's a relative path/filename, it prepends the correct uploads base URL.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // 1. If it's already an absolute URL (http/https), USE IT DIRECTLY.
  if (trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')) {
    return trimmed;
  } 
  
  const rawStorageUrl = ((import.meta as any).env.VITE_STORAGE_URL || "https://galeri.mkverse.my.id/uploads").trim().replace(/\/+$/, "");
  const baseUploadsUrl = rawStorageUrl.endsWith("/uploads") ? rawStorageUrl : `${rawStorageUrl}/uploads`;
  const filename = trimmed.startsWith('/') ? trimmed.split('/').pop() : trimmed;
  return `${baseUploadsUrl}/${filename}`;
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  // If it's a numeric ID (MySQL), it's valid for this context
  if (/^\d+$/.test(id)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
