function urlFromValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normaliza galerias JSON (jsonb ou string JSON) para lista de URLs. */
export function parseGalleryUrls(raw: unknown): string[] {
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

/** @deprecated Use parseGalleryUrls — mantido para imports existentes. */
export function parseDeliveryGalleryUrls(raw: unknown): string[] {
  return parseGalleryUrls(raw);
}
