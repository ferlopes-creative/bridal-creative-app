import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const AUTH_CHECK_TIMEOUT_MS = 8_000;
const SESSION_FRESHNESS_BUFFER_MS = 30_000;

let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let authInitStarted = false;

export async function clearLocalAuthSession(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore — storage may already be cleared
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("auth_timeout")), ms);
    }),
  ]);
}

export function isSessionFresh(session: Session, now = Date.now()): boolean {
  if (!session.expires_at) return true;
  return session.expires_at * 1000 > now + SESSION_FRESHNESS_BUFFER_MS;
}

/** Valida sessão local; limpa storage se expirada/inválida ou se o Supabase estiver inacessível. */
export async function resolveAuthenticatedSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), AUTH_CHECK_TIMEOUT_MS);
    if (error || !data.session) {
      if (error) await clearLocalAuthSession();
      return null;
    }

    if (isSessionFresh(data.session)) {
      return data.session;
    }

    const { data: userData, error: userError } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_CHECK_TIMEOUT_MS
    );
    if (userError || !userData.user) {
      await clearLocalAuthSession();
      return null;
    }

    const { data: refreshed } = await supabase.auth.getSession();
    return refreshed.session ?? data.session;
  } catch {
    await clearLocalAuthSession();
    return null;
  }
}

function scheduleSessionRefresh(session: Session): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!session.expires_at) return;

  const refreshIn = session.expires_at * 1000 - Date.now() - 60_000;
  if (refreshIn <= 0) {
    void supabase.auth.refreshSession().catch(() => clearLocalAuthSession());
    return;
  }

  refreshTimer = setTimeout(() => {
    void supabase.auth.refreshSession().catch(() => clearLocalAuthSession());
  }, refreshIn);
}

/**
 * Limpa sessões inválidas no boot e agenda refresh manual (autoRefreshToken fica desligado
 * para evitar loop de retry quando o Supabase está inacessível).
 */
export function initSupabaseAuth(): void {
  if (!isSupabaseConfigured || typeof window === "undefined" || authInitStarted) return;
  authInitStarted = true;

  void resolveAuthenticatedSession().then((session) => {
    if (session) scheduleSessionRefresh(session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      scheduleSessionRefresh(session);
      return;
    }
    if (refreshTimer) clearTimeout(refreshTimer);
  });
}
