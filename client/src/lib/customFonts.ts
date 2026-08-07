export type CustomFont = {
  id: string;
  name: string;
  url: string;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFont(raw: unknown): CustomFont | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const url = typeof item.url === "string" ? item.url.trim() : "";
  if (!id || !name || !url) return null;
  return { id, name, url };
}

export function parseCustomFonts(raw: unknown): CustomFont[] {
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
  }

  const seen = new Set<string>();
  const fonts: CustomFont[] = [];
  for (const item of items) {
    const normalized = normalizeFont(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    fonts.push(normalized);
  }
  return fonts;
}

export function createCustomFont(name: string, url: string): CustomFont {
  return { id: newId(), name, url };
}

export function isCustomFontsConfigSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("custom_fonts_config") || m.includes("schema cache");
}

function fontFaceFormat(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  if (ext === "ttf") return "truetype";
  return "woff2";
}

/** Gera as regras @font-face pra registrar as fontes enviadas no navegador. */
export function buildFontFaceCss(fonts: CustomFont[]): string {
  return fonts
    .map(
      (font) =>
        `@font-face { font-family: "${font.name.replace(/["\\]/g, "")}"; src: url("${font.url}") format("${fontFaceFormat(font.url)}"); font-display: swap; }`
    )
    .join("\n");
}
