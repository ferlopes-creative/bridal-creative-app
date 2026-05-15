import { supabase } from "@/lib/supabase";

export type EmailLoginResult = {
  isNewUser: boolean;
};

type AuthEmailLoginResponse = {
  isNewUser: boolean;
  session: {
    access_token: string;
    refresh_token: string;
  };
  error?: string;
};

export async function loginOrRegisterWithEmail(email: string): Promise<EmailLoginResult> {
  const normalized = email.trim().toLowerCase();

  const response = await fetch("/api/auth-email-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalized }),
  });

  const payload = (await response.json().catch(() => ({}))) as AuthEmailLoginResponse;

  if (!response.ok) {
    const detail =
      typeof payload.error === "string"
        ? payload.error
        : response.status === 404
          ? "Serviço de login indisponível. Verifique o deploy da API ou tente novamente."
          : "Não foi possível entrar com este e-mail.";
    throw new Error(detail);
  }

  if (!payload.session?.access_token || !payload.session?.refresh_token) {
    throw new Error("Resposta de autenticação inválida.");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: payload.session.access_token,
    refresh_token: payload.session.refresh_token,
  });

  if (sessionError) throw sessionError;

  return { isNewUser: Boolean(payload.isNewUser) };
}
