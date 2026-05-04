import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  id?: string;
};

export default function AdminRichTextEditor({ value, onChange, disabled, id }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
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

  return (
    <div className="tiptap-admin-scope overflow-hidden rounded-md border border-zinc-200 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-zinc-100 bg-zinc-50/80 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`rounded px-2 py-1 text-xs font-semibold ${editor.isActive("bold") ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`rounded px-2 py-1 text-xs italic ${editor.isActive("italic") ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`rounded px-2 py-1 text-xs ${editor.isActive("heading", { level: 2 }) ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`rounded px-2 py-1 text-xs ${editor.isActive("bulletList") ? "bg-[#6B705C]/20 text-[#6B705C]" : "text-zinc-600 hover:bg-zinc-100"}`}
        >
          Lista
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
