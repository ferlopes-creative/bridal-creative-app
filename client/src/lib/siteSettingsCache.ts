const CACHE_KEY = "bridal_site_settings_v1";

export function readSiteSettingsCache(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function writeSiteSettingsCache(settings: Record<string, unknown>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // quota / private mode
  }
}
