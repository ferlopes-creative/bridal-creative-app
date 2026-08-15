import { ChevronDown, ChevronUp, Crop, Film, Trash2 } from "lucide-react";

function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type MediaGalleryEditorProps = {
  label: string;
  description?: string;
  accept: string;
  kind: "image" | "video";
  savedUrls: string[];
  onSavedUrlsChange: (urls: string[]) => void;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  disabled?: boolean;
  /** Só pra kind "image": abre o corte quadrado pra um item já salvo (por índice). */
  onCropSaved?: (index: number) => void;
  /** Só pra kind "image": abre o corte quadrado pra um item ainda não enviado (por índice). */
  onCropPending?: (index: number) => void;
};

export default function MediaGalleryEditor({
  label,
  description,
  accept,
  kind,
  savedUrls,
  onSavedUrlsChange,
  pendingFiles,
  onPendingFilesChange,
  disabled,
  onCropSaved,
  onCropPending,
}: MediaGalleryEditorProps) {
  return (
    <div className="space-y-2 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
      <div>
        <label className="text-sm text-zinc-700">{label}</label>
        {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
      </div>
      <input
        type="file"
        accept={accept}
        multiple
        onChange={(e) => {
          const next = Array.from(e.target.files ?? []);
          if (next.length) onPendingFilesChange([...pendingFiles, ...next]);
          e.target.value = "";
        }}
        className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
        disabled={disabled}
      />

      {savedUrls.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          {savedUrls.map((url, i) => (
            <li key={`${url}-${i}`} className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5">
              {kind === "image" ? (
                <img src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-500">
                  <Film className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-zinc-600" title={url}>
                {url.slice(0, 60)}
                {url.length > 60 ? "…" : ""}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {kind === "image" && onCropSaved ? (
                  <button
                    type="button"
                    onClick={() => onCropSaved(i)}
                    disabled={disabled}
                    title="Cortar"
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                  >
                    <Crop className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSavedUrlsChange(moveAt(savedUrls, i, -1))}
                  disabled={disabled || i === 0}
                  title="Mover pra cima"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSavedUrlsChange(moveAt(savedUrls, i, 1))}
                  disabled={disabled || i === savedUrls.length - 1}
                  title="Mover pra baixo"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSavedUrlsChange(savedUrls.filter((_, idx) => idx !== i))}
                  disabled={disabled}
                  title="Remover"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-1.5 text-xs">
          <li className="text-zinc-500">A enviar ao salvar:</li>
          {pendingFiles.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50/80 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-700">{file.name}</span>
              <div className="flex shrink-0 items-center gap-0.5">
                {kind === "image" && onCropPending ? (
                  <button
                    type="button"
                    onClick={() => onCropPending(i)}
                    disabled={disabled}
                    title="Cortar"
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                  >
                    <Crop className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onPendingFilesChange(moveAt(pendingFiles, i, -1))}
                  disabled={disabled || i === 0}
                  title="Mover pra cima"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPendingFilesChange(moveAt(pendingFiles, i, 1))}
                  disabled={disabled || i === pendingFiles.length - 1}
                  title="Mover pra baixo"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPendingFilesChange(pendingFiles.filter((_, idx) => idx !== i))}
                  disabled={disabled}
                  title="Remover"
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
