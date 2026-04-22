const KEY = "bc_notif_last_viewed_at";

export function getLastNotificationViewedAt(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setLastNotificationViewedAt(iso: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, iso);
}

export function hasNewerThanViewed(latestNotificationIso: string | null | undefined): boolean {
  if (!latestNotificationIso) return false;
  const last = getLastNotificationViewedAt();
  if (!last) return true;
  return new Date(latestNotificationIso).getTime() > new Date(last).getTime();
}
