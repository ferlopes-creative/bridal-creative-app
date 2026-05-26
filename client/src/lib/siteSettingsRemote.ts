import { resolveSiteColors, type SiteColors } from "@/lib/siteColors";
import { supabase } from "@/lib/supabase";

/** Opacidade padrão da textura (~22 %; antes era 14 % fixo no CSS). */
export const DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT = 22;

export type SiteSettingsRow = {
  logo_url: string | null;
  page_background_image_url: string | null;
  page_background_login_url: string | null;
  page_background_app_url: string | null;
  page_background_opacity_percent: number;
  hero_image_url: string | null;
  hero_banner_urls: string[];
  hero_banner_desktop_urls: string[];
  colors: SiteColors;
  whatsapp_url: string | null;
};

function parseOpacityPercent(raw: unknown): number {
  if (raw == null || raw === "") {
    return DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT;
  }
  return Math.min(100, Math.max(0, Math.round(n)));
}

function urlsFromJsonValue(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

export function parseHeroBannerUrls(raw: unknown, legacyHero: string | null): string[] {
  let urls: string[] = [];
  if (Array.isArray(raw)) {
    urls = raw.flatMap((u) => urlsFromJsonValue(u));
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) {
        urls = p.flatMap((u) => urlsFromJsonValue(u));
      }
    } catch {
      urls = urlsFromJsonValue(raw);
    }
  }
  const legacy = legacyHero?.trim() || null;
  if (urls.length === 0 && legacy) {
    urls = [legacy];
  }
  return urls;
}

function rowFromData(data: Record<string, unknown>): SiteSettingsRow {
  const raw = data.hero_banner_urls;
  const legacyHero = (data.hero_image_url as string | null | undefined)?.trim() || null;
  const hero_banner_urls = parseHeroBannerUrls(raw, legacyHero);
  const hero_banner_desktop_urls = parseHeroBannerUrls(
    data.hero_banner_desktop_urls,
    null
  );
  return {
    logo_url: (data.logo_url as string | null | undefined) ?? null,
    page_background_image_url: (data.page_background_image_url as string | null | undefined) ?? null,
    page_background_login_url: (data.page_background_login_url as string | null | undefined) ?? null,
    page_background_app_url: (data.page_background_app_url as string | null | undefined) ?? null,
    page_background_opacity_percent: parseOpacityPercent(data.page_background_opacity_percent),
    hero_image_url: legacyHero,
    hero_banner_urls,
    hero_banner_desktop_urls,
    colors: resolveSiteColors(data),
    whatsapp_url: (data.whatsapp_url as string | null | undefined)?.trim() || null,
  };
}

/**
 * Lê `site_settings` (id=1). Usa `select('*')` para incluir colunas novas após migrações sem depender de tipos do PostgREST.
 */
export async function fetchSiteSettingsRow(): Promise<SiteSettingsRow | null> {
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();

  if (error) {
    console.warn("site_settings:", error.message);
    return null;
  }
  if (!data) {
    return null;
  }
  return rowFromData(data as unknown as Record<string, unknown>);
}

/** Erro do PostgREST quando a coluna `hero_banner_urls` / cache de schema ainda não existe. */
export function isHeroBannerUrlsSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("hero_banner_urls") || m.includes("schema cache");
}

export function isHeroBannerDesktopUrlsSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("hero_banner_desktop") || m.includes("schema cache");
}

export function isPageBackgroundSplitError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("page_background_login") || m.includes("page_background_app");
}

export function isPageBackgroundOpacityError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("page_background_opacity");
}

export function isWhatsappUrlSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("whatsapp_url");
}

export { isSiteColorsSchemaError } from "@/lib/siteColors";
