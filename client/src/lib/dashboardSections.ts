export type DashboardSectionId = "owned" | "suggested" | "bonus" | "other" | "whatsapp";

export const DASHBOARD_SECTION_IDS: DashboardSectionId[] = [
  "owned",
  "suggested",
  "bonus",
  "other",
  "whatsapp",
];

export const DEFAULT_DASHBOARD_SECTION_ORDER: DashboardSectionId[] = [...DASHBOARD_SECTION_IDS];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  owned: "Seus produtos",
  suggested: "Pensados para você",
  bonus: "Bônus",
  other: "Outros produtos",
  whatsapp: "Banner WhatsApp (personalizado)",
};

function isDashboardSectionId(value: unknown): value is DashboardSectionId {
  return typeof value === "string" && DASHBOARD_SECTION_IDS.includes(value as DashboardSectionId);
}

/** Normaliza ordem salva no banco: ids válidos, sem duplicatas, faltantes no final. */
export function parseDashboardSectionOrder(raw: unknown): DashboardSectionId[] {
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

  const seen = new Set<DashboardSectionId>();
  const ordered: DashboardSectionId[] = [];
  for (const item of items) {
    if (!isDashboardSectionId(item) || seen.has(item)) continue;
    seen.add(item);
    ordered.push(item);
  }
  for (const id of DASHBOARD_SECTION_IDS) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function isDashboardSectionOrderSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("dashboard_section_order") || m.includes("schema cache");
}
