/**
 * ProductCard Component — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * - Card de produto com imagem, título e estado bloqueado/desbloqueado
 * - Efeito blur + ícone de cadeado para produtos bloqueados
 * - Cantos arredondados suaves, sombra delicada
 * - 3 tamanhos: large (seus produtos), normal (padrão), small (outros produtos)
 */

import { Lock } from "lucide-react";

interface ProductCardProps {
  image: string;
  title: string;
  locked?: boolean;
  size?: "large" | "normal" | "small";
}

export default function ProductCard({ image, title, locked = false, size = "normal" }: ProductCardProps) {
  const sizeClasses = {
    large: "w-[180px]",
    normal: "w-[155px]",
    small: "w-[130px]",
  };

  const imageHeights = {
    large: "h-[200px]",
    normal: "h-[165px]",
    small: "h-[130px]",
  };

  const titleSizes = {
    large: "text-xs",
    normal: "text-[11px]",
    small: "text-[10px]",
  };

  const paddings = {
    large: "px-3 py-3",
    normal: "px-3 py-2.5",
    small: "px-2 py-2",
  };

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-xl bg-[#677354] shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] ${sizeClasses[size]}`}
    >
      {/* Imagem do produto */}
      <div className={`relative overflow-hidden ${imageHeights[size]}`}>
        <img
          src={image}
          alt={title}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
            locked ? "blur-[5px] scale-[1.02]" : ""
          }`}
          loading="lazy"
        />

        {/* Overlay de bloqueio */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="w-11 h-11 rounded-full bg-white/75 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-[#677354]" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>

      {/* Título do produto */}
      <div className={paddings[size]}>
        <h3
          className={`text-white text-center font-semibold leading-tight ${titleSizes[size]}`}
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </h3>
      </div>
    </div>
  );
}
