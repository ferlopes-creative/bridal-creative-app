import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_SECTIONS_CONFIG,
  parseDashboardSectionsConfig,
  resolveSectionProducts,
  sectionShowsLockedOverlay,
} from "./dashboardSections";

describe("parseDashboardSectionsConfig", () => {
  it("falls back to legacy order when config is empty", () => {
    const config = parseDashboardSectionsConfig(null, ["owned", "bonus", "whatsapp"]);
    expect(config.map((section) => section.id)).toEqual([
      "owned",
      "bonus",
      "whatsapp",
      "suggested",
      "other",
    ]);
    expect(config[0]?.title).toBe("Seus produtos");
    expect(config[1]?.auto_rule).toBe("bonus");
  });

  it("normalizes manual sections with product ids", () => {
    const config = parseDashboardSectionsConfig([
      {
        id: "custom-1",
        title: "Kits especiais",
        kind: "products",
        mode: "manual",
        product_ids: ["a", "a", "b"],
      },
    ]);
    expect(config).toHaveLength(1);
    expect(config[0]).toMatchObject({
      title: "Kits especiais",
      mode: "manual",
      product_ids: ["a", "b"],
    });
  });
});

describe("resolveSectionProducts", () => {
  const products = [
    { id: "p1", type: "PRO", is_hidden: false },
    { id: "p2", type: "PRO", is_hidden: false },
    { id: "b1", type: "BON", is_hidden: false },
  ];

  it("returns purchased products for automatic purchased rule", () => {
    const section = DEFAULT_DASHBOARD_SECTIONS_CONFIG.find((item) => item.auto_rule === "purchased")!;
    const result = resolveSectionProducts(section, products, {
      purchasedIds: new Set(["p1"]),
      canAccess: () => true,
      visibleInCatalog: () => true,
    });
    expect(result.map((item) => item.id)).toEqual(["p1"]);
  });

  it("preserves manual product order", () => {
    const section = {
      id: "manual",
      title: "Manual",
      kind: "products" as const,
      mode: "manual" as const,
      product_ids: ["p2", "p1"],
    };
    const result = resolveSectionProducts(section, products, {
      purchasedIds: new Set(),
      canAccess: () => false,
      visibleInCatalog: () => true,
    });
    expect(result.map((item) => item.id)).toEqual(["p2", "p1"]);
  });
});

describe("sectionShowsLockedOverlay", () => {
  it("locks unpurchased automatic sections", () => {
    const section = DEFAULT_DASHBOARD_SECTIONS_CONFIG.find((item) => item.auto_rule === "unpurchased")!;
    expect(sectionShowsLockedOverlay(section, { id: "p1", type: "PRO" }, () => false)).toBe(true);
    expect(sectionShowsLockedOverlay(section, { id: "p1", type: "PRO" }, () => true)).toBe(true);
  });
});
