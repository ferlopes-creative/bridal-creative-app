import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Maximize2, X } from "lucide-react";
import AdminRichTextEditor from "@/components/AdminRichTextEditor";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const PURIFY = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "span", "h1", "h2", "h3",
    "img", "label", "input", "div",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "class", "src", "alt", "type", "checked", "data-type", "data-checked",
    "style", "width", "data-frame",
  ],
};

function sanitize(html: string) {
  return DOMPurify.sanitize(html || "", PURIFY);
}

const PREVIEW_CLASS =
  "product-html w-full min-w-0 max-w-full text-xs leading-[1.7] text-[#4a4a44] [&_a]:text-[#5a6349] [&_a]:underline [&_h1]:mb-2 [&_h1]:text-base [&_h1]:text-bc-primary [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:text-bc-primary [&_h3]:text-xs [&_h3]:text-bc-primary [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_img]:my-3 [&_img]:w-full [&_img]:object-cover [&_ul[data-type=taskList]]:my-2 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:my-1 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2 [&_input[type=checkbox]]:mt-0.5 [&_input[type=checkbox]]:pointer-events-none [&_li[data-type=taskItem]_div]:min-w-0 [&_li[data-type=taskItem]_p]:mb-0";

type CollapsedRichTextFieldProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
};

/** Mostra o texto fechado (prévia igual à página do produto) com botão "Editar" que
 * abre o editor completo lado a lado com a mesma prévia ao vivo — pra ver exatamente
 * como a cliente vai ver, sem precisar salvar e abrir a página do produto pra conferir. */
export default function CollapsedRichTextField({
  label,
  description,
  value,
  onChange,
  disabled,
  onUploadImage,
}: CollapsedRichTextFieldProps) {
  const [open, setOpen] = useState(false);
  const safeHtml = sanitize(value);
  const isEmpty = !value || safeHtml.replace(/<[^>]+>/g, "").trim().length === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-zinc-700">{label}</label>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Editar texto
        </button>
      </div>
      {description ? <p className="text-xs text-zinc-500">{description}</p> : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="block w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#6B705C]/40 disabled:opacity-50"
      >
        {isEmpty ? (
          <span className="text-xs italic text-zinc-400">Vazio — clique pra escrever.</span>
        ) : (
          <div className={`${PREVIEW_CLASS} line-clamp-4`} dangerouslySetInnerHTML={{ __html: safeHtml }} />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[90vh] w-[min(96vw,1100px)] max-w-none flex-col overflow-hidden p-0 sm:rounded-xl"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
            <DialogTitle className="text-base font-medium text-zinc-800">{label}</DialogTitle>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-zinc-200 overflow-y-auto md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="space-y-2 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">Editar</p>
              <AdminRichTextEditor
                value={value}
                onChange={onChange}
                disabled={disabled}
                onUploadImage={onUploadImage}
              />
            </div>
            <div className="space-y-2 bg-[#faf9f6] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Como a cliente vê
              </p>
              {isEmpty ? (
                <p className="text-xs italic text-zinc-400">Sem conteúdo ainda.</p>
              ) : (
                <div className={PREVIEW_CLASS} style={{ fontFamily: "var(--font-body)" }} dangerouslySetInnerHTML={{ __html: safeHtml }} />
              )}
            </div>
          </div>

          <div className="flex justify-end border-t border-zinc-200 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white"
              style={{ backgroundColor: "#6B705C" }}
            >
              Concluído
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
