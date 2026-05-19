import {
  authenticateEmail,
  createServiceRoleClient,
  isValidEmailAddress,
  normalizeEmail,
} from "./auth-email-login-core.js";

export type AuthEmailLoginResult =
  | {
      status: 200;
      body: {
        isNewUser: boolean;
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
  | { status: 400 | 500; body: { error: string } };

export async function processAuthEmailLogin(
  rawBody: Record<string, unknown>
): Promise<AuthEmailLoginResult> {
  try {
    const rawEmail = typeof rawBody.email === "string" ? rawBody.email : "";
    const email = normalizeEmail(rawEmail);

    if (!isValidEmailAddress(email)) {
      return { status: 400, body: { error: "E-mail inválido." } };
    }

    const supabase = createServiceRoleClient();
    const { session, isNewUser } = await authenticateEmail(supabase, email);

    return {
      status: 200,
      body: {
        isNewUser,
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
    console.error("auth-email-login:", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return { status: 500, body: { error: message } };
  }
}
