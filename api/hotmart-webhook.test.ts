import { describe, expect, it } from "vitest";
import { extractHotmartPurchase, resolveHotmartAction } from "./hotmart-webhook";

describe("resolveHotmartAction", () => {
  it("grants access on approved purchase events", () => {
    expect(resolveHotmartAction("PURCHASE_APPROVED", "APPROVED")).toBe("grant");
    expect(resolveHotmartAction("PURCHASE_COMPLETE", "COMPLETED")).toBe("grant");
  });

  it("revokes access on refund-like events", () => {
    expect(resolveHotmartAction("PURCHASE_REFUNDED", "REFUNDED")).toBe("revoke");
    expect(resolveHotmartAction("PURCHASE_CANCELED", "CANCELED")).toBe("revoke");
    expect(resolveHotmartAction("PURCHASE_CHARGEBACK", "CHARGEBACK")).toBe("revoke");
  });

  it("ignores pending events", () => {
    expect(resolveHotmartAction("PURCHASE_BILLET_PRINTED", "BILLET_PRINTED")).toBe("ignore");
    expect(resolveHotmartAction("PURCHASE_DELAYED", "DELAYED")).toBe("ignore");
  });
});

describe("extractHotmartPurchase", () => {
  it("extracts email/product/status from Hotmart API v2 payload", () => {
    expect(
      extractHotmartPurchase({
        event: "PURCHASE_APPROVED",
        version: "2.0.0",
        data: {
          product: { id: 123456, name: "Curso" },
          buyer: { email: "cliente@bridalcreative.com.br" },
          purchase: { status: "APPROVED", transaction: "HP123" },
        },
      })
    ).toEqual({
      email: "cliente@bridalcreative.com.br",
      rawProductId: 123456,
      rawStatus: "APPROVED",
      event: "PURCHASE_APPROVED",
    });
  });

  it("supports legacy flat payload fields", () => {
    expect(
      extractHotmartPurchase({
        email: "legacy@bridalcreative.com.br",
        prod: "98765",
        status: "approved",
      })
    ).toEqual({
      email: "legacy@bridalcreative.com.br",
      rawProductId: "98765",
      rawStatus: "approved",
      event: undefined,
    });
  });

  it("falls back to offer code when product id is absent", () => {
    expect(
      extractHotmartPurchase({
        event: "PURCHASE_COMPLETE",
        data: {
          buyer: { email: "oferta@bridalcreative.com.br" },
          purchase: { status: "APPROVED", offer: { code: "OFERTA_BASICA" } },
        },
      })
    ).toEqual({
      email: "oferta@bridalcreative.com.br",
      rawProductId: "OFERTA_BASICA",
      rawStatus: "APPROVED",
      event: "PURCHASE_COMPLETE",
    });
  });
});
