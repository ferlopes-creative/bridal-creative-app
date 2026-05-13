import { describe, expect, it } from "vitest";
import { hasCommunityAccess } from "./communityAccess";

describe("hasCommunityAccess", () => {
  it("unlocks community when user has at least one purchase", () => {
    expect(hasCommunityAccess(new Set(["prod-1"]))).toBe(true);
  });

  it("keeps community locked when user has no purchases", () => {
    expect(hasCommunityAccess(new Set())).toBe(false);
  });
});
