import { describe, expect, it } from "vitest";
import { extractWebhookPurchase, getWebhookToken, normalizePurchaseStatus } from "./cakto-webhook";

describe("normalizePurchaseStatus", () => {
  it("marks refund-like events as refunded", () => {
    expect(normalizePurchaseStatus("purchase.refunded")).toBe("refunded");
    expect(normalizePurchaseStatus("REEMBOLSADO")).toBe("refunded");
    expect(normalizePurchaseStatus("chargeback_opened")).toBe("refunded");
  });

  it("marks declined/expired payments as refunded (never grants access)", () => {
    expect(normalizePurchaseStatus("purchase_refused")).toBe("refunded");
    expect(normalizePurchaseStatus("pagamento_recusado")).toBe("refunded");
    expect(normalizePurchaseStatus("declined")).toBe("refunded");
    expect(normalizePurchaseStatus("purchase_expired")).toBe("refunded");
  });

  it("keeps success-like events as active", () => {
    expect(normalizePurchaseStatus("paid")).toBe("active");
    expect(normalizePurchaseStatus("purchase.approved")).toBe("active");
    expect(normalizePurchaseStatus(undefined)).toBe("active");
  });
});

describe("extractWebhookPurchase", () => {
  it("extracts email/product/status from common cakto payload fields", () => {
    expect(
      extractWebhookPurchase({
        customer: { email: "cliente@bridalcreative.com.br" },
        product: { id: "prod_1" },
        event: "purchase.approved",
      })
    ).toEqual({
      email: "cliente@bridalcreative.com.br",
      rawProductId: "prod_1",
      rawStatus: "purchase.approved",
    });
  });

  it("supports fallback fields", () => {
    expect(
      extractWebhookPurchase({
        customer_email: "fallback@bridalcreative.com.br",
        offer: { id: 987 },
        status: "refunded",
      })
    ).toEqual({
      email: "fallback@bridalcreative.com.br",
      rawProductId: 987,
      rawStatus: "refunded",
    });
  });

  it("extracts data from the real Cakto envelope (fields nested under `data`)", () => {
    expect(
      extractWebhookPurchase({
        customer: { email: "cliente@bridalcreative.com.br" },
        product: { id: "cd287b31-d4b7-4e94-858a-96e05ce2f4a2" },
        status: "paid",
      })
    ).toEqual({
      email: "cliente@bridalcreative.com.br",
      rawProductId: "cd287b31-d4b7-4e94-858a-96e05ce2f4a2",
      rawStatus: "paid",
    });
  });
});

describe("getWebhookToken", () => {
  it("reads the token from the Cakto `secret` body field", () => {
    expect(getWebhookToken({ headers: {}, body: { secret: "abc123" }, query: {} })).toBe(
      "abc123"
    );
  });

  it("still supports header-based tokens", () => {
    expect(
      getWebhookToken({
        headers: { "x-cakto-token": "hdr-token" },
        body: {},
        query: {},
      })
    ).toBe("hdr-token");
  });
});