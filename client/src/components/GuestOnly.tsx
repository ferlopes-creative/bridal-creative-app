import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { hasAuthenticatedSession } from "@/lib/authGuard";

type GuestOnlyProps = {
  children: ReactNode;
};

/** Rotas públicas (login): redireciona para o dashboard se já houver sessão. */
export default function GuestOnly({ children }: GuestOnlyProps) {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void hasAuthenticatedSession().then((loggedIn) => {
      if (cancelled) return;
      if (loggedIn) {
        setLocation("/dashboard");
        return;
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  if (!ready) {
    return <PageLoading label="Carregando..." className="min-h-screen" />;
  }

  return <>{children}</>;
}
