/**
 * BottomNav Component — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * - Barra inferior fixa com fundo #677354
 * - Ícones Home e Comunidade
 * - Estilo elegante com ícones brancos
 * - Safe area para dispositivos com notch
 */

import { Home, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-[480px] mx-auto bg-[#677354] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-center gap-14 py-3.5 px-8">
          {/* Home */}
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex flex-col items-center gap-1 group"
            aria-label="Início"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/20 group-hover:bg-white/30 transition-colors duration-300">
              <Home className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
            </div>
          </button>

          {/* Comunidade */}
          <button
            onClick={() => {
              // Feature coming soon
            }}
            className="flex flex-col items-center gap-1 group"
            aria-label="Comunidade"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center group-hover:bg-white/15 transition-colors duration-300">
              <MessageCircle className="w-[22px] h-[22px] text-white/75" strokeWidth={1.8} />
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
