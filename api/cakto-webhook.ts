import { createClient } from "@supabase/supabase-js";
import { ensureAuthUserByEmail } from "./grant-purchase-core.js";

function getWebhookToken(req: any): string | undefined {
  const headerToken =
    req.headers?.["x-cakto-token"] ||
    req.headers?.["x-api-key"] ||
    req.headers?.authorization?.replace(/^Bearer\s+/i, "");

  const bodyToken = req.body?.token || req.body?.api_key;
  const queryToken = req.query?.token || req.query?.api_key;

  return headerToken || bodyToken || queryToken;
}

export function normalizePurchaseStatus(rawStatus: unknown): "active" | "refunded" {
  const status = String(rawStatus || "").trim().toLowerCase();
  if (!status) return "active";

  const refundedTerms = [
    "refund",
    "refunded",
    "reembolso",
    "reembolsado",
    "estorno",
    "estornado",
    "chargeback",
    "cancel",
    "cancelado",
    "cancelled",
    "canceled",
  ];

  return refundedTerms.some((term) => status.includes(term)) ? "refunded" : "active";
}

export function extractWebhookPurchase(body: Record<string, any>): {
  email: string | null;
  rawProductId: string | number | null;
  rawStatus: unknown;
} {
  const email = body.customer?.email || body.customer_email || body.email || null;
  const rawProductId =
    body.product?.id ?? body.product_id ?? body.offer?.id ?? body.plan?.id ?? body.item_id ?? null;
  const rawStatus = body.status || body.event || body.type || body.action;
  return { email, rawProductId, rawStatus };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const expectedToken = process.env.CAKTO_WEBHOOK_TOKEN;
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!expectedToken) {
      return res.status(500).json({ error: "Webhook token not configured" });
    }

    const receivedToken = getWebhookToken(req);
    if (!receivedToken || receivedToken !== expectedToken) {
      return res.status(401).json({ error: "Invalid webhook token" });
    }

    const body = (req.body || {}) as Record<string, any>;
    const { email, rawProductId, rawStatus } = extractWebhookPurchase(body);

    if (!email || rawProductId == null || rawProductId === "") {
      return res.status(400).json({ error: "Missing data" });
    }

    const pid = String(rawProductId);

    const { data: matchRows, error: matchError } = await supabase
      .from("products")
      .select("id")
      .or(`id.eq.${pid},cakto_sales_id.eq.${pid},external_sales_id.eq.${pid}`)
      .limit(1);

    if (matchError) {
      console.error("cakto-webhook product resolve:", matchError);
    }

    const productId = matchRows?.[0]?.id ?? pid;

    const { userId } = await ensureAuthUserByEmail(supabase, email);

    const { error } = await supabase.from("purchases").upsert({
      user_id: userId,
      product_id: productId,
      status: normalizePurchaseStatus(rawStatus),
      source: "webhook",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.log(error);
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
}
