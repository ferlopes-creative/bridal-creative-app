import { useState } from "react";
import { ChevronDown, ChevronUp, Crop, Film, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createProductLesson, createProductModule, type ProductLesson, type ProductModule } from "@/lib/productModules";

type ProductModulesEditorProps = {
  modules: ProductModule[];
  onChange: (modules: ProductModule[]) => void;
  disabled: boolean;
  onUploadImage: (file: File) => Promise<string>;
  onUploadVideo: (file: File) => Promise<string>;
  /** Abre o corte quadrado antes de subir uma capa nova; cancelar segue com o arquivo original. */
  onCropImage?: (file: File) => Promise<File>;
  /** Abre o corte quadrado numa capa já salva e substitui pela URL cortada. */
  onCropSavedUrl?: (url: string, replace: (newUrl: string) => void) => void;
};

function updateAt<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function moveAt<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const inputClass =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60";

function LessonRow({
  lesson,
  index,
  total,
  disabled,
  onUploadImage,
  onUploadVideo,
  onCropImage,
  onCropSavedUrl,
  onUpdate,
  onMove,
  onRemove,
}: {
  lesson: ProductLesson;
  index: number;
  total: number;
  disabled: boolean;
  onUploadImage: (file: File) => Promise<string>;
  onUploadVideo: (file: File) => Promise<string>;
  onCropImage?: (file: File) => Promise<File>;
  onCropSavedUrl?: (url: string, replace: (newUrl: string) => void) => void;
  onUpdate: (patch: Partial<ProductLesson>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <label className="group relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
            {lesson.cover_url ? (
              <img src={lesson.cover_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4 text-zinc-400" />
            )}
            {uploadingCover ? (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Spinner className="size-3.5 text-[#6B705C]" />
              </span>
            ) : null}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploadingCover}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploadingCover(true);
                try {
                  const toUpload = onCropImage ? await onCropImage(file) : file;
                  onUpdate({ cover_url: await onUploadImage(toUpload) });
                } finally {
                  setUploadingCover(false);
                }
              }}
            />
          </label>
          {lesson.cover_url && onCropSavedUrl ? (
            <button
              type="button"
              onClick={() =>
                onCropSavedUrl(lesson.cover_url!, (newUrl) => onUpdate({ cover_url: newUrl }))
              }
              disabled={disabled}
              title="Cortar"
              className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              <Crop className="h-2.5 w-2.5" />
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            value={lesson.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Título da aula"
            disabled={disabled}
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <label
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 ${disabled ? "opacity-50" : "cursor-pointer"}`}
            >
              {uploadingVideo ? <Spinner className="size-3.5" /> : <Film className="h-3.5 w-3.5" />}
              {lesson.video_url ? "Trocar vídeo" : "Enviar vídeo"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={disabled || uploadingVideo}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploadingVideo(true);
                  try {
                    onUpdate({ video_url: await onUploadVideo(file) });
                  } finally {
                    setUploadingVideo(false);
                  }
                }}
              />
            </label>
            {lesson.video_url ? (
              <span className="truncate text-xs text-zinc-500">Vídeo salvo</span>
            ) : (
              <span className="text-xs text-zinc-400">Nenhum vídeo ainda</span>
            )}
          </div>
          <textarea
            value={lesson.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
            placeholder="Descrição da aula (opcional)"
            disabled={disabled}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
          />
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0 || disabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            aria-label="Subir aula"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1 || disabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            aria-label="Descer aula"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
            aria-label="Remover aula"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Aulas gravadas organizadas em módulos (trilhas estilo Netflix na página do produto, pós-compra). */
export default function ProductModulesEditor({
  modules,
  onChange,
  disabled,
  onUploadImage,
  onUploadVideo,
  onCropImage,
  onCropSavedUrl,
}: ProductModulesEditorProps) {
  const [uploadingModuleCoverId, setUploadingModuleCoverId] = useState<string | null>(null);

  const addModule = () => onChange([...modules, createProductModule()]);
  const removeModule = (index: number) => onChange(modules.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {modules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
          Nenhum módulo cadastrado ainda.
        </p>
      ) : (
        <ul className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <li key={module.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
                    {module.cover_url ? (
                      <img src={module.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-zinc-400" />
                    )}
                    {uploadingModuleCoverId === module.id ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Spinner className="size-4 text-[#6B705C]" />
                      </span>
                    ) : null}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled || uploadingModuleCoverId === module.id}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setUploadingModuleCoverId(module.id);
                        try {
                          const toUpload = onCropImage ? await onCropImage(file) : file;
                          const url = await onUploadImage(toUpload);
                          onChange(updateAt(modules, moduleIndex, { cover_url: url }));
                        } finally {
                          setUploadingModuleCoverId(null);
                        }
                      }}
                    />
                  </label>
                  {module.cover_url && onCropSavedUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        onCropSavedUrl(module.cover_url!, (newUrl) =>
                          onChange(updateAt(modules, moduleIndex, { cover_url: newUrl }))
                        )
                      }
                      disabled={disabled}
                      title="Cortar"
                      className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <Crop className="h-2.5 w-2.5" />
                    </button>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    type="text"
                    value={module.title}
                    onChange={(e) => onChange(updateAt(modules, moduleIndex, { title: e.target.value }))}
                    placeholder={`Módulo ${moduleIndex + 1} — título`}
                    disabled={disabled}
                    className={`${inputClass} font-medium`}
                  />
                  <p className="text-xs text-zinc-500">
                    {module.lessons.length === 0
                      ? "Sem aulas ainda"
                      : `${module.lessons.length} ${module.lessons.length === 1 ? "aula" : "aulas"}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onChange(moveAt(modules, moduleIndex, -1))}
                    disabled={moduleIndex === 0 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Subir módulo"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(moveAt(modules, moduleIndex, 1))}
                    disabled={moduleIndex === modules.length - 1 || disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                    aria-label="Descer módulo"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeModule(moduleIndex)}
                    disabled={disabled}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Remover módulo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
                {module.lessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={lessonIndex}
                    total={module.lessons.length}
                    disabled={disabled}
                    onUploadImage={onUploadImage}
                    onUploadVideo={onUploadVideo}
                    onCropImage={onCropImage}
                    onCropSavedUrl={onCropSavedUrl}
                    onUpdate={(patch) =>
                      onChange(
                        updateAt(modules, moduleIndex, {
                          lessons: updateAt(module.lessons, lessonIndex, patch),
                        })
                      )
                    }
                    onMove={(direction) =>
                      onChange(
                        updateAt(modules, moduleIndex, {
                          lessons: moveAt(module.lessons, lessonIndex, direction),
                        })
                      )
                    }
                    onRemove={() =>
                      onChange(
                        updateAt(modules, moduleIndex, {
                          lessons: module.lessons.filter((_, i) => i !== lessonIndex),
                        })
                      )
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      updateAt(modules, moduleIndex, {
                        lessons: [...module.lessons, createProductLesson()],
                      })
                    )
                  }
                  disabled={disabled}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova aula
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addModule}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Novo módulo
      </button>
    </div>
  );
}
