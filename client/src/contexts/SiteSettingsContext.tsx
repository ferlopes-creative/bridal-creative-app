import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSiteSettingsRow } from "@/lib/siteSettingsRemote";

export const DEFAULT_FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export type SiteSettings = {
  logo_url: string | null;
  /** Legado: fallback se login/app específicos estiverem vazios */
  page_background_image_url: string | null;
  page_background_login_url: string | null;
  page_background_app_url: string | null;
  /** @deprecated use hero_banner_urls; mantido para compat. */
  hero_image_url: string | null;
  hero_banner_urls: string[];
};

const defaultSettings: SiteSettings = {
  logo_url: null,
  page_background_image_url: null,
  page_background_login_url: null,
  page_background_app_url: null,
  hero_image_url: null,
  hero_banner_urls: [],
};

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
        hero_image_url: row.hero_image_url,
        hero_banner_urls: row.hero_banner_urls,
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
