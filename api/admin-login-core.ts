import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  findUserByEmail,
  isValidEmailAddress,
  normalizeEmail,
} from "./auth-email-login-core.js";

export { createServiceRoleClient };

export async function verifyLoginAdminCredentials(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_login_admin", {
    p_email: email,
    p_password: password,
  });
  if (error) throw error;
  return Boolean(data);
}

async function ensureAuthUserPassword(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
}

export async function authenticateAdmin(
  supabase: SupabaseClient,
  rawEmail: string,
  rawPassword: string
): Promise<Session> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmailAddress(email)) {
    throw new Error("E-mail inválido.");
  }
  if (!rawPassword) {
    throw new Error("Senha obrigatória.");
  }

  const valid = await verifyLoginAdminCredentials(supabase, email, rawPassword);
  if (!valid) {
    throw new Error("E-mail ou senha incorretos.");
  }

  await ensureAuthUserPassword(supabase, email, rawPassword);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: rawPassword,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error("Sessão não retornada após login.");
  }

  return data.session;
}
