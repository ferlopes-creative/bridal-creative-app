function urlFromValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normaliza `delivery_gallery_urls` (jsonb ou string JSON) para lista de URLs. */
export function parseDeliveryGalleryUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(urlFromValue).filter((u): u is string => Boolean(u));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(urlFromValue).filter((u): u is string => Boolean(u));
      }
    } catch {
      const single = urlFromValue(raw);
      return single ? [single] : [];
    }
  }
  return [];
}
