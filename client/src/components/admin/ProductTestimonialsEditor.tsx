import { ChevronDown, ChevronUp, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { createTestimonial, type TestimonialConfig } from "@/lib/testimonials";

type ProductTestimonialsEditorProps = {
  testimonials: TestimonialConfig[];
  onChange: (testimonials: TestimonialConfig[]) => void;
  disabled: boolean;
  onUploadPhoto: (file: File) => Promise<string>;
};

function updateTestimonialAt(
  testimonials: TestimonialConfig[],
  index: number,
  patch: Partial<TestimonialConfig>
): TestimonialConfig[] {
  return testimonials.map((testimonial, i) => (i === index ? { ...testimonial, ...patch } : testimonial));
}

function moveTestimonial(
  testimonials: TestimonialConfig[],
  index: number,
  direction: -1 | 1
): TestimonialConfig[] {
  const target = index + direction;
  if (target < 0 || target >= testimonials.length) return testimonials;
  const next = [...testimonials];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Depoimentos exclusivos de UM produto (diferente dos globais da Início). */
export default function ProductTestimonialsEditor({
  testimonials,
  onChange,
  disabled,
  onUploadPhoto,
}: ProductTestimonialsEditorProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const addTestimonial = () => onChange([...testimonials, createTestimonial()]);
  const removeTestimonial = (index: number) => onChange(testimonials.filter((_, i) => i !== index));

  const handlePhotoChange = async (index: number, testimonial: TestimonialConfig, file: File) => {
    setUploadingId(testimonial.id);
    try {
      const url = await onUploadPhoto(file);
      onChange(updateTestimonialAt(testimonials, index, { photo_url: url }));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {testimonials.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Nenhum depoimento cadastrado pra este produto ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {testimonials.map((testimonial, index) => (
            <li key={testimonial.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
                    {testimonial.photo_url ? (
                      <img
                        src={testimonial.photo_url}
                        alt={testimonial.author_name || "Depoimento"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-zinc-400" />
                    )}
                    {uploadingId === testimonial.id ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Spinner className="size-4 text-[#6B705C]" />
                      </span>
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled || uploadingId === testimonial.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void handlePhotoChange(index, testimonial, file);
                      }}
                    />
                  </label>
                  <span className="text-[10px] text-zinc-400">Foto</span>
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={testimonial.author_name}
                        onChange={(e) =>
                          onChange(updateTestimonialAt(testimonials, index, { author_name: e.target.value }))
                        }
                        placeholder="Ex.: Giulia"
                        disabled={disabled}
                        className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Data
                      </label>
                      <input
                        type="date"
                        value={testimonial.submitted_at}
                        onChange={(e) =>
                          onChange(updateTestimonialAt(testimonials, index, { submitted_at: e.target.value }))
                        }
                        disabled={disabled}
                        className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Nota
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          disabled={disabled}
                          onClick={() => onChange(updateTestimonialAt(testimonials, index, { rating: value }))}
                          className="disabled:opacity-40"
                          aria-label={`Nota ${value}`}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              value <= testimonial.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Depoimento
                    </label>
                    <textarea
                      value={testimonial.text}
                      onChange={(e) => onChange(updateTestimonialAt(testimonials, index, { text: e.target.value }))}
                      rows={3}
                      placeholder="Texto do depoimento..."
                      disabled={disabled}
                      className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={testimonial.visible}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(updateTestimonialAt(testimonials, index, { visible: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-[#6B705C] focus:ring-[#6B705C]/30"
                    />
                    <span className="text-sm text-zinc-700">Visível na página do produto</span>
                  </label>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(moveTestimonial(testimonials, index, -1))}
                    disabled={index === 0 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Subir depoimento"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveTestimonial(testimonials, index, 1))}
                    disabled={index === testimonials.length - 1 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Descer depoimento"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTestimonial(index)}
                    disabled={disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Remover depoimento"
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
        onClick={addTestimonial}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Novo depoimento
      </button>
    </div>
  );
}
