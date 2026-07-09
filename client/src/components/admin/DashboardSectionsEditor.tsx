import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
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

type DashboardSectionsEditorProps = {
  sections: DashboardSectionConfig[];
  onChange: (sections: DashboardSectionConfig[]) => void;
  products: ProductOption[];
  saving: boolean;
  onSave: () => void;
};

const AUTO_RULES: DashboardSectionAutoRule[] = [
  "purchased",
  "unpurchased",
  "bonus",
  "all_visible",
];

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

export default function DashboardSectionsEditor({
  sections,
  onChange,
  products,
  saving,
  onSave,
}: DashboardSectionsEditorProps) {
  const addSection = (kind: DashboardSectionKind) => {
    onChange([...sections, createDashboardSection(kind)]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    onChange(sections.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#6B705C]/15 bg-[#fafaf8] p-4 text-sm leading-relaxed text-zinc-600">
        <p>
          Monte a home do app em blocos. Cada bloco pode listar produtos automaticamente (por regra) ou
          com uma lista escolhida por você. O título é o que a cliente vê na tela.
        </p>
      </div>

      <ul className="space-y-3">
        {sections.map((section, index) => {
          const selectedProducts = (section.product_ids ?? [])
            .map((id) => products.find((product) => product.id === id))
            .filter((product): product is ProductOption => product != null);

          return (
            <li
              key={section.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6B705C]/10 text-sm font-semibold text-[#6B705C]">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Título na home
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          onChange(updateSectionAt(sections, index, { title: e.target.value }))
                        }
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
                          if (kind === "whatsapp") {
                            onChange(
                              updateSectionAt(sections, index, {
                                kind: "whatsapp",
                                mode: "manual",
                                auto_rule: undefined,
                                product_ids: undefined,
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
                            })
                          );
                        }}
                        disabled={saving}
                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                      >
                        <option value="products">Lista de produtos</option>
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
                                auto_rule:
                                  mode === "automatic"
                                    ? section.auto_rule ?? "all_visible"
                                    : undefined,
                                product_ids:
                                  mode === "manual" ? section.product_ids ?? [] : undefined,
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
                    ) : (
                      <div className="flex items-end">
                        <p className="text-xs leading-relaxed text-zinc-500">
                          Usa o link do WhatsApp configurado em Aparência do app. O texto do botão
                          continua “Chame nossa equipe”.
                        </p>
                      </div>
                    )}
                  </div>

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
                                  <span className="ml-1.5 text-[10px] uppercase text-zinc-400">
                                    Bônus
                                  </span>
                                ) : null}
                              </span>
                              <div className="flex shrink-0 gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onChange(
                                      updateSectionAt(
                                        sections,
                                        index,
                                        moveProductId(section, product.id, -1)
                                      )
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
                                      updateSectionAt(
                                        sections,
                                        index,
                                        moveProductId(section, product.id, 1)
                                      )
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
                                      updateSectionAt(
                                        sections,
                                        index,
                                        toggleProductId(section, product.id)
                                      )
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
                                    onChange(
                                      updateSectionAt(
                                        sections,
                                        index,
                                        toggleProductId(section, product.id)
                                      )
                                    )
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
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(moveSection(sections, index, -1))}
                    disabled={index === 0 || saving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Subir seção"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveSection(sections, index, 1))}
                    disabled={index === sections.length - 1 || saving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Descer seção"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    disabled={sections.length <= 1 || saving}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Remover seção"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
    </div>
  );
}
