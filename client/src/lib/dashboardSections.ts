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

export type DashboardSectionAutoRule = "purchased" | "unpurchased" | "bonus" | "all_visible";

export type DashboardSectionKind = "products" | "whatsapp";

export type DashboardSectionConfig = {
  id: string;
  title: string;
  kind: DashboardSectionKind;
  mode: "automatic" | "manual";
  auto_rule?: DashboardSectionAutoRule;
  product_ids?: string[];
};

export const DASHBOARD_AUTO_RULE_LABELS: Record<DashboardSectionAutoRule, string> = {
  purchased: "Produtos que a cliente já comprou",
  unpurchased: "Produtos ainda não comprados (com cadeado)",
  bonus: "Bônus liberados (tipo BON)",
  all_visible: "Todos os produtos visíveis no catálogo",
};

export const DASHBOARD_AUTO_RULE_HINTS: Record<DashboardSectionAutoRule, string> = {
  purchased:
    "Mostra automaticamente os produtos principais que a cliente já adquiriu. Ideal para a área “meus produtos”.",
  unpurchased:
    "Mostra produtos do catálogo que ela ainda não comprou, com ícone de cadeado até a compra.",
  bonus:
    "Mostra bônus (tipo BON) liberados por compra direta ou por kit. A seção some se não houver bônus.",
  all_visible:
    "Lista todos os produtos visíveis no catálogo. O cadeado aparece nos que ainda não foram liberados.",
};

const LEGACY_AUTO_RULE_BY_ID: Record<DashboardSectionId, DashboardSectionAutoRule | null> = {
  owned: "purchased",
  suggested: "unpurchased",
  bonus: "bonus",
  other: "all_visible",
  whatsapp: null,
};

function isDashboardSectionId(value: unknown): value is DashboardSectionId {
  return typeof value === "string" && DASHBOARD_SECTION_IDS.includes(value as DashboardSectionId);
}

function isDashboardSectionAutoRule(value: unknown): value is DashboardSectionAutoRule {
  return (
    value === "purchased" ||
    value === "unpurchased" ||
    value === "bonus" ||
    value === "all_visible"
  );
}

function isDashboardSectionKind(value: unknown): value is DashboardSectionKind {
  return value === "products" || value === "whatsapp";
}

function legacyIdToConfig(id: DashboardSectionId): DashboardSectionConfig {
  if (id === "whatsapp") {
    return {
      id,
      title: DASHBOARD_SECTION_LABELS.whatsapp,
      kind: "whatsapp",
      mode: "manual",
    };
  }

  return {
    id,
    title: DASHBOARD_SECTION_LABELS[id],
    kind: "products",
    mode: "automatic",
    auto_rule: LEGACY_AUTO_RULE_BY_ID[id] ?? "all_visible",
  };
}

export const DEFAULT_DASHBOARD_SECTIONS_CONFIG: DashboardSectionConfig[] =
  DEFAULT_DASHBOARD_SECTION_ORDER.map(legacyIdToConfig);

function normalizeProductIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
}

function normalizeSectionConfig(raw: unknown): DashboardSectionConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  if (!id || !title) return null;

  const kind = isDashboardSectionKind(item.kind) ? item.kind : "products";
  if (kind === "whatsapp") {
    return { id, title, kind: "whatsapp", mode: "manual" };
  }

  const mode = item.mode === "manual" ? "manual" : "automatic";
  if (mode === "manual") {
    return {
      id,
      title,
      kind: "products",
      mode: "manual",
      product_ids: normalizeProductIds(item.product_ids),
    };
  }

  const autoRule = isDashboardSectionAutoRule(item.auto_rule) ? item.auto_rule : "all_visible";
  return {
    id,
    title,
    kind: "products",
    mode: "automatic",
    auto_rule: autoRule,
  };
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

export function parseDashboardSectionsConfig(
  raw: unknown,
  fallbackOrder: DashboardSectionId[] = DEFAULT_DASHBOARD_SECTION_ORDER
): DashboardSectionConfig[] {
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
  const ordered: DashboardSectionConfig[] = [];
  for (const item of items) {
    const normalized = normalizeSectionConfig(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    ordered.push(normalized);
  }

  if (ordered.length > 0) return ordered;

  const order = parseDashboardSectionOrder(fallbackOrder);
  return order.map(legacyIdToConfig);
}

export function dashboardSectionsConfigToOrder(config: DashboardSectionConfig[]): DashboardSectionId[] {
  const legacyIds = config
    .map((section) => section.id)
    .filter((id): id is DashboardSectionId => isDashboardSectionId(id));
  return parseDashboardSectionOrder(legacyIds);
}

export function createDashboardSection(
  kind: DashboardSectionKind = "products"
): DashboardSectionConfig {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `section-${Date.now()}`;

  if (kind === "whatsapp") {
    return {
      id,
      title: "Chame nossa equipe",
      kind: "whatsapp",
      mode: "manual",
    };
  }

  return {
    id,
    title: "Nova seção",
    kind: "products",
    mode: "manual",
    product_ids: [],
  };
}

type SectionProduct = {
  id: string;
  type?: string | null;
  is_hidden?: boolean | null;
};

export function resolveSectionProducts<T extends SectionProduct>(
  section: DashboardSectionConfig,
  products: T[],
  ctx: {
    purchasedIds: Set<string>;
    canAccess: (product: T) => boolean;
    visibleInCatalog: (product: T) => boolean;
  }
): T[] {
  if (section.kind !== "products") return [];

  const getType = (product: T) => (product.type || "PRO").toUpperCase();
  const nonBonusProducts = products.filter((product) => getType(product) !== "BON");
  const bonusProducts = products.filter((product) => getType(product) === "BON");
  const byId = new Map(products.map((product) => [product.id, product]));

  if (section.mode === "manual") {
    return (section.product_ids ?? [])
      .map((id) => byId.get(id))
      .filter((product): product is T => product != null);
  }

  switch (section.auto_rule) {
    case "purchased":
      return nonBonusProducts.filter((product) => ctx.purchasedIds.has(product.id));
    case "unpurchased":
      return nonBonusProducts.filter(
        (product) => !ctx.purchasedIds.has(product.id) && ctx.visibleInCatalog(product)
      );
    case "bonus":
      return bonusProducts.filter(
        (product) => ctx.canAccess(product) && ctx.visibleInCatalog(product)
      );
    case "all_visible":
    default:
      return nonBonusProducts.filter((product) => ctx.visibleInCatalog(product));
  }
}

export function sectionShowsLockedOverlay<T extends SectionProduct>(
  section: DashboardSectionConfig,
  product: T,
  canAccess: (product: T) => boolean
): boolean {
  if (section.kind !== "products") return false;
  if (section.mode === "automatic") {
    if (section.auto_rule === "purchased" || section.auto_rule === "bonus") return false;
    if (section.auto_rule === "unpurchased") return true;
  }
  return !canAccess(product);
}

export function shouldRenderDashboardSection(
  section: DashboardSectionConfig,
  productCount: number,
  whatsappUrl: string | null | undefined
): boolean {
  if (section.kind === "whatsapp") {
    return Boolean(whatsappUrl?.trim());
  }
  if (
    section.kind === "products" &&
    section.mode === "automatic" &&
    section.auto_rule === "bonus"
  ) {
    return productCount > 0;
  }
  return true;
}

export function isDashboardSectionOrderSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("dashboard_section_order") || m.includes("schema cache");
}

export function isDashboardSectionsConfigSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("dashboard_sections_config") || m.includes("schema cache");
}
