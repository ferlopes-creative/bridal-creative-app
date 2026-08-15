import {
  ChevronDown,
  ChevronUp,
  Compass,
  GripVertical,
  LayoutGrid,
  MessageCircle,
  Plus,
  Quote,
  Save,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  DASHBOARD_AUTO_RULE_HINTS,
  DASHBOARD_AUTO_RULE_LABELS,
  createDashboardSection,
  type DashboardSectionAutoRule,
  type DashboardSectionConfig,
  type DashboardSectionKind,
} from "@/lib/dashboardSections";

type ProductOption = {
  id: string;
  name: string | null;
  type?: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type DashboardSectionsEditorProps = {
  sections: DashboardSectionConfig[];
  onChange: (sections: DashboardSectionConfig[]) => void;
  products: ProductOption[];
  categories: CategoryOption[];
  /** Cria (e já salva) uma categoria nova sem sair desta tela; retorna o id criado. */
  onCreateCategory: (name: string) => Promise<string>;
  saving: boolean;
  onSave: () => void;
};

const AUTO_RULES: DashboardSectionAutoRule[] = [
  "purchased",
  "unpurchased",
  "bonus",
  "all_visible",
];

const KIND_ICONS: Record<DashboardSectionKind, LucideIcon> = {
  products: LayoutGrid,
  categories: Compass,
  category_highlight: Sparkles,
  testimonials: Quote,
  whatsapp: MessageCircle,
};

const KIND_LABELS: Record<DashboardSectionKind, string> = {
  products: "Produtos",
  categories: "Explore",
  category_highlight: "Destaque",
  testimonials: "Depoimentos",
  whatsapp: "WhatsApp",
};

function updateSectionAt(
  sections: DashboardSectionConfig[],
  index: number,
  patch: Partial<DashboardSectionConfig>
): DashboardSectionConfig[] {
  return sections.map((section, i) => (i === index ? { ...section, ...patch } : section));
}

function moveSection(
  sections: DashboardSectionConfig[],
  index: number,
  direction: -1 | 1
): DashboardSectionConfig[] {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function reorderSection(
  sections: DashboardSectionConfig[],
  fromIndex: number,
  toIndex: number
): DashboardSectionConfig[] {
  if (fromIndex === toIndex) return sections;
  const next = [...sections];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function toggleProductId(section: DashboardSectionConfig, productId: string): DashboardSectionConfig {
  const current = section.product_ids ?? [];
  const exists = current.includes(productId);
  const product_ids = exists
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  return { ...section, product_ids };
}

function moveProductId(
  section: DashboardSectionConfig,
  productId: string,
  direction: -1 | 1
): DashboardSectionConfig {
  const current = [...(section.product_ids ?? [])];
  const index = current.indexOf(productId);
  if (index < 0) return section;
  const target = index + direction;
  if (target < 0 || target >= current.length) return section;
  [current[index], current[target]] = [current[target], current[index]];
  return { ...section, product_ids: current };
}

function toggleCategoryId(section: DashboardSectionConfig, categoryId: string): DashboardSectionConfig {
  const current = section.category_ids ?? [];
  const exists = current.includes(categoryId);
  const category_ids = exists
    ? current.filter((id) => id !== categoryId)
    : [...current, categoryId];
  return { ...section, category_ids };
}

function moveCategoryId(
  section: DashboardSectionConfig,
  categoryId: string,
  direction: -1 | 1
): DashboardSectionConfig {
  const current = [...(section.category_ids ?? [])];
  const index = current.indexOf(categoryId);
  if (index < 0) return section;
  const target = index + direction;
  if (target < 0 || target >= current.length) return section;
  [current[index], current[target]] = [current[target], current[index]];
  return { ...section, category_ids: current };
}

function QuickCreateCategory({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (name: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#6B705C] hover:underline disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Criar nova categoria aqui
      </button>
    );
  }

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      setName("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="Nome da nova categoria"
        autoFocus
        disabled={disabled || creating}
        className="h-9 flex-1 rounded-md border border-zinc-200 px-2.5 text-xs outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={disabled || creating || !name.trim()}
        className="inline-flex h-9 shrink-0 items-center rounded-md bg-[#6B705C] px-3 text-xs font-medium text-white disabled:opacity-50"
      >
        {creating ? <Spinner className="size-3.5 text-white" /> : "Criar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        disabled={creating}
        className="text-xs text-zinc-400 hover:text-zinc-600"
      >
        Cancelar
      </button>
    </div>
  );
}

/** Formulário completo de edição de uma seção — vive dentro do popup. */
function SectionEditForm({
  section,
  index,
  sections,
  products,
  categories,
  onCreateCategory,
  saving,
  onChange,
}: {
  section: DashboardSectionConfig;
  index: number;
  sections: DashboardSectionConfig[];
  products: ProductOption[];
  categories: CategoryOption[];
  onCreateCategory: (name: string) => Promise<string>;
  saving: boolean;
  onChange: (sections: DashboardSectionConfig[]) => void;
}) {
  const selectedProducts = (section.product_ids ?? [])
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is ProductOption => product != null);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Título na home
          </label>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onChange(updateSectionAt(sections, index, { title: e.target.value }))}
            placeholder="Ex.: Seus produtos"
            disabled={saving}
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Tipo de bloco
          </label>
          <select
            value={section.kind}
            onChange={(e) => {
              const kind = e.target.value as DashboardSectionKind;
              if (kind === "whatsapp" || kind === "testimonials") {
                onChange(
                  updateSectionAt(sections, index, {
                    kind,
                    mode: "manual",
                    auto_rule: undefined,
                    product_ids: undefined,
                    category_ids: undefined,
                  })
                );
                return;
              }
              if (kind === "categories") {
                onChange(
                  updateSectionAt(sections, index, {
                    kind: "categories",
                    mode: "automatic",
                    auto_rule: undefined,
                    product_ids: undefined,
                    category_ids: undefined,
                    category_id: undefined,
                  })
                );
                return;
              }
              if (kind === "category_highlight") {
                onChange(
                  updateSectionAt(sections, index, {
                    kind: "category_highlight",
                    mode: "manual",
                    auto_rule: undefined,
                    product_ids: undefined,
                    category_ids: undefined,
                    category_id: undefined,
                  })
                );
                return;
              }
              onChange(
                updateSectionAt(sections, index, {
                  kind: "products",
                  mode: section.mode === "manual" ? "manual" : "automatic",
                  auto_rule: section.auto_rule ?? "all_visible",
                  product_ids: section.product_ids ?? [],
                  category_ids: undefined,
                  category_id: undefined,
                })
              );
            }}
            disabled={saving}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
          >
            <option value="products">Lista de produtos</option>
            <option value="categories">Categorias (atalhos "Explore")</option>
            <option value="category_highlight">Destaque de 1 categoria (com título próprio)</option>
            <option value="testimonials">Depoimentos</option>
            <option value="whatsapp">Banner WhatsApp</option>
          </select>
        </div>

        {section.kind === "products" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Como preencher
            </label>
            <select
              value={section.mode}
              onChange={(e) => {
                const mode = e.target.value as "automatic" | "manual";
                onChange(
                  updateSectionAt(sections, index, {
                    mode,
                    auto_rule: mode === "automatic" ? section.auto_rule ?? "all_visible" : undefined,
                    product_ids: mode === "manual" ? section.product_ids ?? [] : undefined,
                  })
                );
              }}
              disabled={saving}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
            >
              <option value="automatic">Automático (por regra)</option>
              <option value="manual">Escolher produtos manualmente</option>
            </select>
          </div>
        ) : section.kind === "categories" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Como preencher
            </label>
            <select
              value={section.mode}
              onChange={(e) => {
                const mode = e.target.value as "automatic" | "manual";
                onChange(
                  updateSectionAt(sections, index, {
                    mode,
                    category_ids: mode === "manual" ? section.category_ids ?? [] : undefined,
                  })
                );
              }}
              disabled={saving}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
            >
              <option value="automatic">Automático (todas as categorias visíveis)</option>
              <option value="manual">Escolher categorias manualmente</option>
            </select>
          </div>
        ) : section.kind === "category_highlight" ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Categoria destacada
            </label>
            <select
              value={section.category_id ?? ""}
              onChange={(e) =>
                onChange(
                  updateSectionAt(sections, index, { category_id: e.target.value || undefined })
                )
              }
              disabled={saving}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
            >
              <option value="">Escolha uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name || "Sem nome"}
                </option>
              ))}
            </select>
            <QuickCreateCategory
              disabled={saving}
              onCreate={async (name) => {
                const newId = await onCreateCategory(name);
                onChange(updateSectionAt(sections, index, { category_id: newId }));
                return newId;
              }}
            />
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-xs leading-relaxed text-zinc-500">
              {section.kind === "whatsapp"
                ? 'Usa o link do WhatsApp configurado em Aparência do app. O texto do botão continua "Chame nossa equipe".'
                : "Mostra os depoimentos marcados como visíveis (editados em Depoimentos, mais abaixo)."}
            </p>
          </div>
        )}
      </div>

      {section.kind === "category_highlight" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Legenda acima do título (opcional)
          </label>
          <input
            type="text"
            value={section.subtitle ?? ""}
            onChange={(e) =>
              onChange(updateSectionAt(sections, index, { subtitle: e.target.value || undefined }))
            }
            placeholder='Ex.: "Autorais e exclusivos"'
            disabled={saving}
            className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
          />
        </div>
      ) : null}

      {section.kind === "products" && section.mode === "automatic" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Regra automática
          </label>
          <select
            value={section.auto_rule ?? "all_visible"}
            onChange={(e) =>
              onChange(
                updateSectionAt(sections, index, {
                  auto_rule: e.target.value as DashboardSectionAutoRule,
                })
              )
            }
            disabled={saving}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
          >
            {AUTO_RULES.map((rule) => (
              <option key={rule} value={rule}>
                {DASHBOARD_AUTO_RULE_LABELS[rule]}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-zinc-500">
            {DASHBOARD_AUTO_RULE_HINTS[section.auto_rule ?? "all_visible"]}
          </p>
        </div>
      ) : null}

      {section.kind === "products" && section.mode === "manual" ? (
        <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
          <p className="text-xs font-medium text-zinc-700">
            Produtos nesta seção ({selectedProducts.length})
          </p>

          {selectedProducts.length > 0 ? (
            <ul className="space-y-1.5">
              {selectedProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                    {product.name || "Sem nome"}
                    {(product.type || "").toUpperCase() === "BON" ? (
                      <span className="ml-1.5 text-[10px] uppercase text-zinc-400">Bônus</span>
                    ) : null}
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          updateSectionAt(sections, index, moveProductId(section, product.id, -1))
                        )
                      }
                      disabled={saving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                      aria-label="Subir produto"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          updateSectionAt(sections, index, moveProductId(section, product.id, 1))
                        )
                      }
                      disabled={saving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                      aria-label="Descer produto"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          updateSectionAt(sections, index, toggleProductId(section, product.id))
                        )
                      }
                      disabled={saving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      aria-label="Remover produto da seção"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">
              Nenhum produto selecionado. Marque abaixo os que devem aparecer.
            </p>
          )}

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2">
            {products.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500">
                Cadastre produtos no catálogo para adicioná-los aqui.
              </p>
            ) : (
              products.map((product) => {
                const checked = (section.product_ids ?? []).includes(product.id);
                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() =>
                        onChange(updateSectionAt(sections, index, toggleProductId(section, product.id)))
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-[#6B705C] focus:ring-[#6B705C]/30"
                    />
                    <span className="min-w-0 flex-1 text-sm text-zinc-700">
                      {product.name || "Sem nome"}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase text-zinc-400">
                      {(product.type || "PRO").toUpperCase()}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {section.kind === "categories" && section.mode === "manual" ? (
        <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
          <p className="text-xs font-medium text-zinc-700">
            Categorias nesta seção ({(section.category_ids ?? []).length})
          </p>

          {(section.category_ids ?? []).length > 0 ? (
            <ul className="space-y-1.5">
              {(section.category_ids ?? []).map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                return (
                  <li
                    key={categoryId}
                    className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                      {category?.name || "Categoria removida"}
                    </span>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            updateSectionAt(sections, index, moveCategoryId(section, categoryId, -1))
                          )
                        }
                        disabled={saving}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                        aria-label="Subir categoria"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            updateSectionAt(sections, index, moveCategoryId(section, categoryId, 1))
                          )
                        }
                        disabled={saving}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                        aria-label="Descer categoria"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            updateSectionAt(sections, index, toggleCategoryId(section, categoryId))
                          )
                        }
                        disabled={saving}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                        aria-label="Remover categoria da seção"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">
              Nenhuma categoria selecionada. Marque abaixo as que devem aparecer.
            </p>
          )}

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-zinc-200 bg-white p-2">
            {categories.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500">
                Cadastre categorias em &quot;Atalhos da Início&quot;, mais abaixo, pra escolher aqui.
              </p>
            ) : (
              categories.map((category) => {
                const checked = (section.category_ids ?? []).includes(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() =>
                        onChange(updateSectionAt(sections, index, toggleCategoryId(section, category.id)))
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-[#6B705C] focus:ring-[#6B705C]/30"
                    />
                    <span className="min-w-0 flex-1 text-sm text-zinc-700">
                      {category.name || "Sem nome"}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardSectionsEditor({
  sections,
  onChange,
  products,
  categories,
  onCreateCategory,
  saving,
  onSave,
}: DashboardSectionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addSection = (kind: DashboardSectionKind) => {
    onChange([...sections, createDashboardSection(kind)]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    onChange(sections.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const editingSection = editingIndex != null ? sections[editingIndex] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#6B705C]/15 bg-[#fafaf8] p-3 text-xs leading-relaxed text-zinc-600">
        <p>
          Monte a home do app em blocos. Arraste pra reordenar; clique num bloco pra editar. Cada bloco
          pode listar produtos automaticamente (por regra) ou com uma lista escolhida por você.
        </p>
      </div>

      <ul className="space-y-1.5">
        {sections.map((section, index) => {
          const Icon = KIND_ICONS[section.kind];
          return (
            <li
              key={section.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null && dragIndex !== index) {
                  onChange(reorderSection(sections, dragIndex, index));
                }
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 pr-1.5 pl-2 shadow-sm transition-opacity ${
                dragIndex === index ? "opacity-40" : ""
              }`}
            >
              <span className="cursor-grab text-zinc-300 active:cursor-grabbing" aria-hidden>
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={() => setEditingIndex(index)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left hover:bg-zinc-50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#6B705C]/10">
                  <Icon className="h-3.5 w-3.5 text-[#6B705C]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                  {section.title || KIND_LABELS[section.kind]}
                </span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  {KIND_LABELS[section.kind]}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onChange(moveSection(sections, index, -1))}
                  disabled={index === 0 || saving}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  aria-label="Subir seção"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(moveSection(sections, index, 1))}
                  disabled={index === sections.length - 1 || saving}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                  aria-label="Descer seção"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  disabled={sections.length <= 1 || saving}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-30"
                  aria-label="Remover seção"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addSection("products")}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Nova seção de produtos
        </button>
        <button
          type="button"
          onClick={() => addSection("categories")}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Categorias (Explore)
        </button>
        <button
          type="button"
          onClick={() => addSection("category_highlight")}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Destaque de categoria
        </button>
        <button
          type="button"
          onClick={() => addSection("testimonials")}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Depoimentos
        </button>
        <button
          type="button"
          onClick={() => addSection("whatsapp")}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Banner WhatsApp
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#6B705C" }}
      >
        {saving ? (
          <>
            <Spinner className="size-4 text-white" />
            Salvando…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Salvar seções
          </>
        )}
      </button>

      <Dialog open={editingSection != null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle className="text-sm font-medium text-zinc-800">
            {editingSection ? KIND_LABELS[editingSection.kind] : "Editar bloco"}
          </DialogTitle>
          {editingSection && editingIndex != null ? (
            <SectionEditForm
              section={editingSection}
              index={editingIndex}
              sections={sections}
              products={products}
              categories={categories}
              onCreateCategory={onCreateCategory}
              saving={saving}
              onChange={onChange}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
