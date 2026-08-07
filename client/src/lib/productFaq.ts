export type ProductFaqItem = {
  id: string;
  question: string;
  answer: string;
};

function normalizeFaqItem(raw: unknown): ProductFaqItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;

  return {
    id,
    question: typeof item.question === "string" ? item.question : "",
    answer: typeof item.answer === "string" ? item.answer : "",
  };
}

export function parseProductFaq(raw: unknown): ProductFaqItem[] {
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
  const faq: ProductFaqItem[] = [];
  for (const item of items) {
    const normalized = normalizeFaqItem(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    faq.push(normalized);
  }
  return faq;
}

export function createFaqItem(): ProductFaqItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `faq-${Date.now()}`;

  return { id, question: "", answer: "" };
}

export function isMissingFaqConfigColumnError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("faq_config") || m.includes("schema cache");
}

export function isMissingProductTestimonialsConfigColumnError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("product_testimonials_config") || m.includes("schema cache");
}
