import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { useAppAccessState } from "@/contexts/AppAccessContext";

type GuestOnlyProps = {
  children: ReactNode;
};

/** Rotas públicas (login): redireciona para o dashboard se já houver sessão. */
export default function GuestOnly({ children }: GuestOnlyProps) {
  const [, setLocation] = useLocation();
  const { authSession } = useAppAccessState();

  useEffect(() => {
    if (authSession === true) {
      setLocation("/dashboard");
    }
  }, [authSession, setLocation]);

  if (authSession === null || authSession === true) {
    return <PageLoading label="Carregando..." className="min-h-screen" />;
  }

  return <>{children}</>;
}
