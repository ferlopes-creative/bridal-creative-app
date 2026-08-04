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
};

const cardWrap = "min-w-[108px] w-[28vw] max-w-[124px] shrink-0 snap-start";
const cardWrapLarge = "min-w-[136px] w-[36vw] max-w-[160px] shrink-0 snap-start";

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
      className="mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-[1.2] tracking-[0.08em] text-white sm:mt-2.5 sm:text-[11px]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {product.name || "Produto"}
    </h3>
  ) : null;

  if (!showFrame) {
    return (
      <article
        onClick={onNavigate}
        {...pressHandlers}
        style={liftStyle}
        className="relative w-full cursor-pointer touch-manipulation justify-self-center overflow-hidden rounded-[2px] transition-transform duration-150 ease-out hover:scale-[1.01]"
      >
        <img
          src={imageSrc}
          alt={product.name || "Produto"}
          className={`${imageAspectClass} w-full object-cover`}
        />
        {lockOverlay}
        {title}
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
            className={`${imageAspectClass} w-full object-cover`}
          />
          {lockOverlay}
        </div>
      </div>

      {title}
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
}: {
  products: Product[];
  keyPrefix: string;
  showLocked: boolean | ((product: Product) => boolean);
  showTitle?: boolean;
  showFrame?: boolean;
  imageAspectClass?: string;
  large?: boolean;
  onOpen: (id: string) => void;
}) {
  const locked = (product: Product) =>
    typeof showLocked === "function" ? showLocked(product) : showLocked;

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
