export type ProductLesson = {
  id: string;
  title: string;
  video_url: string;
  cover_url: string | null;
  description: string;
};

export type ProductModule = {
  id: string;
  title: string;
  cover_url: string | null;
  lessons: ProductLesson[];
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeLesson(raw: unknown): ProductLesson | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;

  return {
    id,
    title: typeof item.title === "string" ? item.title : "",
    video_url: typeof item.video_url === "string" ? item.video_url : "",
    cover_url: typeof item.cover_url === "string" && item.cover_url.trim() ? item.cover_url : null,
    description: typeof item.description === "string" ? item.description : "",
  };
}

function normalizeModule(raw: unknown): ProductModule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id.trim() : "";
  if (!id) return null;

  const lessonsRaw = Array.isArray(item.lessons) ? item.lessons : [];
  const lessons: ProductLesson[] = [];
  const seen = new Set<string>();
  for (const lessonRaw of lessonsRaw) {
    const lesson = normalizeLesson(lessonRaw);
    if (!lesson || seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    lessons.push(lesson);
  }

  return {
    id,
    title: typeof item.title === "string" ? item.title : "",
    cover_url: typeof item.cover_url === "string" && item.cover_url.trim() ? item.cover_url : null,
    lessons,
  };
}

export function parseProductModules(raw: unknown): ProductModule[] {
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
  const modules: ProductModule[] = [];
  for (const item of items) {
    const normalized = normalizeModule(item);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    modules.push(normalized);
  }
  return modules;
}

export function createProductModule(): ProductModule {
  return { id: newId(), title: "", cover_url: null, lessons: [] };
}

export function createProductLesson(): ProductLesson {
  return { id: newId(), title: "", video_url: "", cover_url: null, description: "" };
}

export function isMissingModulesConfigColumnError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("modules_config") || m.includes("schema cache");
}
