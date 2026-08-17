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

const READ_IDS_KEY = "bc_notif_read_ids";

/** IDs de notificações já marcadas como lidas (só neste aparelho — não há tabela de leitura por usuário). */
export function getReadNotificationIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

export function markNotificationRead(id: string) {
  if (typeof localStorage === "undefined") return;
  const ids = getReadNotificationIds();
  ids.add(id);
  localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(ids)));
}
