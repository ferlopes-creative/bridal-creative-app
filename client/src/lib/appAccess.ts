import { hasAuthenticatedSession } from "@/lib/authGuard";
import { isGuestMode, setGuestMode } from "@/lib/guestMode";

/**
 * Libera o app pra qualquer pessoa, mesmo sem login/cadastro e sem ter comprado nada:
 * quem não tem sessão autenticada e ainda não está em modo convidado entra automaticamente
 * como convidada (sem precisar clicar em "Convidado — entrar sem login" no /login).
 * O conteúdo comprado continua bloqueado normalmente pra quem não comprou — isso aqui só
 * remove a parede de login pra navegar pelo app.
 */
export async function hasAppAccess(): Promise<boolean> {
  if (isGuestMode()) return true;
  const authenticated = await hasAuthenticatedSession();
  if (authenticated) return true;
  setGuestMode(true);
  return true;
}
