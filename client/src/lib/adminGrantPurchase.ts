import { supabase } from "@/lib/supabase";
import type { LegacyPurchaseLine } from "@/lib/legacyPurchaseImport";

export type AdminGrantPurchaseResponse = {
  source: string;
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

export async function grantLegacyPurchases(
  lines: LegacyPurchaseLine[],
  source: "legacy" | "admin" = "legacy"
): Promise<AdminGrantPurchaseResponse> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Faça login no painel admin novamente.");
  }

  const response = await fetch("/api/admin-grant-purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      source,
      grants: lines.map((line) => ({
        email: line.email,
        productId: line.productId,
      })),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as AdminGrantPurchaseResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível liberar o acesso.");
  }

  return payload;
}

export async function grantSingleLegacyPurchase(
  email: string,
  productIds: string[],
  source: "legacy" | "admin" = "admin"
): Promise<AdminGrantPurchaseResponse> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Faça login no painel admin novamente.");
  }

  const response = await fetch("/api/admin-grant-purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({ email, productIds, source }),
  });

  const payload = (await response.json().catch(() => ({}))) as AdminGrantPurchaseResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível liberar o acesso.");
  }

  return payload;
}
