import { useEffect, useRef, useState } from "react";
import { Mark, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { ImagePlus, Smile, Square, Upload } from "lucide-react";
import type { CustomFont } from "@/lib/customFonts";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  id?: string;
  /** Se informado, habilita o botão de inserir imagem no corpo do texto. */
  onUploadImage?: (file: File) => Promise<string>;
  /** Fontes personalizadas já cadastradas (arquivo enviado), disponíveis pra escolher. */
  customFonts?: CustomFont[];
  /** Se informado, habilita o botão de enviar um arquivo de fonte (.woff2, .woff, .ttf, .otf). */
  onUploadFont?: (file: File) => Promise<CustomFont>;
};

const CURATED_ICONS = [
  "✓", "✨", "💍", "💌", "🌸", "🥂", "🎉", "📌",
  "❤", "👰", "🤍", "🕊", "🌿", "⭐", "📷", "🎀",
];

const FONT_FAMILIES = [
  { label: "Montserrat (padrão)", value: "" },
  { label: "Cinzel", value: "Cinzel" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "IBM Plex Mono", value: "IBM Plex Mono" },
  { label: "Georgia", value: "Georgia" },
  { label: "Arial", value: "Arial" },
];

const FONT_SIZES = [
  { label: "Tamanho padrão", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
];

const IMAGE_SIZES = ["25%", "50%", "75%", "100%"];

/** Extensão de imagem com atributo "width" (renderiza como width + style),
 * pra dar pra redimensionar imagens inseridas no meio do texto. */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("width"),
        renderHTML: (attributes: { width?: string | null }) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}` };
        },
      },
    };
  },
});

/** Moldura fina e reta ao redor do texto selecionado (span com borda). */
const TextFrame = Mark.create({
  name: "textFrame",
  parseHTML() {
    return [{ tag: "span[data-frame]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-frame": "true" }), 0];
  },
});

export default function AdminRichTextEditor({
  value,
  onChange,
  disabled,
  id,
  onUploadImage,
  customFonts,
  onUploadFont,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fontFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFont, setUploadingFont] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      ResizableImage.configure({ HTMLAttributes: { class: "rounded-md" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      FontFamily,
      TextFrame,
    ],
    content: value ?? "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "tiptap-input min-h-[45vh] px-3 py-2 text-sm text-zinc-800 outline-none focus:outline-none",
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const cur = editor.getHTML();
    const next = value || "";
    if (next !== cur) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="min-h-[140px] rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        Carregando editor…
      </div>
    );
  }

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertIcon = (icon: string) => {
    editor.chain().focus().insertContent(`${icon} `).run();
    setShowIconPicker(false);
  };

  const handleImageFile = async (file: File) => {
    if (!onUploadImage) return;
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFontFile = async (file: File) => {
    if (!onUploadFont) return;
    setUploadingFont(true);
    try {
      const font = await onUploadFont(file);
      setFontFamily(font.name);
    } finally {
      setUploadingFont(false);
    }
  };

  const setFontFamily = (value: string) => {
    if (value) editor.chain().focus().setFontFamily(value).run();
    else editor.chain().focus().unsetFontFamily().run();
  };

  const setFontSize = (value: string) => {
    editor.chain().focus().setMark("textStyle", { fontSize: value || null }).run();
  };

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${active ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`;

  const selectClass =
    "h-7 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-600 outline-none focus:border-[#6B705C]/50";

  const isImageSelected = editor.isActive("image");
  const textStyleAttrs = editor.getAttributes("textStyle");
  const currentFontFamily: string = textStyleAttrs.fontFamily || "";
  const currentFontSize: string = textStyleAttrs.fontSize || "";

  return (
    <div className="tiptap-admin-scope overflow-hidden rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`${btnClass(editor.isActive("bold"))} font-semibold`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`${btnClass(editor.isActive("italic"))} italic`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          className={`${btnClass(editor.isActive("underline"))} underline`}
        >
          U
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={btnClass(editor.isActive("heading", { level: 2 }))}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleMark("textFrame").run()}
          disabled={disabled}
          title="Moldura fina ao redor do texto selecionado"
          className={`${btnClass(editor.isActive("textFrame"))} inline-flex items-center gap-1`}
        >
          <Square className="h-3 w-3" />
          Moldura
        </button>
        <span className="mx-0.5 my-1 w-px bg-zinc-200" aria-hidden />
        <select
          value={currentFontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          disabled={disabled}
          title="Fonte do texto selecionado"
          className={`${selectClass} w-36`}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
          {(customFonts ?? []).length > 0 && (
            <optgroup label="Suas fontes">
              {(customFonts ?? []).map((font) => (
                <option key={font.id} value={font.name}>
                  {font.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {onUploadFont && (
          <>
            <button
              type="button"
              onClick={() => fontFileInputRef.current?.click()}
              disabled={disabled || uploadingFont}
              title="Enviar arquivo de fonte (.woff2, .woff, .ttf, .otf)"
              className={`${btnClass(false)} inline-flex items-center gap-1`}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploadingFont ? "Enviando..." : "Enviar fonte"}
            </button>
            <input
              ref={fontFileInputRef}
              type="file"
              accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleFontFile(file);
              }}
            />
          </>
        )}
        <select
          value={currentFontSize}
          onChange={(e) => setFontSize(e.target.value)}
          disabled={disabled}
          title="Tamanho do texto selecionado"
          className={selectClass}
        >
          {FONT_SIZES.map((size) => (
            <option key={size.label} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          disabled={disabled}
          title="Cor da fonte"
          className="h-7 w-7 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
        />
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          disabled={disabled}
          className={btnClass(false)}
          title="Remover cor da fonte"
        >
          Padrão
        </button>
        <span className="mx-0.5 my-1 w-px bg-zinc-200" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={btnClass(editor.isActive("bulletList"))}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={btnClass(editor.isActive("orderedList"))}
        >
          Numerada
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          disabled={disabled}
          className={btnClass(editor.isActive("taskList"))}
        >
          ☑ Checklist
        </button>
        <span className="mx-0.5 my-1 w-px bg-zinc-200" aria-hidden />
        <button
          type="button"
          onClick={handleSetLink}
          disabled={disabled}
          className={btnClass(editor.isActive("link"))}
        >
          Link
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowIconPicker((v) => !v)}
            disabled={disabled}
            className={`${btnClass(showIconPicker)} inline-flex items-center gap-1`}
          >
            <Smile className="h-3.5 w-3.5" />
            Ícone
          </button>
          {showIconPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowIconPicker(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 grid grid-cols-8 gap-0.5 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg">
                {CURATED_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => insertIcon(icon)}
                    className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-zinc-100"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {onUploadImage && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploadingImage}
              className={`${btnClass(false)} inline-flex items-center gap-1`}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploadingImage ? "Enviando..." : "Imagem"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImageFile(file);
              }}
            />
          </>
        )}
        {isImageSelected && (
          <>
            <span className="mx-0.5 my-1 w-px bg-zinc-200" aria-hidden />
            <span className="text-xs text-zinc-500">Tamanho da imagem:</span>
            {IMAGE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => editor.chain().focus().updateAttributes("image", { width: size }).run()}
                disabled={disabled}
                className={btnClass(editor.getAttributes("image").width === size)}
              >
                {size}
              </button>
            ))}
          </>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
