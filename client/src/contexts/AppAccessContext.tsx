import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasAppAccess } from "@/lib/appAccess";
import { hasAuthenticatedSession } from "@/lib/authGuard";
import { clearGuestMode } from "@/lib/guestMode";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AppAccessState = {
  /** null enquanto a sessão ainda não foi verificada nesta aba. */
  appAccess: boolean | null;
  authSession: boolean | null;
};

const AppAccessContext = createContext<AppAccessState>({ appAccess: null, authSession: null });

/**
 * Verifica a sessão uma única vez por carregamento da aba (não a cada troca de rota),
 * pra RequireAppAccess/RequireAuth não mostrarem "Verificando acesso..." de novo
 * a cada clique — só a primeira vez, ou quando a sessão realmente muda.
 */
export function AppAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppAccessState>({ appAccess: null, authSession: null });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const [appAccess, authSession] = await Promise.all([hasAppAccess(), hasAuthenticatedSession()]);
      if (cancelled) return;
      setState({ appAccess, authSession });
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
        setState({ appAccess, authSession: Boolean(session) });
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
