import { ExternalLink, Lock, PlayCircle } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";
import { ProductPrice } from "@/components/ProductGrid";
import { parseGalleryUrls } from "@/lib/productDeliveryImages";
import { resolveProductAccessLinks } from "@/lib/productAccessLinks";

type ProductViewData = {
  id?: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  /** Texto após a compra; se vazio, usa `description`. */
  description_delivery?: string | null;
  descricao?: string | null;
  type?: string | null;
  image_url?: string | null;
  image?: string | null;
  image_delivery_url?: string | null;
  image_sales_url?: string | null;
  delivery_gallery_urls?: unknown;
  sales_gallery_urls?: unknown;
  thumbnail_url?: string | null;
  video_url?: string | null;
  video?: string | null;
  access_links?: unknown;
  link_compra?: string | null;
  link?: string | null;
  price?: number | null;
  promo_price?: number | null;
};

interface ProductViewProps {
  product: ProductViewData;
  /** Se false, vídeo e link de entrega ficam bloqueados (exceto CTA de compra). */
  canAccess: boolean;
}

const PURIFY = {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "span", "h1", "h2", "h3"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
};

/** Plain text / legacy descriptions without tags → wrap in <p> so wrapping CSS applies consistently */
function escapePlainForHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeProductDescription(raw: string, fallback: string) {
  const trimmed = raw.trim();
  const source = trimmed || fallback;
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(source);
  const payload = looksLikeHtml ? source : `<p>${escapePlainForHtml(source)}</p>`;
  return DOMPurify.sanitize(payload, PURIFY);
}

function resolveProductDescription(product: ProductViewData, canAccess: boolean) {
  const legacy = product.description || product.descricao || "";
  if (canAccess) {
    return product.description_delivery?.trim() || legacy;
  }
  return legacy;
}

type Slide = { kind: "image"; url: string; alt: string } | { kind: "video"; url: string };

export default function ProductView({ product, canAccess }: ProductViewProps) {
  const title = product.name || product.title || "Produto";
  const safeHtml = sanitizeProductDescription(
    resolveProductDescription(product, canAccess),
    "Sem descrição disponível.",
  );
  const coverSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1600&auto=format&fit=crop";
  const salesHero = product.image_sales_url?.trim() || "";
  const deliveryHeroSrc = product.image_delivery_url?.trim() || coverSrc;
  const salesHeroSrc = salesHero || coverSrc;
  const heroSrc = canAccess ? deliveryHeroSrc : salesHeroSrc;
  const galleryUrls = canAccess
    ? parseGalleryUrls(product.delivery_gallery_urls)
    : parseGalleryUrls(product.sales_gallery_urls);
  const purchaseLink = (product.link_compra || product.link || "").trim() || null;
  const accessLinks = canAccess ? resolveProductAccessLinks(product) : [];
  const videoSrc = (product.video_url || product.video || "").trim() || null;

  const slides: Slide[] = [
    { kind: "image", url: heroSrc, alt: title },
    ...galleryUrls
      .filter((url) => url !== heroSrc)
      .map((url, index): Slide => ({ kind: "image", url, alt: `${title} — foto ${index + 2}` })),
    ...(videoSrc ? [{ kind: "video", url: videoSrc } as Slide] : []),
  ];

  const accessButtonClass = (enabled: boolean) =>
    `inline-flex items-center justify-center gap-2 border px-5 py-2.5 text-xs tracking-[0.1em] transition-colors md:text-sm ${
      enabled
        ? "border-bc-primary bg-white text-bc-primary hover:bg-bc-primary hover:text-white"
        : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-400"
    }`;

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl">
      <HorizontalScrollRow contentKey={slides.map((s) => s.url).join()}>
        {slides.map((slide, index) => (
          <div key={`${slide.url}-${index}`} className="w-full shrink-0 snap-start">
            {slide.kind === "video" ? (
              canAccess ? (
                <video
                  src={slide.url}
                  controls
                  preload="metadata"
                  className="aspect-square w-full bg-[#1c1e17] object-contain"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-[#eef1e9] text-bc-primary">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <Lock className="h-8 w-8" />
                    <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
                      Vídeo liberado após a compra
                    </p>
                  </div>
                </div>
              )
            ) : (
              <img src={slide.url} alt={slide.alt} className="aspect-square w-full bg-[#f4f5ef] object-cover" />
            )}
          </div>
        ))}
      </HorizontalScrollRow>
      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-2 text-bc-primary/50">
          {slides.map((slide, index) =>
            slide.kind === "video" ? (
              <PlayCircle key={`dot-${index}`} className="h-3 w-3" aria-hidden />
            ) : (
              <span key={`dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            )
          )}
        </div>
      )}

      <div className="mt-6 md:mt-8">
        <h1
          className="break-words text-[1.375rem] leading-[1.15] text-bc-primary md:text-[1.625rem]"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
        >
          {title}
        </h1>

        {!canAccess && product.price != null ? (
          <ProductPrice price={product.price} promoPrice={product.promo_price} className="mt-2" />
        ) : null}

        <div
          className="product-html mt-5 w-full min-w-0 max-w-full text-[0.8125rem] leading-[1.7] text-[#4a4a44] [&_a]:text-[#5a6349] [&_a]:underline [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:text-bc-primary [&_h2]:mb-2 [&_h2]:text-base [&_h2]:text-bc-primary [&_h3]:text-sm [&_h3]:text-bc-primary [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2.5 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          style={{ fontFamily: "var(--font-body)" }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>

      <div
        className={`mt-7 flex flex-col items-stretch gap-3 sm:items-end md:mt-8 ${
          canAccess && accessLinks.length > 1 ? "sm:flex-col" : "sm:flex-row sm:justify-end"
        }`}
      >
        {canAccess ? (
          accessLinks.length > 0 ? (
            accessLinks.map((link, index) => {
              const label =
                link.label ||
                (accessLinks.length === 1 ? "ACESSO / LINK" : `ACESSO ${index + 1}`);
              return (
                <a
                  key={`${link.url}-${index}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={accessButtonClass(true)}
                >
                  {label.toUpperCase()}
                  <ExternalLink className="h-4 w-4" />
                </a>
              );
            })
          ) : (
            <span className={accessButtonClass(false)} aria-disabled>
              ACESSO / LINK
              <ExternalLink className="h-4 w-4" />
            </span>
          )
        ) : (
          <a
            href={purchaseLink || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-bc-primary bg-bc-primary px-5 py-2.5 text-xs tracking-[0.1em] text-white transition-opacity hover:opacity-95 md:text-sm"
            onClick={(e) => {
              if (!purchaseLink) e.preventDefault();
            }}
          >
            QUERO TER ACESSO AGORA
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </section>
  );
}
