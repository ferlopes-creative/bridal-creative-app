import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applySiteColorsToDocument, DEFAULT_SITE_COLORS, type SiteColors } from "@/lib/siteColors";
import { applyFaviconToDocument } from "@/lib/favicon";
import { readSiteSettingsCache, writeSiteSettingsCache } from "@/lib/siteSettingsCache";
import {
  DEFAULT_DASHBOARD_SECTIONS_CONFIG,
  parseDashboardSectionOrder,
  parseDashboardSectionsConfig,
  type DashboardSectionConfig,
} from "@/lib/dashboardSections";
import { parseProductCategoriesConfig, type ProductCategoryConfig } from "@/lib/productCategories";
import { parseTestimonialsConfig, type TestimonialConfig } from "@/lib/testimonials";
import {
  DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  DEFAULT_DASHBOARD_SECTION_ORDER,
  fetchSiteSettingsRow,
  type DashboardSectionId,
} from "@/lib/siteSettingsRemote";

export { DEFAULT_SITE_COLORS, type SiteColors };
export {
  DEFAULT_DASHBOARD_SECTION_ORDER,
  DEFAULT_DASHBOARD_SECTIONS_CONFIG,
  type DashboardSectionConfig,
  type DashboardSectionId,
  type ProductCategoryConfig,
  type TestimonialConfig,
};

export { DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT };

export type SiteSettings = {
  logo_url: string | null;
  favicon_url: string | null;
  /** Legado: fallback se login/app específicos estiverem vazios */
  page_background_image_url: string | null;
  page_background_login_url: string | null;
  page_background_app_url: string | null;
  /** 0–100: visibilidade da textura de fundo */
  page_background_opacity_percent: number;
  /** @deprecated use hero_banner_urls; mantido para compat. */
  hero_image_url: string | null;
  hero_banner_urls: string[];
  /** Vazio no CMS = no app usa hero_banner_urls no desktop */
  hero_banner_desktop_urls: string[];
  colors: SiteColors;
  whatsapp_url: string | null;
  dashboard_section_order: DashboardSectionId[];
  dashboard_sections_config: DashboardSectionConfig[];
  product_categories_config: ProductCategoryConfig[];
  testimonials_config: TestimonialConfig[];
  testimonials_banner_url: string | null;
  page_background_dashboard_url: string | null;
  page_background_profile_url: string | null;
  page_background_community_url: string | null;
  page_background_planejamento_url: string | null;
};

const defaultSettings: SiteSettings = {
  logo_url: null,
  favicon_url: null,
  page_background_image_url: null,
  page_background_login_url: null,
  page_background_app_url: null,
  page_background_opacity_percent: DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  hero_image_url: null,
  hero_banner_urls: [],
  hero_banner_desktop_urls: [],
  colors: { ...DEFAULT_SITE_COLORS },
  whatsapp_url: null,
  dashboard_section_order: [...DEFAULT_DASHBOARD_SECTION_ORDER],
  dashboard_sections_config: [...DEFAULT_DASHBOARD_SECTIONS_CONFIG],
  product_categories_config: [],
  testimonials_config: [],
  testimonials_banner_url: null,
  page_background_dashboard_url: null,
  page_background_profile_url: null,
  page_background_community_url: null,
  page_background_planejamento_url: null,
};

function mergeSiteSettings(partial: Record<string, unknown>): SiteSettings {
  const colors = partial.colors;
  const parsedColors =
    colors && typeof colors === "object" && !Array.isArray(colors)
      ? { ...DEFAULT_SITE_COLORS, ...(colors as Partial<SiteColors>) }
      : { ...DEFAULT_SITE_COLORS };

  return {
    ...defaultSettings,
    logo_url: typeof partial.logo_url === "string" ? partial.logo_url : defaultSettings.logo_url,
    favicon_url:
      typeof partial.favicon_url === "string" ? partial.favicon_url : defaultSettings.favicon_url,
    page_background_image_url:
      typeof partial.page_background_image_url === "string"
        ? partial.page_background_image_url
        : defaultSettings.page_background_image_url,
    page_background_login_url:
      typeof partial.page_background_login_url === "string"
        ? partial.page_background_login_url
        : defaultSettings.page_background_login_url,
    page_background_app_url:
      typeof partial.page_background_app_url === "string"
        ? partial.page_background_app_url
        : defaultSettings.page_background_app_url,
    page_background_opacity_percent:
      typeof partial.page_background_opacity_percent === "number"
        ? partial.page_background_opacity_percent
        : defaultSettings.page_background_opacity_percent,
    hero_image_url:
      typeof partial.hero_image_url === "string" ? partial.hero_image_url : defaultSettings.hero_image_url,
    hero_banner_urls: Array.isArray(partial.hero_banner_urls)
      ? partial.hero_banner_urls.filter((u): u is string => typeof u === "string")
      : defaultSettings.hero_banner_urls,
    hero_banner_desktop_urls: Array.isArray(partial.hero_banner_desktop_urls)
      ? partial.hero_banner_desktop_urls.filter((u): u is string => typeof u === "string")
      : defaultSettings.hero_banner_desktop_urls,
    whatsapp_url:
      typeof partial.whatsapp_url === "string" ? partial.whatsapp_url : defaultSettings.whatsapp_url,
    dashboard_section_order: parseDashboardSectionOrder(partial.dashboard_section_order),
    dashboard_sections_config: parseDashboardSectionsConfig(
      partial.dashboard_sections_config,
      parseDashboardSectionOrder(partial.dashboard_section_order)
    ),
    product_categories_config: parseProductCategoriesConfig(partial.product_categories_config),
    testimonials_config: parseTestimonialsConfig(partial.testimonials_config),
    testimonials_banner_url:
      typeof partial.testimonials_banner_url === "string"
        ? partial.testimonials_banner_url
        : defaultSettings.testimonials_banner_url,
    page_background_dashboard_url:
      typeof partial.page_background_dashboard_url === "string"
        ? partial.page_background_dashboard_url
        : defaultSettings.page_background_dashboard_url,
    page_background_profile_url:
      typeof partial.page_background_profile_url === "string"
        ? partial.page_background_profile_url
        : defaultSettings.page_background_profile_url,
    page_background_community_url:
      typeof partial.page_background_community_url === "string"
        ? partial.page_background_community_url
        : defaultSettings.page_background_community_url,
    page_background_planejamento_url:
      typeof partial.page_background_planejamento_url === "string"
        ? partial.page_background_planejamento_url
        : defaultSettings.page_background_planejamento_url,
    colors: parsedColors,
  };
}

function loadInitialSettings(): SiteSettings {
  const cached = readSiteSettingsCache();
  return cached ? mergeSiteSettings(cached) : defaultSettings;
}

const initialSettings = loadInitialSettings();
if (typeof document !== "undefined") {
  applySiteColorsToDocument(initialSettings.colors);
}

/** Banners do carrossel no mobile (< md). */
export function resolveHeroBannerMobileUrls(settings: SiteSettings): string[] {
  const mobile = settings.hero_banner_urls ?? [];
  if (mobile.length > 0) return mobile;
  return settings.hero_banner_desktop_urls ?? [];
}

/** Banners do carrossel no desktop (md+); arte própria ou fallback mobile. */
export function resolveHeroBannerDesktopUrls(settings: SiteSettings): string[] {
  const desktop = settings.hero_banner_desktop_urls ?? [];
  if (desktop.length > 0) return desktop;
  return settings.hero_banner_urls ?? [];
}

/** Opacidade da textura (0–100), com fallback ao padrão. */
export function resolvePageBackgroundOpacityPercent(settings: SiteSettings): number {
  const n = settings.page_background_opacity_percent;
  if (n == null || !Number.isFinite(n)) {
    return DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT;
  }
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** URL da textura na página de login (prioriza campo próprio, senão legado). */
export function resolveLoginPageBackground(settings: SiteSettings): string | null {
  return (
    settings.page_background_login_url?.trim() ||
    settings.page_background_image_url?.trim() ||
    null
  );
}

/** URL da textura no dashboard, chat/comunidade e página de produto. */
export function resolveAppPageBackground(settings: SiteSettings): string | null {
  return (
    settings.page_background_app_url?.trim() ||
    settings.page_background_image_url?.trim() ||
    null
  );
}

/** Fundo próprio da Início; sem um definido, usa o fundo padrão do app. */
export function resolveDashboardBackground(settings: SiteSettings): string | null {
  return settings.page_background_dashboard_url?.trim() || resolveAppPageBackground(settings);
}

/** Fundo próprio do Perfil; sem um definido, usa o fundo padrão do app. */
export function resolveProfileBackground(settings: SiteSettings): string | null {
  return settings.page_background_profile_url?.trim() || resolveAppPageBackground(settings);
}

/** Fundo próprio do Chat; sem um definido, usa o fundo padrão do app. */
export function resolveCommunityBackground(settings: SiteSettings): string | null {
  return settings.page_background_community_url?.trim() || resolveAppPageBackground(settings);
}

/** Fundo próprio do Planejamento; sem um definido, usa o fundo padrão do app. */
export function resolvePlanejamentoBackground(settings: SiteSettings): string | null {
  return settings.page_background_planejamento_url?.trim() || resolveAppPageBackground(settings);
}

const SiteSettingsContext = createContext<{
  settings: SiteSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}>({
  settings: defaultSettings,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const row = await fetchSiteSettingsRow();
    if (row) {
      const next: SiteSettings = {
        logo_url: row.logo_url,
        favicon_url: row.favicon_url,
        page_background_image_url: row.page_background_image_url,
        page_background_login_url: row.page_background_login_url,
        page_background_app_url: row.page_background_app_url,
        page_background_opacity_percent: row.page_background_opacity_percent,
        hero_image_url: row.hero_image_url,
        hero_banner_urls: row.hero_banner_urls,
        hero_banner_desktop_urls: row.hero_banner_desktop_urls,
        colors: row.colors,
        whatsapp_url: row.whatsapp_url,
        dashboard_section_order: row.dashboard_section_order,
        dashboard_sections_config: row.dashboard_sections_config,
        product_categories_config: row.product_categories_config,
        testimonials_config: row.testimonials_config,
        testimonials_banner_url: row.testimonials_banner_url,
        page_background_dashboard_url: row.page_background_dashboard_url,
        page_background_profile_url: row.page_background_profile_url,
        page_background_community_url: row.page_background_community_url,
        page_background_planejamento_url: row.page_background_planejamento_url,
      };
      setSettings(next);
      writeSiteSettingsCache(next as unknown as Record<string, unknown>);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    applySiteColorsToDocument(settings.colors);
    document.body.style.backgroundColor = settings.colors.pageBg;
  }, [settings.colors]);

  useEffect(() => {
    applyFaviconToDocument(settings.favicon_url);
  }, [settings.favicon_url]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading, refresh]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
