import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export const DEFAULT_FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export type SiteSettings = {
  logo_url: string | null;
  page_background_image_url: string | null;
  hero_image_url: string | null;
  hero_headline: string | null;
};

const defaultSettings: SiteSettings = {
  logo_url: null,
  page_background_image_url: null,
  hero_image_url: null,
  hero_headline: null,
};

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
    const { data, error } = await supabase
      .from("site_settings")
      .select("logo_url, page_background_image_url, hero_image_url, hero_headline")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("site_settings:", error.message);
    } else if (data) {
      setSettings({
        logo_url: data.logo_url ?? null,
        page_background_image_url: data.page_background_image_url ?? null,
        hero_image_url: data.hero_image_url ?? null,
        hero_headline: data.hero_headline ?? null,
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
