import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { ImagePlus } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  id?: string;
  /** Se informado, habilita o botão de inserir imagem no corpo do texto. */
  onUploadImage?: (file: File) => Promise<string>;
};

export default function AdminRichTextEditor({ value, onChange, disabled, id, onUploadImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ HTMLAttributes: { class: "rounded-md" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value ?? "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "tiptap-input min-h-[140px] px-3 py-2 text-sm text-zinc-800 outline-none focus:outline-none",
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

  const btnClass = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${active ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`;

  return (
    <div className="tiptap-admin-scope overflow-hidden rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
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
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
