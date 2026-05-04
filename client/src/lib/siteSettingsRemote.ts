import { supabase } from "@/lib/supabase";

export type SiteSettingsRow = {
  logo_url: string | null;
  page_background_image_url: string | null;
  page_background_login_url: string | null;
  page_background_app_url: string | null;
  hero_image_url: string | null;
  hero_banner_urls: string[];
};

function parseHeroBannerUrls(raw: unknown, legacyHero: string | null): string[] {
  let urls: string[] = [];
  if (Array.isArray(raw)) {
    urls = raw.filter((u): u is string => typeof u === "string" && u.trim() !== "");
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) {
        urls = p.filter((u): u is string => typeof u === "string" && u.trim() !== "");
      }
    } catch {
      /* ignore */
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
  return {
    logo_url: (data.logo_url as string | null | undefined) ?? null,
    page_background_image_url: (data.page_background_image_url as string | null | undefined) ?? null,
    page_background_login_url: (data.page_background_login_url as string | null | undefined) ?? null,
    page_background_app_url: (data.page_background_app_url as string | null | undefined) ?? null,
    hero_image_url: legacyHero,
    hero_banner_urls,
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

export function isPageBackgroundSplitError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("page_background_login") || m.includes("page_background_app");
}
