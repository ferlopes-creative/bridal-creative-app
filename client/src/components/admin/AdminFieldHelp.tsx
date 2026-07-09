import { type ReactNode, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AdminFieldHelpProps = {
  label: string;
  children: ReactNode;
};

export default function AdminFieldHelp({ label, children }: AdminFieldHelpProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-[#6B705C]"
              aria-label={label}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          Clique para ver o passo a passo
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="start"
        className="max-w-sm space-y-2 text-sm leading-relaxed text-zinc-700"
      >
        <p className="font-medium text-zinc-900">{label}</p>
        {children}
      </PopoverContent>
    </Popover>
  );
}
