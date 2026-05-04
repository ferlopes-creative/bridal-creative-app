/**
 * Header Component — Bridal Creative
 * - Logotipo oficial à esquerda
 * - Sino de notificação à direita
 * - Fundo com blur sutil
 */

import { Bell } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E8E3DA]/40">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center">
            <BrandLogo className="max-h-10 max-w-10 object-contain" />
          </div>
        </div>

        {/* Sino de notificação */}
        <button
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#677354]/8 transition-colors duration-300"
          aria-label="Notificações"
        >
          <Bell className="w-[22px] h-[22px] text-[#677354]" strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}
