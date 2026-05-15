import { describe, expect, it } from "vitest";
import { isValidEmailAddress, normalizeEmail } from "./auth-email-login-core";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Cliente@Bridalcreative.com.br  ")).toBe(
      "cliente@bridalcreative.com.br"
    );
  });
});

describe("isValidEmailAddress", () => {
  it("accepts valid emails", () => {
    expect(isValidEmailAddress("a@b.co")).toBe(true);
    expect(isValidEmailAddress("cliente@bridalcreative.com.br")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmailAddress("")).toBe(false);
    expect(isValidEmailAddress("not-an-email")).toBe(false);
    expect(isValidEmailAddress("@domain.com")).toBe(false);
  });
});
