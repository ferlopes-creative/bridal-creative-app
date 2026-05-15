import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { hasAuthenticatedSession, LOGIN_PATH } from "@/lib/authGuard";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const [, setLocation] = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const ok = await hasAuthenticatedSession();
      if (cancelled) return;
      if (ok) {
        setAllowed(true);
        return;
      }
      setAllowed(false);
      setLocation(LOGIN_PATH);
    };

    void verify();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAllowed(false);
        setLocation(LOGIN_PATH);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setLocation]);

  if (allowed === null) {
    return <PageLoading label="Verificando acesso..." className="min-h-screen" />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
