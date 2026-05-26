import type { SiteSettings } from "@/contexts/SiteSettingsContext";

/** Aceita URL completa, wa.me/… ou só dígitos (com DDI). */
export function normalizeWhatsAppUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const waMeMatch = trimmed.match(/^wa\.me\/(\d+)/i);
  if (waMeMatch) {
    return `https://wa.me/${waMeMatch[1]}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

export function resolveWhatsAppUrl(settings: Pick<SiteSettings, "whatsapp_url">): string | null {
  const fromCms = normalizeWhatsAppUrl(settings.whatsapp_url);
  if (fromCms) return fromCms;

  const envUrl =
    typeof import.meta.env.VITE_WHATSAPP_URL === "string" ? import.meta.env.VITE_WHATSAPP_URL : null;
  return normalizeWhatsAppUrl(envUrl);
}
