import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { LOGIN_PATH } from "@/lib/authGuard";

type RequireAppAccessProps = {
  children: ReactNode;
};

/** Dashboard, perfil e comunidade: sessão autenticada ou modo convidado. */
export default function RequireAppAccess({ children }: RequireAppAccessProps) {
  const [, setLocation] = useLocation();
  const { appAccess } = useAppAccessState();

  useEffect(() => {
    if (appAccess === false) {
      setLocation(LOGIN_PATH);
    }
  }, [appAccess, setLocation]);

  if (appAccess === null) {
    return <PageLoading label="Verificando acesso..." className="min-h-screen" />;
  }

  if (!appAccess) {
    return null;
  }

  return <>{children}</>;
}
