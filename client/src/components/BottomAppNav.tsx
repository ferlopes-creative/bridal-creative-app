import { Home, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function BottomAppNav() {
  const [location, setLocation] = useLocation();
  const onDashboard =
    location === "/dashboard" || location.startsWith("/dashboard/");
  const onCommunity = location.startsWith("/community");

  const baseBtn =
    "relative flex flex-1 max-w-[140px] flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const active = "bg-white/15 text-white shadow-inner";
  const inactive = "text-white/85 hover:bg-white/10 hover:text-white";

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#6B705C]/98 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(53,58,46,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-[#6B705C]/92"
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-center gap-3 px-6 sm:gap-8">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className={`${baseBtn} ${onDashboard ? active : inactive}`}
          aria-current={onDashboard ? "page" : undefined}
          aria-label="Início"
        >
          <Home className={`h-7 w-7 ${onDashboard ? "opacity-100" : "opacity-90"}`} strokeWidth={onDashboard ? 2.25 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em]">Início</span>
        </button>
        <button
          type="button"
          onClick={() => setLocation("/community")}
          className={`${baseBtn} ${onCommunity ? active : inactive}`}
          aria-current={onCommunity ? "page" : undefined}
          aria-label="Comunidade"
        >
          <MessageCircle className={`h-7 w-7 ${onCommunity ? "opacity-100" : "opacity-90"}`} strokeWidth={onCommunity ? 2.25 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em]">Chat</span>
        </button>
      </div>
    </nav>
  );
}
