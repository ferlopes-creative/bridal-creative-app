import { describe, expect, it } from "vitest";
import { parseDeliveryGalleryUrls, parseGalleryUrls } from "./productDeliveryImages";

describe("parseGalleryUrls", () => {
  it("parses jsonb array from database", () => {
    expect(parseGalleryUrls(["https://a.test/1.png", "  ", "https://b.test/2.png"])).toEqual([
      "https://a.test/1.png",
      "https://b.test/2.png",
    ]);
  });

  it("parses JSON string", () => {
    expect(parseGalleryUrls('["https://a.test/x.jpg"]')).toEqual(["https://a.test/x.jpg"]);
  });

  it("returns empty for nullish values", () => {
    expect(parseGalleryUrls(null)).toEqual([]);
    expect(parseGalleryUrls([])).toEqual([]);
  });
});

describe("parseDeliveryGalleryUrls", () => {
  it("aliases parseGalleryUrls", () => {
    expect(parseDeliveryGalleryUrls(["https://a.test/1.png"])).toEqual(["https://a.test/1.png"]);
  });
});
