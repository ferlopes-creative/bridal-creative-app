import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  findUserByEmail,
  isValidEmailAddress,
  normalizeEmail,
} from "./auth-email-login-core.js";

export type PurchaseSource = "webhook" | "legacy" | "admin";

export type GrantPurchaseInput = {
  email: string;
  productId: string;
};

export type GrantPurchaseResult = {
  email: string;
  productId: string;
  userId: string;
  createdUser: boolean;
  status: "granted" | "already_active";
};

export class GrantPurchaseError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 401 | 404 | 500 = 400
  ) {
    super(message);
    this.name = "GrantPurchaseError";
  }
}

export async function assertCallerIsLoginAdmin(
  supabase: SupabaseClient,
  accessToken: string
): Promise<void> {
  const token = accessToken.trim();
  if (!token) {
    throw new GrantPurchaseError("Token de administrador ausente.", 401);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new GrantPurchaseError("Sessão de administrador inválida.", 401);
  }

  const email = normalizeEmail(data.user.email);
  const { data: row, error: lookupError } = await supabase
    .from("login_admin")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    throw new GrantPurchaseError(lookupError.message, 500);
  }
  if (!row) {
    throw new GrantPurchaseError("Conta sem permissão de administrador.", 401);
  }
}

export async function ensureAuthUserByEmail(
  supabase: SupabaseClient,
  rawEmail: string
): Promise<{ userId: string; createdUser: boolean }> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmailAddress(email)) {
    throw new GrantPurchaseError("E-mail inválido.");
  }

  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    return { userId: existing.id, createdUser: false };
  }

  const tempPassword = `${randomUUID().replace(/-/g, "")}A!9`;
  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: tempPassword,
  });

  if (createError) {
    throw new GrantPurchaseError(createError.message, 500);
  }

  const created = await findUserByEmail(supabase, email);
  if (!created) {
    throw new GrantPurchaseError("Usuário criado, mas não foi possível localizá-lo.", 500);
  }

  return { userId: created.id, createdUser: true };
}

async function resolveProductId(
  supabase: SupabaseClient,
  productId: string
): Promise<string> {
  const pid = productId.trim();
  if (!pid) {
    throw new GrantPurchaseError("Produto não informado.");
  }

  const { data: rows, error } = await supabase
    .from("products")
    .select("id")
    .or(`id.eq.${pid},external_sales_id.eq.${pid}`)
    .limit(1);

  if (error) {
    throw new GrantPurchaseError(error.message, 500);
  }

  const resolved = rows?.[0]?.id;
  if (!resolved) {
    throw new GrantPurchaseError(`Produto não encontrado: ${pid}`, 404);
  }

  return String(resolved);
}

export async function grantPurchaseAccess(
  supabase: SupabaseClient,
  input: GrantPurchaseInput,
  source: PurchaseSource
): Promise<GrantPurchaseResult> {
  const email = normalizeEmail(input.email);
  const { userId, createdUser } = await ensureAuthUserByEmail(supabase, email);
  const productId = await resolveProductId(supabase, input.productId);

  const { data: existing, error: existingError } = await supabase
    .from("purchases")
    .select("status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existingError) {
    throw new GrantPurchaseError(existingError.message, 500);
  }

  if (existing?.status === "active") {
    return {
      email,
      productId,
      userId,
      createdUser,
      status: "already_active",
    };
  }

  const { error } = await supabase.from("purchases").upsert(
    {
      user_id: userId,
      product_id: productId,
      status: "active",
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" }
  );

  if (error) {
    throw new GrantPurchaseError(error.message, 500);
  }

  return {
    email,
    productId,
    userId,
    createdUser,
    status: "granted",
  };
}

export async function grantPurchaseBatch(
  supabase: SupabaseClient,
  grants: GrantPurchaseInput[],
  source: PurchaseSource
): Promise<{
  results: GrantPurchaseResult[];
  errors: { index: number; email: string; productId: string; message: string }[];
}> {
  const results: GrantPurchaseResult[] = [];
  const errors: { index: number; email: string; productId: string; message: string }[] = [];

  for (let index = 0; index < grants.length; index++) {
    const grant = grants[index];
    try {
      const result = await grantPurchaseAccess(supabase, grant, source);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        index,
        email: grant.email,
        productId: grant.productId,
        message,
      });
    }
  }

  return { results, errors };
}

export function parseAuthorizationBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export { createServiceRoleClient };
