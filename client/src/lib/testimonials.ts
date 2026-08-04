export type TestimonialConfig = {
  id: string;
  author_name: string;
  submitted_at: string;
  rating: number;
  text: string;
  photo_url: string | null;
  visible: boolean;
};

function normalizeRating(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizeTestimonial(raw: unknown): TestimonialConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;

  return {
    id,
    author_name: typeof item.author_name === "string" ? item.author_name : "",
    submitted_at: typeof item.submitted_at === "string" ? item.submitted_at : "",
    rating: normalizeRating(item.rating),
    text: typeof item.text === "string" ? item.text : "",
    photo_url: typeof item.photo_url === "string" && item.photo_url.trim() ? item.photo_url : null,
    visible: item.visible !== false,
  };
}

export function parseTestimonialsConfig(raw: unknown): TestimonialConfig[] {
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
  const testimonials: TestimonialConfig[] = [];
  for (const item of items) {
    const normalized = normalizeTestimonial(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    testimonials.push(normalized);
  }
  return testimonials;
}

export function createTestimonial(): TestimonialConfig {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `testimonial-${Date.now()}`;

  return {
    id,
    author_name: "",
    submitted_at: new Date().toISOString().slice(0, 10),
    rating: 5,
    text: "",
    photo_url: null,
    visible: true,
  };
}

export function formatTestimonialDate(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function isTestimonialsConfigSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("testimonials_config") || m.includes("schema cache");
}

export function isTestimonialsBannerUrlSchemaError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("testimonials_banner_url") || m.includes("schema cache");
}
