import { authenticateAdmin, createServiceRoleClient } from "./admin-login-core";

export type AdminLoginResult =
  | {
      status: 200;
      body: {
        session: {
          access_token: string;
          refresh_token: string;
          expires_in?: number;
          expires_at?: number;
          token_type?: string;
          user: unknown;
        };
      };
    }
  | { status: 400 | 401 | 500; body: { error: string } };

export async function processAdminLogin(rawBody: Record<string, unknown>): Promise<AdminLoginResult> {
  try {
    const rawEmail = typeof rawBody.email === "string" ? rawBody.email : "";
    const rawPassword = typeof rawBody.password === "string" ? rawBody.password : "";

    if (!rawEmail.trim() || !rawPassword) {
      return { status: 400, body: { error: "Informe e-mail e senha." } };
    }

    const supabase = createServiceRoleClient();
    const session = await authenticateAdmin(supabase, rawEmail, rawPassword);

    return {
      status: 200,
      body: {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: session.user,
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    if (message === "E-mail ou senha incorretos.") {
      return { status: 401, body: { error: message } };
    }
    if (message === "E-mail inválido." || message === "Senha obrigatória.") {
      return { status: 400, body: { error: message } };
    }
    console.error("admin-login:", err);
    return { status: 500, body: { error: message } };
  }
}
