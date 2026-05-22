/** Cores padrão do app (antes do CMS). */
export const DEFAULT_SITE_COLORS = {
  primary: "#6B705C",
  banner: "#5F684F",
  bannerLight: "#aeb6a1",
  pageBg: "#FBFAF6",
} as const;

export type SiteColors = {
  primary: string;
  banner: string;
  bannerLight: string;
  pageBg: string;
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** Normaliza #RGB → #RRGGBB; retorna null se inválido. */
export function normalizeHexColor(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!HEX_RE.test(t)) return null;
  if (t.length === 4) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return t.toUpperCase();
}

export function parseSiteColor(
  raw: unknown,
  fallback: string
): string {
  const n = normalizeHexColor(typeof raw === "string" ? raw : null);
  return n ?? fallback;
}

export function resolveSiteColors(row: {
  color_primary?: unknown;
  color_banner?: unknown;
  color_banner_light?: unknown;
  color_page_bg?: unknown;
} | null | undefined): SiteColors {
  return {
    primary: parseSiteColor(row?.color_primary, DEFAULT_SITE_COLORS.primary),
    banner: parseSiteColor(row?.color_banner, DEFAULT_SITE_COLORS.banner),
    bannerLight: parseSiteColor(row?.color_banner_light, DEFAULT_SITE_COLORS.bannerLight),
    pageBg: parseSiteColor(row?.color_page_bg, DEFAULT_SITE_COLORS.pageBg),
  };
}

/** Aplica variáveis CSS usadas pelo app (`bc-*` e `--primary` do shadcn). */
export function applySiteColorsToDocument(colors: SiteColors): void {
  const root = document.documentElement;
  root.style.setProperty("--bc-primary", colors.primary);
  root.style.setProperty("--bc-banner", colors.banner);
  root.style.setProperty("--bc-banner-light", colors.bannerLight);
  root.style.setProperty("--bc-page-bg", colors.pageBg);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--ring", colors.primary);
}

export function isSiteColorsSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("color_primary") ||
    m.includes("color_banner") ||
    m.includes("color_page_bg") ||
    m.includes("schema cache")
  );
}
