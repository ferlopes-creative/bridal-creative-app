import { describe, expect, it } from "vitest";
import { isSessionFresh } from "@/lib/authSession";
import type { Session } from "@supabase/supabase-js";

function session(expiresAt: number): Session {
  return {
    access_token: "token",
    refresh_token: "refresh",
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user: { id: "user-1" } as Session["user"],
  };
}

describe("isSessionFresh", () => {
  it("returns true when expiry is more than 30s away", () => {
    const now = 1_700_000_000_000;
    expect(isSessionFresh(session(Math.floor((now + 60_000) / 1000)), now)).toBe(true);
  });

  it("returns false when expiry is within 30s", () => {
    const now = 1_700_000_000_000;
    expect(isSessionFresh(session(Math.floor((now + 10_000) / 1000)), now)).toBe(false);
  });

  it("returns true when expires_at is missing", () => {
    const s = session(0);
    delete (s as { expires_at?: number }).expires_at;
    expect(isSessionFresh(s)).toBe(true);
  });
});
