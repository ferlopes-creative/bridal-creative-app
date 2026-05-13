import { describe, expect, it } from "vitest";
import { extractWebhookPurchase, normalizePurchaseStatus } from "./cakto-webhook";

describe("normalizePurchaseStatus", () => {
  it("marks refund-like events as refunded", () => {
    expect(normalizePurchaseStatus("purchase.refunded")).toBe("refunded");
    expect(normalizePurchaseStatus("REEMBOLSADO")).toBe("refunded");
    expect(normalizePurchaseStatus("chargeback_opened")).toBe("refunded");
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
});