import { describe, expect, it } from "vitest";
import {
  parseAccessLinks,
  resolveProductAccessLinks,
  serializeAccessLinks,
} from "./productAccessLinks";

describe("productAccessLinks", () => {
  it("parses jsonb array from database", () => {
    expect(
      parseAccessLinks([
        { label: "Drive", url: "https://drive.example/a" },
        { url: "https://b.example" },
      ])
    ).toEqual([
      { label: "Drive", url: "https://drive.example/a" },
      { label: "", url: "https://b.example" },
    ]);
  });

  it("falls back to link_compra when access_links is empty", () => {
    expect(
      resolveProductAccessLinks({
        access_links: [],
        link_compra: "https://checkout.example",
      })
    ).toEqual([{ label: "Acesso", url: "https://checkout.example" }]);
  });

  it("prefers access_links over legacy checkout link", () => {
    expect(
      resolveProductAccessLinks({
        access_links: [{ label: "Módulo 1", url: "https://a.example" }],
        link_compra: "https://checkout.example",
      })
    ).toEqual([{ label: "Módulo 1", url: "https://a.example" }]);
  });

  it("drops rows without url on serialize", () => {
    expect(
      serializeAccessLinks([
        { label: "Ok", url: " https://ok.example " },
        { label: "Vazio", url: "   " },
      ])
    ).toEqual([{ label: "Ok", url: "https://ok.example" }]);
  });
});
