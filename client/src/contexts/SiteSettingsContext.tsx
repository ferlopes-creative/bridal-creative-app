import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  fetchSiteSettingsRow,
} from "@/lib/siteSettingsRemote";

export { DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT };

export const DEFAULT_FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export type SiteSettings = {
  logo_url: string | null;
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
};

const defaultSettings: SiteSettings = {
  logo_url: null,
  page_background_image_url: null,
  page_background_login_url: null,
  page_background_app_url: null,
  page_background_opacity_percent: DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  hero_image_url: null,
  hero_banner_urls: [],
  hero_banner_desktop_urls: [],
};

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
export function resolveLoginPageBackground(settings: SiteSettings): string {
  const u =
    settings.page_background_login_url?.trim() || settings.page_background_image_url?.trim();
  return u || DEFAULT_FLORAL_BG;
}

/** URL da textura no dashboard, chat/comunidade e página de produto. */
export function resolveAppPageBackground(settings: SiteSettings): string {
  const u = settings.page_background_app_url?.trim() || settings.page_background_image_url?.trim();
  return u || DEFAULT_FLORAL_BG;
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
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const row = await fetchSiteSettingsRow();
    if (row) {
      setSettings({
        logo_url: row.logo_url,
        page_background_image_url: row.page_background_image_url,
        page_background_login_url: row.page_background_login_url,
        page_background_app_url: row.page_background_app_url,
        page_background_opacity_percent: row.page_background_opacity_percent,
        hero_image_url: row.hero_image_url,
        hero_banner_urls: row.hero_banner_urls,
        hero_banner_desktop_urls: row.hero_banner_desktop_urls,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading, refresh]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
