/**
 * Header Component — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * - Logo monograma "BC" à esquerda com anel ornamental
 * - Sino de notificação à direita
 * - Fundo com blur sutil
 */

import { Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E8E3DA]/40">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Logo Monograma BC */}
        <div className="flex items-center">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full" fill="none">
              <circle cx="30" cy="30" r="27" stroke="#B8A88A" strokeWidth="0.7" />
              <circle cx="30" cy="30" r="23.5" stroke="#B8A88A" strokeWidth="0.4" />
              <path d="M30 3 L31 6 L30 5 L29 6 Z" fill="#B8A88A" opacity="0.7" />
              <path d="M30 57 L31 54 L30 55 L29 54 Z" fill="#B8A88A" opacity="0.7" />
              <path d="M3 30 L6 31 L5 30 L6 29 Z" fill="#B8A88A" opacity="0.7" />
              <path d="M57 30 L54 31 L55 30 L54 29 Z" fill="#B8A88A" opacity="0.7" />
              <path d="M15 8 Q18 10 16 13" stroke="#B8A88A" strokeWidth="0.4" fill="none" />
              <path d="M45 8 Q42 10 44 13" stroke="#B8A88A" strokeWidth="0.4" fill="none" />
              <path d="M15 52 Q18 50 16 47" stroke="#B8A88A" strokeWidth="0.4" fill="none" />
              <path d="M45 52 Q42 50 44 47" stroke="#B8A88A" strokeWidth="0.4" fill="none" />
            </svg>
            <span
              className="relative text-[13px] font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-display)", color: "#677354" }}
            >
              BC
            </span>
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
