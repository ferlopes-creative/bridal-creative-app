import { useState } from "react";
import { Lock } from "lucide-react";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";

export type Product = {
  id: string;
  name?: string | null;
  description?: string | null;
  type: "PRO" | "BON" | string;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
  is_hidden?: boolean | null;
  price?: number | null;
  promo_price?: number | null;
  /** "contain" mostra a imagem inteira sem cortar (quadrado pode sobrar espaço); padrão é "cover" (preenche e corta). */
  image_fit?: "cover" | "contain" | null;
};

const cardWrap = "min-w-[108px] w-[28vw] max-w-[124px] shrink-0 snap-start";
const cardWrapLarge = "min-w-[136px] w-[36vw] max-w-[160px] shrink-0 snap-start";

function formatPriceBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductPrice({
  price,
  promoPrice,
  className = "",
  light = false,
}: {
  price?: number | null;
  promoPrice?: number | null;
  className?: string;
  /** Texto claro, pra usar sobre fundos escuros/coloridos. */
  light?: boolean;
}) {
  if (price == null) return null;
  const hasPromo = promoPrice != null && promoPrice < price;
  const mutedClass = light ? "text-white/45" : "text-bc-primary/40";
  const strongClass = light ? "text-white/80" : "text-bc-primary/75";

  return (
    <p
      className={`flex items-baseline justify-start gap-1.5 font-normal ${className}`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {hasPromo ? (
        <>
          <span className={`text-[10px] line-through ${mutedClass}`}>{formatPriceBRL(price)}</span>
          <span className={`text-[11px] ${strongClass}`}>{formatPriceBRL(promoPrice!)}</span>
        </>
      ) : (
        <span className={`text-[11px] ${strongClass}`}>{formatPriceBRL(price)}</span>
      )}
    </p>
  );
}

export function ProductCard({
  product,
  showLockedOverlay = false,
  showTitle = true,
  showFrame = true,
  imageAspectClass = "aspect-[3/4]",
  onNavigate,
}: {
  product: Product;
  showLockedOverlay?: boolean;
  showTitle?: boolean;
  showFrame?: boolean;
  imageAspectClass?: string;
  onNavigate: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const pressHandlers = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
  };
  const liftStyle = pressed
    ? {
        transform: "translateY(-5px) rotate(-1.1deg) scale(1.02)",
        boxShadow: "0 10px 22px rgba(53,58,46,0.22)",
      }
    : undefined;

  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";
  const imageFitClass = product.image_fit === "contain" ? "object-contain" : "object-cover";

  const lockOverlay = showLockedOverlay ? (
    <>
      <div className="absolute inset-0 bg-black/20" aria-hidden />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Lock
          className="h-7 w-7 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:h-8 sm:w-8"
          strokeWidth={2}
        />
      </div>
    </>
  ) : null;

  const title = showTitle ? (
    <h3
      className={`mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-[1.2] tracking-[0.08em] sm:mt-2.5 sm:text-[11px] ${
        showFrame ? "text-white" : "text-bc-primary"
      }`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {product.name || "Produto"}
    </h3>
  ) : null;

  const priceBlock =
    showLockedOverlay && product.price != null ? (
      <ProductPrice
        price={product.price}
        promoPrice={product.promo_price}
        className="mt-1"
        light={showFrame}
      />
    ) : null;

  if (!showFrame) {
    return (
      <article
        onClick={onNavigate}
        {...pressHandlers}
        style={liftStyle}
        className="w-full cursor-pointer touch-manipulation justify-self-center transition-transform duration-150 ease-out hover:scale-[1.01]"
      >
        <div className="relative overflow-hidden rounded-[2px] bg-[#f4f5ef]">
          <img
            src={imageSrc}
            alt={product.name || "Produto"}
            className={`${imageAspectClass} w-full ${imageFitClass}`}
          />
          {lockOverlay}
        </div>
        {title}
        {priceBlock}
      </article>
    );
  }

  return (
    <article
      onClick={onNavigate}
      {...pressHandlers}
      style={liftStyle}
      className="w-full cursor-pointer touch-manipulation justify-self-center overflow-hidden rounded-2xl bg-bc-banner p-1.5 shadow-[0_2px_14px_rgba(53,58,46,0.12)] transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.01] hover:shadow-[0_4px_18px_rgba(53,58,46,0.14)] sm:p-2.5"
    >
      <div className="overflow-hidden rounded-[10px] bg-bc-banner-light p-1 sm:rounded-[6px] sm:p-0.5">
        <div className="relative overflow-hidden rounded-[6px] sm:rounded-[4px]">
          <img
            src={imageSrc}
            alt={product.name || "Produto"}
            className={`${imageAspectClass} w-full ${imageFitClass}`}
          />
          {lockOverlay}
        </div>
      </div>

      {title}
      {priceBlock}
    </article>
  );
}

export function ProductList({
  products,
  keyPrefix,
  showLocked,
  showTitle = true,
  showFrame = true,
  imageAspectClass,
  large = false,
  onOpen,
  /** Grade que empilha (sem scroll lateral no mobile), em vez do padrão de fileira arrastável. */
  stacked = false,
}: {
  products: Product[];
  keyPrefix: string;
  showLocked: boolean | ((product: Product) => boolean);
  showTitle?: boolean;
  showFrame?: boolean;
  imageAspectClass?: string;
  large?: boolean;
  onOpen: (id: string) => void;
  stacked?: boolean;
}) {
  const locked = (product: Product) =>
    typeof showLocked === "function" ? showLocked(product) : showLocked;

  if (stacked) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={`${keyPrefix}-${product.id}`}
            product={product}
            showLockedOverlay={locked(product)}
            showTitle={showTitle}
            showFrame={showFrame}
            imageAspectClass={imageAspectClass}
            onNavigate={() => onOpen(product.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <HorizontalScrollRow contentKey={products.map((p) => p.id).join()}>
          {products.map((product) => (
            <div key={`${keyPrefix}-m-${product.id}`} className={large ? cardWrapLarge : cardWrap}>
              <ProductCard
                product={product}
                showLockedOverlay={locked(product)}
                showTitle={showTitle}
                showFrame={showFrame}
                imageAspectClass={imageAspectClass}
                onNavigate={() => onOpen(product.id)}
              />
            </div>
          ))}
        </HorizontalScrollRow>
      </div>
      <div className="hidden grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid">
        {products.map((product) => (
          <ProductCard
            key={`${keyPrefix}-${product.id}`}
            product={product}
            showLockedOverlay={locked(product)}
            showTitle={showTitle}
            showFrame={showFrame}
            imageAspectClass={imageAspectClass}
            onNavigate={() => onOpen(product.id)}
          />
        ))}
      </div>
    </>
  );
}
