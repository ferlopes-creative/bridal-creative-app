import { useEffect, useState } from "react";
import { Home, Lock, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { hasCommunityAccess } from "@/lib/communityAccess";
import { supabase } from "@/lib/supabase";

export default function BottomAppNav() {
  const [location, setLocation] = useLocation();
  const [canOpenCommunity, setCanOpenCommunity] = useState(false);
  const onDashboard =
    location === "/dashboard" || location.startsWith("/dashboard/");
  const onCommunity = location.startsWith("/community");

  const iconClass = "h-[18px] w-[18px] shrink-0";
  const strokeActive = 1.35;
  const strokeInactive = 1.2;

  const baseBtn =
    "relative flex flex-1 max-w-[140px] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const active = "bg-white/12 text-white shadow-inner";
  const inactive = "text-white/80 hover:bg-white/8 hover:text-white";

  useEffect(() => {
    const loadCommunityAccess = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setCanOpenCommunity(false);
        return;
      }

      const { data: purchasesData, error } = await supabase
        .from("purchases")
        .select("product_id, status")
        .eq("user_id", data.user.id)
        .eq("status", "active");

      if (error || !purchasesData) {
        setCanOpenCommunity(false);
        return;
      }

      const purchasedIds = new Set(purchasesData.map((item) => String(item.product_id)));
      setCanOpenCommunity(hasCommunityAccess(purchasedIds));
    };

    void loadCommunityAccess();
  }, []);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/12 bg-[#6B705C]/98 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_32px_rgba(53,58,46,0.28)] backdrop-blur-md supports-[backdrop-filter]:bg-[#6B705C]/92"
    >
      <div className="mx-auto flex min-h-12 max-w-lg items-center justify-center gap-4 px-6 sm:gap-10">
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
          onClick={() => setLocation("/community")}
          className={`${baseBtn} ${onCommunity ? active : inactive}`}
          aria-current={onCommunity ? "page" : undefined}
          aria-label={canOpenCommunity ? "Comunidade" : "Comunidade bloqueada"}
        >
          <div className="relative">
            <MessageCircle
              className={`${iconClass} ${onCommunity ? "opacity-100" : "opacity-90"}`}
              strokeWidth={onCommunity ? strokeActive : strokeInactive}
            />
            {!canOpenCommunity ? (
              <Lock className="absolute -right-2.5 -bottom-1 h-3.5 w-3.5 rounded-full bg-[#6B705C] p-[1px] text-white" />
            ) : null}
          </div>
          <span className="text-[9px] font-normal uppercase tracking-[0.14em] text-white/95">
            {canOpenCommunity ? "Chat" : "Chat bloqueado"}
          </span>
        </button>
      </div>
    </nav>
  );
}
