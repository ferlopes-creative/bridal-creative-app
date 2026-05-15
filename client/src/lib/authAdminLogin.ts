import { supabase } from "@/lib/supabase";

type AdminLoginResponse = {
  session?: {
    access_token: string;
    refresh_token: string;
  };
  error?: string;
};

export async function loginAdminWithPassword(email: string, password: string): Promise<void> {
  const response = await fetch("/api/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  const payload = (await response.json().catch(() => ({}))) as AdminLoginResponse;

  if (!response.ok) {
    const detail =
      typeof payload.error === "string"
        ? payload.error
        : response.status === 404
          ? "Serviço de login indisponível. Verifique o deploy da API ou tente novamente."
          : "Não foi possível entrar.";
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
}
