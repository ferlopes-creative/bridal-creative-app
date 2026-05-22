import {
  assertCallerIsLoginAdmin,
  createServiceRoleClient,
  GrantPurchaseError,
  grantPurchaseBatch,
  type GrantPurchaseInput,
  type PurchaseSource,
  parseAuthorizationBearer,
} from "./grant-purchase-core.js";

export type AdminGrantPurchaseResult =
  | {
      status: 200;
      body: {
        source: PurchaseSource;
        granted: number;
        alreadyActive: number;
        createdUsers: number;
        errors: { index: number; email: string; productId: string; message: string }[];
        results: {
          email: string;
          productId: string;
          status: "granted" | "already_active";
          createdUser: boolean;
        }[];
      };
    }
  | { status: 400 | 401 | 500; body: { error: string } };

function normalizeGrants(raw: unknown): GrantPurchaseInput[] {
  if (!raw || typeof raw !== "object") return [];

  const body = raw as Record<string, unknown>;

  if (Array.isArray(body.grants)) {
    const out: GrantPurchaseInput[] = [];
    for (const item of body.grants) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const email = typeof row.email === "string" ? row.email : "";
      const productId =
        typeof row.productId === "string"
          ? row.productId
          : typeof row.product_id === "string"
            ? row.product_id
            : "";
      if (email.trim() && productId.trim()) {
        out.push({ email: email.trim(), productId: productId.trim() });
      }
    }
    return out;
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const productIds: string[] = [];

  if (Array.isArray(body.productIds)) {
    for (const id of body.productIds) {
      if (typeof id === "string" && id.trim()) productIds.push(id.trim());
    }
  }
  if (typeof body.productId === "string" && body.productId.trim()) {
    productIds.push(body.productId.trim());
  }

  if (!email || productIds.length === 0) return [];

  return productIds.map((productId) => ({ email, productId }));
}

function resolveSource(raw: unknown): PurchaseSource {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "admin") return "admin";
  return "legacy";
}

export async function processAdminGrantPurchase(
  rawBody: Record<string, unknown>,
  authorizationHeader: string | undefined
): Promise<AdminGrantPurchaseResult> {
  try {
    const token = parseAuthorizationBearer(authorizationHeader);
    if (!token) {
      return { status: 401, body: { error: "Faça login no painel admin novamente." } };
    }

    const supabase = createServiceRoleClient();
    await assertCallerIsLoginAdmin(supabase, token);

    const grants = normalizeGrants(rawBody);
    if (grants.length === 0) {
      return {
        status: 400,
        body: { error: "Informe e-mail e pelo menos um produto (productId ou productIds)." },
      };
    }

    if (grants.length > 500) {
      return { status: 400, body: { error: "Máximo de 500 linhas por envio." } };
    }

    const source = resolveSource(rawBody.source);
    const { results, errors } = await grantPurchaseBatch(supabase, grants, source);

    const granted = results.filter((r) => r.status === "granted").length;
    const alreadyActive = results.filter((r) => r.status === "already_active").length;
    const createdUsers = results.filter((r) => r.createdUser).length;

    return {
      status: 200,
      body: {
        source,
        granted,
        alreadyActive,
        createdUsers,
        errors,
        results: results.map((r) => ({
          email: r.email,
          productId: r.productId,
          status: r.status,
          createdUser: r.createdUser,
        })),
      },
    };
  } catch (err) {
    if (err instanceof GrantPurchaseError) {
      return { status: err.statusCode, body: { error: err.message } };
    }
    console.error("admin-grant-purchase:", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return { status: 500, body: { error: message } };
  }
}
