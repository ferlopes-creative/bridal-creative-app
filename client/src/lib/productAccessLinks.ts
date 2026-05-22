export type ProductAccessLink = {
  label: string;
  url: string;
};

export type ProductAccessLinkRow = ProductAccessLink & { id: string };

function newRowId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Normaliza valor vindo do Supabase (jsonb, string JSON ou array legado). */
export function parseAccessLinks(raw: unknown): ProductAccessLink[] {
  if (raw == null) return [];

  let value: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  const out: ProductAccessLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url) continue;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    out.push({ label, url });
  }
  return out;
}

/** Links exibidos após a compra; se vazio, usa link_compra / link legado. */
export function resolveProductAccessLinks(product: {
  access_links?: unknown;
  link_compra?: string | null;
  link?: string | null;
}): ProductAccessLink[] {
  const parsed = parseAccessLinks(product.access_links);
  if (parsed.length > 0) return parsed;

  const fallback = (product.link_compra || product.link || "").trim();
  if (!fallback) return [];
  return [{ label: "Acesso", url: fallback }];
}

export function serializeAccessLinks(links: ProductAccessLink[]): ProductAccessLink[] {
  return links
    .map((item) => ({
      label: item.label.trim(),
      url: item.url.trim(),
    }))
    .filter((item) => item.url.length > 0);
}

export function accessLinksEqual(a: ProductAccessLink[], b: ProductAccessLink[]): boolean {
  const left = serializeAccessLinks(a);
  const right = serializeAccessLinks(b);
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return item.label === other.label && item.url === other.url;
  });
}

export function emptyAccessLinkRow(): ProductAccessLinkRow {
  return { id: newRowId(), label: "", url: "" };
}

export function accessLinksToFormRows(links: ProductAccessLink[]): ProductAccessLinkRow[] {
  const rows = serializeAccessLinks(links).map((item) => ({
    id: newRowId(),
    label: item.label,
    url: item.url,
  }));
  return rows.length > 0 ? rows : [emptyAccessLinkRow()];
}

export function formRowsToAccessLinks(rows: ProductAccessLinkRow[]): ProductAccessLink[] {
  return serializeAccessLinks(
    rows.map((row) => ({
      label: row.label,
      url: row.url,
    }))
  );
}
