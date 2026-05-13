import { describe, expect, it } from "vitest";
import { canAccessProduct } from "./productAccess";

describe("canAccessProduct", () => {
  it("grants access when product was purchased", () => {
    const purchased = new Set(["p1"]);
    expect(canAccessProduct({ id: "p1", type: "PRO" }, purchased, [])).toBe(true);
  });

  it("blocks regular products that were not purchased", () => {
    const purchased = new Set(["p1"]);
    expect(canAccessProduct({ id: "p2", type: "PRO" }, purchased, [])).toBe(false);
  });

  it("unlocks bonus when kit rule matches a purchased kit", () => {
    const purchased = new Set(["kit-a"]);
    const kitRows = [{ kit_product_id: "kit-a", bonus_product_id: "bonus-1" }];
    expect(canAccessProduct({ id: "bonus-1", type: "BON" }, purchased, kitRows)).toBe(true);
  });
});
