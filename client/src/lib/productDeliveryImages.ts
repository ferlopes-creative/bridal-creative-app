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

/** Galeria de vídeos (array novo), com fallback pro campo único legado se a galeria estiver vazia. */
export function resolveVideoGallery(galleryRaw: unknown, legacyUrl: string | null | undefined): string[] {
  const gallery = parseGalleryUrls(galleryRaw);
  if (gallery.length > 0) return gallery;
  const legacy = legacyUrl?.trim();
  return legacy ? [legacy] : [];
}

const VIDEO_URL_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv", ".avi", ".mkv"];

/** Detecta se uma URL de mídia é vídeo pela extensão do arquivo. */
export function guessMediaKind(url: string): "image" | "video" {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return VIDEO_URL_EXTENSIONS.some((ext) => clean.endsWith(ext)) ? "video" : "image";
}

/**
 * Lista unificada de mídia da venda (fotos + vídeos), na ordem escolhida no Admin —
 * `sales_gallery_urls` guarda a lista mista. Produtos antigos com vídeos ainda separados em
 * `sales_video_urls`/`video_sales_url` continuam aparecendo (mesclados no fim) até serem salvos de novo.
 */
export function resolveSalesMedia(
  mediaRaw: unknown,
  legacyVideoGalleryRaw: unknown,
  legacyVideoUrl: string | null | undefined
): string[] {
  const media = parseGalleryUrls(mediaRaw);
  const legacyVideos = resolveVideoGallery(legacyVideoGalleryRaw, legacyVideoUrl).filter(
    (url) => !media.includes(url)
  );
  return [...media, ...legacyVideos];
}
