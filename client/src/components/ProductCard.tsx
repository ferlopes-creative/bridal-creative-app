/**
 * ProductCard Component — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * - Card de produto com imagem, título e estado bloqueado/desbloqueado
 * - Leve escurecimento + cadeado branco para produtos bloqueados
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
      className={`relative flex-shrink-0 overflow-hidden rounded-xl bg-bc-primary shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] ${sizeClasses[size]}`}
    >
      {/* Imagem do produto */}
      <div className={`relative overflow-hidden ${imageHeights[size]}`}>
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />

        {locked && (
          <>
            <div className="absolute inset-0 bg-black/20" aria-hidden />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Lock
                className="h-6 w-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                strokeWidth={2}
              />
            </div>
          </>
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
