export type ProductCategoryConfig = {
  id: string;
  name: string;
  photo_url: string | null;
  visible: boolean;
  product_ids: string[];
};

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

function normalizeCategory(raw: unknown): ProductCategoryConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;
  const name = typeof item.name === "string" ? item.name : "";
  const photo_url = typeof item.photo_url === "string" && item.photo_url.trim() ? item.photo_url : null;
  const visible = item.visible !== false;
  return {
    id,
    name,
    photo_url,
    visible,
    product_ids: normalizeProductIds(item.product_ids),
  };
}

export function parseProductCategoriesConfig(raw: unknown): ProductCategoryConfig[] {
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
  const categories: ProductCategoryConfig[] = [];
  for (const item of items) {
    const normalized = normalizeCategory(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    categories.push(normalized);
  }
  return categories;
}

export function createProductCategory(): ProductCategoryConfig {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `category-${Date.now()}`;

  return {
    id,
    name: "Nova categoria",
    photo_url: null,
    visible: true,
    product_ids: [],
  };
}

/** Categoria (se houver) à qual um produto pertence — usada no seletor do formulário de produto. */
export function findCategoryIdForProduct(
  categories: ProductCategoryConfig[],
  productId: string
): string {
  const found = categories.find((category) => category.product_ids.includes(productId));
  return found?.id ?? "";
}

/** Move um produto para a categoria escolhida, removendo-o de todas as outras. */
export function assignProductToCategory(
  categories: ProductCategoryConfig[],
  productId: string,
  categoryId: string
): ProductCategoryConfig[] {
  return categories.map((category) => {
    const withoutProduct = category.product_ids.filter((id) => id !== productId);
    if (category.id === categoryId) {
      return { ...category, product_ids: [...withoutProduct, productId] };
    }
    return withoutProduct.length === category.product_ids.length
      ? category
      : { ...category, product_ids: withoutProduct };
  });
}

export function isProductCategoriesConfigSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("product_categories_config") || m.includes("schema cache");
}
