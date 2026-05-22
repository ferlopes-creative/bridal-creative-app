import { describe, expect, it } from "vitest";
import { parseLegacyPurchaseLines } from "../client/src/lib/legacyPurchaseImport";

describe("parseLegacyPurchaseLines", () => {
  it("parses comma-separated lines and ignores comments", () => {
    const text = `
# export Cakto
cliente@email.com,abc-uuid-1
outra@email.com;def-uuid-2
    `;
    const { lines, errors } = parseLegacyPurchaseLines(text);
    expect(errors).toEqual([]);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      email: "cliente@email.com",
      productId: "abc-uuid-1",
    });
    expect(lines[1].productId).toBe("def-uuid-2");
  });

  it("reports invalid lines", () => {
    const { lines, errors } = parseLegacyPurchaseLines("sem-separador\n@,id");
    expect(lines).toHaveLength(0);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
