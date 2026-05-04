import { supabase } from "@/lib/supabase";

export type SiteSettingsRow = {
  logo_url: string | null;
  page_background_image_url: string | null;
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

/** Erro do PostgREST quando a coluna `hero_banner_urls` / cache de schema ainda não existe. */
export function isHeroBannerUrlsSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("hero_banner_urls") || m.includes("schema cache");
}

/**
 * Lê `site_settings` (id=1). Se a coluna `hero_banner_urls` ainda não existir no projeto Supabase,
 * repete o SELECT só com as colunas antigas e usa `hero_image_url` como lista de um item.
 */
export async function fetchSiteSettingsRow(): Promise<SiteSettingsRow | null> {
  let { data, error } = await supabase
    .from("site_settings")
    .select("logo_url, page_background_image_url, hero_image_url, hero_banner_urls")
    .eq("id", 1)
    .maybeSingle();

  if (error && isHeroBannerUrlsSchemaError(error.message)) {
    const second = await supabase
      .from("site_settings")
      .select("logo_url, page_background_image_url, hero_image_url")
      .eq("id", 1)
      .maybeSingle();
    data = second.data as typeof data;
    error = second.error;
  }

  if (error) {
    console.warn("site_settings:", error.message);
    return null;
  }
  if (!data) {
    return null;
  }

  const raw = (data as { hero_banner_urls?: unknown }).hero_banner_urls;
  const legacyHero = data.hero_image_url?.trim() || null;
  const hero_banner_urls = parseHeroBannerUrls(raw, legacyHero);

  return {
    logo_url: data.logo_url ?? null,
    page_background_image_url: data.page_background_image_url ?? null,
    hero_image_url: legacyHero,
    hero_banner_urls,
  };
}
