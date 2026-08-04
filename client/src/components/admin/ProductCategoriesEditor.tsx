import { ChevronDown, ChevronUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { createProductCategory, type ProductCategoryConfig } from "@/lib/productCategories";

type ProductOption = {
  id: string;
  name: string | null;
  type?: string | null;
};

type ProductCategoriesEditorProps = {
  categories: ProductCategoryConfig[];
  onChange: (categories: ProductCategoryConfig[]) => void;
  products: ProductOption[];
  saving: boolean;
  onSave: () => void;
  onUploadPhoto: (file: File) => Promise<string>;
};

function updateCategoryAt(
  categories: ProductCategoryConfig[],
  index: number,
  patch: Partial<ProductCategoryConfig>
): ProductCategoryConfig[] {
  return categories.map((category, i) => (i === index ? { ...category, ...patch } : category));
}

function moveCategory(
  categories: ProductCategoryConfig[],
  index: number,
  direction: -1 | 1
): ProductCategoryConfig[] {
  const target = index + direction;
  if (target < 0 || target >= categories.length) return categories;
  const next = [...categories];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function toggleProductId(
  category: ProductCategoryConfig,
  productId: string
): ProductCategoryConfig {
  const current = category.product_ids;
  const exists = current.includes(productId);
  const product_ids = exists
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  return { ...category, product_ids };
}

export default function ProductCategoriesEditor({
  categories,
  onChange,
  products,
  saving,
  onSave,
  onUploadPhoto,
}: ProductCategoriesEditorProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const addCategory = () => {
    onChange([...categories, createProductCategory()]);
  };

  const removeCategory = (index: number) => {
    onChange(categories.filter((_, i) => i !== index));
  };

  const handlePhotoChange = async (index: number, category: ProductCategoryConfig, file: File) => {
    setUploadingId(category.id);
    try {
      const url = await onUploadPhoto(file);
      onChange(updateCategoryAt(categories, index, { photo_url: url }));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#6B705C]/15 bg-[#fafaf8] p-4 text-sm leading-relaxed text-zinc-600">
        <p>
          Atalhos circulares que aparecem logo abaixo de &quot;Meus produtos&quot; na Início. Ao tocar
          num atalho, a cliente vê só os produtos marcados aqui.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Nenhum atalho criado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {categories.map((category, index) => {
            const selectedProducts = category.product_ids
              .map((id) => products.find((product) => product.id === id))
              .filter((product): product is ProductOption => product != null);

            return (
              <li key={category.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
                      {category.photo_url ? (
                        <img
                          src={category.photo_url}
                          alt={category.name || "Atalho"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlus className="h-5 w-5 text-zinc-400" />
                      )}
                      {uploadingId === category.id ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                          <Spinner className="size-4 text-[#6B705C]" />
                        </span>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={saving || uploadingId === category.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handlePhotoChange(index, category, file);
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-zinc-400">Foto</span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Nome do atalho
                        </label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) =>
                            onChange(updateCategoryAt(categories, index, { name: e.target.value }))
                          }
                          placeholder="Ex.: Coleções"
                          disabled={saving}
                          className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={category.visible}
                        disabled={saving}
                        onChange={(e) =>
                          onChange(updateCategoryAt(categories, index, { visible: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-zinc-300 text-[#6B705C] focus:ring-[#6B705C]/30"
                      />
                      <span className="text-sm text-zinc-700">Visível na Início</span>
                    </label>

                    <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
                      <p className="text-xs font-medium text-zinc-700">
                        Produtos neste atalho ({selectedProducts.length})
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
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onChange(
                                    updateCategoryAt(
                                      categories,
                                      index,
                                      toggleProductId(category, product.id)
                                    )
                                  )
                                }
                                disabled={saving}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                                aria-label="Remover produto do atalho"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
                            const checked = category.product_ids.includes(product.id);
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
                                      updateCategoryAt(
                                        categories,
                                        index,
                                        toggleProductId(category, product.id)
                                      )
                                    )
                                  }
                                  className="h-4 w-4 rounded border-zinc-300 text-[#6B705C] focus:ring-[#6B705C]/30"
                                />
                                <span className="min-w-0 flex-1 text-sm text-zinc-700">
                                  {product.name || "Sem nome"}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onChange(moveCategory(categories, index, -1))}
                      disabled={index === 0 || saving}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                      aria-label="Subir atalho"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(moveCategory(categories, index, 1))}
                      disabled={index === categories.length - 1 || saving}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                      aria-label="Descer atalho"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      disabled={saving}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                      aria-label="Remover atalho"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addCategory}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Novo atalho
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
            Salvar atalhos
          </>
        )}
      </button>
    </div>
  );
}
