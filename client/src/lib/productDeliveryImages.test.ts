import { describe, expect, it } from "vitest";
import { parseDeliveryGalleryUrls } from "./productDeliveryImages";

describe("parseDeliveryGalleryUrls", () => {
  it("parses jsonb array from database", () => {
    expect(parseDeliveryGalleryUrls(["https://a.test/1.png", "  ", "https://b.test/2.png"])).toEqual([
      "https://a.test/1.png",
      "https://b.test/2.png",
    ]);
  });

  it("parses JSON string", () => {
    expect(parseDeliveryGalleryUrls('["https://a.test/x.jpg"]')).toEqual(["https://a.test/x.jpg"]);
  });

  it("returns empty for nullish values", () => {
    expect(parseDeliveryGalleryUrls(null)).toEqual([]);
    expect(parseDeliveryGalleryUrls([])).toEqual([]);
  });
});
