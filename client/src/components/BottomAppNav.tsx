import { useLocation } from "wouter";
import { Calendar, Home, ShoppingBag, User } from "lucide-react";

export default function BottomAppNav() {
  const [location, setLocation] = useLocation();
  const onOwnedProducts = location.startsWith("/dashboard/meus-produtos");
  const onDashboard =
    !onOwnedProducts && (location === "/dashboard" || location.startsWith("/dashboard/"));
  const onPlanning = location.startsWith("/planejamento");
  const onProfile = location === "/profile";

  const iconClass = "h-[18px] w-[18px] shrink-0";
  const strokeActive = 1.35;
  const strokeInactive = 1.2;

  const baseBtn =
    "relative flex flex-1 max-w-[108px] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const active = "bg-white/12 text-white shadow-inner";
  const inactive = "text-white/80 hover:bg-white/8 hover:text-white";

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-[210] border-t border-white/10 bg-bc-primary/96 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_24px_rgba(53,58,46,0.18)] backdrop-blur-md supports-[backdrop-filter]:bg-bc-primary/90"
    >
      <div className="mx-auto flex min-h-12 max-w-lg items-center justify-center gap-2 px-4 sm:gap-5 sm:px-6">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className={`${baseBtn} ${onDashboard ? active : inactive}`}
          aria-current={onDashboard ? "page" : undefined}
          aria-label="Início"
        >
          <Home
            className={`${iconClass} ${onDashboard ? "opacity-100" : "opacity-90"}`}
            strokeWidth={onDashboard ? strokeActive : strokeInactive}
          />
          <span className="text-[9px] font-normal uppercase tracking-[0.14em] text-white/95">Início</span>
        </button>
        <button
          type="button"
          onClick={() => setLocation("/dashboard/meus-produtos")}
          className={`${baseBtn} ${onOwnedProducts ? active : inactive}`}
          aria-current={onOwnedProducts ? "page" : undefined}
          aria-label="Meus produtos"
        >
          <ShoppingBag
            className={`${iconClass} ${onOwnedProducts ? "opacity-100" : "opacity-90"}`}
            strokeWidth={onOwnedProducts ? strokeActive : strokeInactive}
          />
          <span className="text-[9px] font-normal uppercase tracking-[0.14em] text-white/95">Meus produtos</span>
        </button>
        <button
          type="button"
          onClick={() => setLocation("/planejamento")}
          className={`${baseBtn} ${onPlanning ? active : inactive}`}
          aria-current={onPlanning ? "page" : undefined}
          aria-label="Planejamento"
        >
          <Calendar
            className={`${iconClass} ${onPlanning ? "opacity-100" : "opacity-90"}`}
            strokeWidth={onPlanning ? strokeActive : strokeInactive}
          />
          <span className="text-[9px] font-normal uppercase tracking-[0.14em] text-white/95">Planejamento</span>
        </button>
        <button
          type="button"
          onClick={() => setLocation("/profile")}
          className={`${baseBtn} ${onProfile ? active : inactive}`}
          aria-current={onProfile ? "page" : undefined}
          aria-label="Perfil"
        >
          <User
            className={`${iconClass} ${onProfile ? "opacity-100" : "opacity-90"}`}
            strokeWidth={onProfile ? strokeActive : strokeInactive}
          />
          <span className="text-[9px] font-normal uppercase tracking-[0.14em] text-white/95">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
