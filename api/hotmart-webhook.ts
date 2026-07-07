import { createClient } from "@supabase/supabase-js";
import { ensureAuthUserByEmail } from "./grant-purchase-core.js";
import { normalizePurchaseStatus } from "./cakto-webhook.js";

function getWebhookToken(req: any): string | undefined {
  const headers = req.headers || {};
  const headerToken =
    headers["x-hotmart-hottok"] ||
    headers["x-hotmart-webhook-token"] ||
    headers["hottok"] ||
    headers.authorization?.replace(/^Bearer\s+/i, "");

  const body = req.body || {};
  const bodyToken = body.hottok || body.token;
  const query = req.query || {};
  const queryToken = query.hottok || query.token;

  return headerToken || bodyToken || queryToken;
}

export type HotmartWebhookAction = "grant" | "revoke" | "ignore";

export function resolveHotmartAction(event: unknown, rawStatus: unknown): HotmartWebhookAction {
  const evt = String(event || "")
    .trim()
    .toUpperCase();
  const status = String(rawStatus || "")
    .trim()
    .toLowerCase();

  const revokeSignals = [
    "REFUND",
    "REEMBOLSO",
    "CANCEL",
    "CANCELADO",
    "CHARGEBACK",
    "PROTEST",
    "DISPUTE",
    "BLOCKED",
    "EXPIRED",
    "ESTORNO",
  ];
  if (revokeSignals.some((term) => evt.includes(term) || status.includes(term))) {
    return "revoke";
  }

  const grantEvents = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"];
  const grantStatuses = ["approved", "complete", "completed", "aprovado", "completo"];
  if (grantEvents.includes(evt) || grantStatuses.some((term) => status === term || status.includes(term))) {
    return "grant";
  }

  return "ignore";
}

export function extractHotmartPurchase(body: Record<string, any>): {
  email: string | null;
  rawProductId: string | number | null;
  rawStatus: unknown;
  event: unknown;
} {
  const data = body.data && typeof body.data === "object" ? body.data : {};

  const email =
    data.buyer?.email ||
    body.buyer?.email ||
    body.email ||
    body.customer_email ||
    body.customer?.email ||
    null;

  const rawProductId =
    data.product?.id ??
    body.product?.id ??
    body.prod ??
    data.purchase?.offer?.code ??
    body.off ??
    data.product?.ucode ??
    null;

  const event = body.event || body.type || body.action;
  const rawStatus = data.purchase?.status || body.purchase?.status || body.status || event;

  return { email, rawProductId, rawStatus, event };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const expectedToken = process.env.HOTMART_WEBHOOK_TOKEN;
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
    const { email, rawProductId, rawStatus, event } = extractHotmartPurchase(body);

    if (!email || rawProductId == null || rawProductId === "") {
      return res.status(400).json({ error: "Missing data" });
    }

    const action = resolveHotmartAction(event, rawStatus);
    if (action === "ignore") {
      return res.status(200).json({ success: true, skipped: true });
    }

    const pid = String(rawProductId);

    const { data: matchRows, error: matchError } = await supabase
      .from("products")
      .select("id")
      .or(`id.eq.${pid},external_sales_id.eq.${pid}`)
      .limit(1);

    if (matchError) {
      console.error("hotmart-webhook product resolve:", matchError);
    }

    const productId = matchRows?.[0]?.id ?? pid;

    const { userId } = await ensureAuthUserByEmail(supabase, email);

    const purchaseStatus =
      action === "revoke" ? "refunded" : normalizePurchaseStatus(rawStatus);

    const { error } = await supabase.from("purchases").upsert({
      user_id: userId,
      product_id: productId,
      status: purchaseStatus,
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
