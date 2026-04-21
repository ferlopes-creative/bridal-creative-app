import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PageLoadingProps = {
  label?: string;
  className?: string;
};

/** Bloco central com spinner — telas cheias ou seções grandes. */
export function PageLoading({ label = "Carregando...", className = "" }: PageLoadingProps) {
  return (
    <div
      className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="size-10 text-[#6B705C]" />
      <p className="text-sm text-[#6B705C]">{label}</p>
    </div>
  );
}
