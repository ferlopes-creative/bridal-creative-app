import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createFaqItem, type ProductFaqItem } from "@/lib/productFaq";

type ProductFaqEditorProps = {
  items: ProductFaqItem[];
  onChange: (items: ProductFaqItem[]) => void;
  disabled: boolean;
};

function updateItemAt(items: ProductFaqItem[], index: number, patch: Partial<ProductFaqItem>): ProductFaqItem[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function moveItem(items: ProductFaqItem[], index: number, direction: -1 | 1): ProductFaqItem[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Perguntas frequentes do produto — vira accordion (abre/fecha) na página do produto. */
export default function ProductFaqEditor({ items, onChange, disabled }: ProductFaqEditorProps) {
  const addItem = () => onChange([...items, createFaqItem()]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Nenhuma pergunta cadastrada ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Pergunta
                    </label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => onChange(updateItemAt(items, index, { question: e.target.value }))}
                      placeholder="Ex.: Preciso ter Canva Pro?"
                      disabled={disabled}
                      className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Resposta
                    </label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => onChange(updateItemAt(items, index, { answer: e.target.value }))}
                      rows={2}
                      placeholder="Resposta objetiva..."
                      disabled={disabled}
                      className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(moveItem(items, index, -1))}
                    disabled={index === 0 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Subir pergunta"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveItem(items, index, 1))}
                    disabled={index === items.length - 1 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Descer pergunta"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Remover pergunta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Nova pergunta
      </button>
    </div>
  );
}
