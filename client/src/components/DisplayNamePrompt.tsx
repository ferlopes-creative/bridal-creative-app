import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";

type DisplayNamePromptProps = {
  open: boolean;
  onSaved: (name: string) => void;
};

/** Pede o nome de exibição na primeira entrada e guarda em user_metadata.display_name. */
export default function DisplayNamePrompt({ open, onSaved }: DisplayNamePromptProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar nome:", error);
      return;
    }
    onSaved(trimmed);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-[min(100%-2rem,22rem)] gap-0 rounded-2xl border border-bc-primary/15 bg-white p-6"
      >
        <DialogTitle
          className="text-lg text-bc-primary"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          Como podemos te chamar?
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-sm text-zinc-500">
          Esse nome aparece no seu perfil e nas suas publicações no Chat.
        </DialogDescription>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
          placeholder="Seu nome"
          autoFocus
          disabled={saving}
          className="mt-4 h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-bc-primary/25"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !name.trim()}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-bc-primary text-sm text-white disabled:opacity-60"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {saving ? (
            <>
              <Spinner className="size-4 text-white" />
              Salvando...
            </>
          ) : (
            "Continuar"
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
