import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { ADMIN_LOGIN_PATH, hasAdminAccess } from "@/lib/adminAuthGuard";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type RequireAdminAuthProps = {
  children: ReactNode;
};

export default function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const [, setLocation] = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const ok = await hasAdminAccess();
      if (cancelled) return;
      if (ok) {
        setAllowed(true);
        return;
      }
      setAllowed(false);
      setLocation(ADMIN_LOGIN_PATH);
    };

    void verify();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void hasAdminAccess().then((ok) => {
        if (cancelled) return;
        if (!ok) {
          setAllowed(false);
          setLocation(ADMIN_LOGIN_PATH);
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
