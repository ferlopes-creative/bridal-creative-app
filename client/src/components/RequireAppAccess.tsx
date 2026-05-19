import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { hasAppAccess } from "@/lib/appAccess";
import { LOGIN_PATH } from "@/lib/authGuard";
import { clearGuestMode } from "@/lib/guestMode";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type RequireAppAccessProps = {
  children: ReactNode;
};

/** Dashboard, perfil e comunidade: sessão autenticada ou modo convidado. */
export default function RequireAppAccess({ children }: RequireAppAccessProps) {
  const [, setLocation] = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const ok = await hasAppAccess();
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
      void hasAppAccess().then((ok) => {
        if (cancelled) return;
        if (!ok && !session) {
          clearGuestMode();
          setAllowed(false);
          setLocation(LOGIN_PATH);
        } else if (ok) {
          setAllowed(true);
        }
      });
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
