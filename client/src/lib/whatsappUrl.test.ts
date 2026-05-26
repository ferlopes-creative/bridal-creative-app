import { describe, expect, it } from "vitest";
import { normalizeWhatsAppUrl, resolveWhatsAppUrl } from "./whatsappUrl";

describe("normalizeWhatsAppUrl", () => {
  it("builds wa.me from digits", () => {
    expect(normalizeWhatsAppUrl("5511999998888")).toBe("https://wa.me/5511999998888");
  });

  it("keeps full https URL", () => {
    expect(normalizeWhatsAppUrl("https://wa.me/5511888777666?text=Oi")).toBe(
      "https://wa.me/5511888777666?text=Oi"
    );
  });

  it("returns null for empty or too short", () => {
    expect(normalizeWhatsAppUrl("")).toBeNull();
    expect(normalizeWhatsAppUrl("123")).toBeNull();
  });
});

describe("resolveWhatsAppUrl", () => {
  it("prefers CMS value", () => {
    expect(resolveWhatsAppUrl({ whatsapp_url: "5511999887766" })).toBe("https://wa.me/5511999887766");
  });
});
