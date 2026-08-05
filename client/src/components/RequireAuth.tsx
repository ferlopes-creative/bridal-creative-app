import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { PageLoading } from "@/components/PageLoading";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { LOGIN_PATH } from "@/lib/authGuard";

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const [, setLocation] = useLocation();
  const { authSession } = useAppAccessState();

  useEffect(() => {
    if (authSession === false) {
      setLocation(LOGIN_PATH);
    }
  }, [authSession, setLocation]);

  if (authSession === null) {
    return <PageLoading label="Verificando acesso..." className="min-h-screen" />;
  }

  if (!authSession) {
    return null;
  }

  return <>{children}</>;
}
