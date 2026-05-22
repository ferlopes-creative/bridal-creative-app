import { describe, expect, it } from "vitest";
import { parseAuthorizationBearer } from "./grant-purchase-core";

describe("parseAuthorizationBearer", () => {
  it("extracts token from Bearer header", () => {
    expect(parseAuthorizationBearer("Bearer abc.def")).toBe("abc.def");
  });

  it("returns null when header is missing", () => {
    expect(parseAuthorizationBearer(undefined)).toBeNull();
  });
});
