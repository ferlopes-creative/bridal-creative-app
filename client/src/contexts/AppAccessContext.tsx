import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasAppAccess } from "@/lib/appAccess";
import { resolveAuthenticatedSession } from "@/lib/authSession";
import { clearGuestMode } from "@/lib/guestMode";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AppAccessState = {
  /** null enquanto a sessão ainda não foi verificada nesta aba. */
  appAccess: boolean | null;
  authSession: boolean | null;
  /** Sessão resolvida (com o user embutido); evita cada página fazer seu próprio getUser(). */
  session: Session | null;
};

const AppAccessContext = createContext<AppAccessState>({
  appAccess: null,
  authSession: null,
  session: null,
});

/**
 * Verifica a sessão uma única vez por carregamento da aba (não a cada troca de rota),
 * pra RequireAppAccess/RequireAuth não mostrarem "Verificando acesso..." de novo
 * a cada clique — só a primeira vez, ou quando a sessão realmente muda.
 */
export function AppAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppAccessState>({ appAccess: null, authSession: null, session: null });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const [appAccess, session] = await Promise.all([hasAppAccess(), resolveAuthenticatedSession()]);
      if (cancelled) return;
      setState({ appAccess, authSession: Boolean(session), session });
    };

    void verify();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void hasAppAccess().then((appAccess) => {
        if (cancelled) return;
        if (!appAccess && !session) clearGuestMode();
        setState({ appAccess, authSession: Boolean(session), session: session ?? null });
      });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AppAccessContext.Provider value={state}>{children}</AppAccessContext.Provider>;
}

export function useAppAccessState(): AppAccessState {
  return useContext(AppAccessContext);
}
