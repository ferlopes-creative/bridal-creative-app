import { randomUUID } from "node:crypto";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Valida formato básico de e-mail. */
export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function findUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ id: string; email?: string } | null> {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function sessionFromMagicLink(supabase: SupabaseClient, email: string): Promise<Session> {
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError) throw linkError;

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Não foi possível gerar o token de acesso.");
  }

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (verifyError) throw verifyError;
  if (!verifyData.session) {
    throw new Error("Sessão não retornada após verificação.");
  }

  return verifyData.session;
}

export type AuthenticateEmailResult = {
  session: Session;
  isNewUser: boolean;
};

export async function authenticateEmail(
  supabase: SupabaseClient,
  rawEmail: string
): Promise<AuthenticateEmailResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmailAddress(email)) {
    throw new Error("E-mail inválido.");
  }

  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const session = await sessionFromMagicLink(supabase, email);
    return { session, isNewUser: false };
  }

  const tempPassword = `${randomUUID().replace(/-/g, "")}A!9`;
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: tempPassword,
  });

  if (createError) throw createError;

  const session = await sessionFromMagicLink(supabase, email);
  return { session, isNewUser: true };
}

function jwtPayloadRole(key: string): string | null {
  if (!key.startsWith("eyJ")) return null;
  try {
    const segment = key.split(".")[1];
    if (!segment) return null;
    const json = Buffer.from(segment, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/** Diagnóstico para /api/health (não expõe o valor da chave). */
export function describeServiceRoleKey(): { configured: boolean; valid: boolean; kind: string } {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    return { configured: false, valid: false, kind: "missing" };
  }
  if (serviceKey.startsWith("sb_publishable_")) {
    return { configured: true, valid: false, kind: "publishable" };
  }
  if (serviceKey.startsWith("sb_secret_")) {
    return { configured: true, valid: true, kind: "secret" };
  }
  const role = jwtPayloadRole(serviceKey);
  if (role === "service_role") {
    return { configured: true, valid: true, kind: "jwt_service_role" };
  }
  if (role === "anon") {
    return { configured: true, valid: false, kind: "jwt_anon" };
  }
  if (role) {
    return { configured: true, valid: false, kind: `jwt_${role}` };
  }
  return { configured: true, valid: true, kind: "jwt" };
}

function assertServiceRoleKey(serviceKey: string): void {
  const trimmed = serviceKey.trim();

  if (trimmed.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY está com a chave publishable. No Supabase → Settings → API Keys, use Secret keys (sb_secret_...) ou Legacy → service_role. Se o site está na Vercel, corrija também em Project → Settings → Environment Variables (não só no .env da VPS)."
    );
  }

  if (trimmed.startsWith("sb_secret_")) {
    return;
  }

  const role = jwtPayloadRole(trimmed);
  if (role === "anon") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY está com a chave anon (JWT). No Supabase → API Keys → Legacy, copie a chave service_role (não a anon)."
    );
  }
  if (role && role !== "service_role") {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY inválida (role: ${role}). Use a chave service_role.`);
  }
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase não configurado no servidor. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env."
    );
  }

  assertServiceRoleKey(serviceKey);

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
