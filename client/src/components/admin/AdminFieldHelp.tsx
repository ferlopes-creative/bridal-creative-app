import { type ReactNode } from "react";
import { CircleHelp, X } from "lucide-react";

type AdminFieldHelpButtonProps = {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AdminFieldHelpButton({ label, open, onOpenChange }: AdminFieldHelpButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
        open
          ? "bg-[#6B705C]/12 text-[#6B705C]"
          : "text-zinc-400 hover:bg-zinc-100 hover:text-[#6B705C]"
      }`}
      aria-label={label}
      aria-expanded={open}
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  );
}

type AdminFieldHelpPanelProps = {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function AdminFieldHelpPanel({
  label,
  open,
  onOpenChange,
  children,
}: AdminFieldHelpPanelProps) {
  if (!open) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 shadow-sm">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug text-zinc-800">{label}</p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200/80 hover:text-zinc-600"
          aria-label="Fechar ajuda"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-xs leading-relaxed text-zinc-600">{children}</div>
    </div>
  );
}
