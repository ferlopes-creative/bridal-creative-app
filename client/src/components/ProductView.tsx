import { ExternalLink, Lock, PlayCircle } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
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
  thumbnail_url?: string | null;
  video_url?: string | null;
  video?: string | null;
  access_links?: unknown;
  link_compra?: string | null;
  link?: string | null;
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

export default function ProductView({ product, canAccess }: ProductViewProps) {
  const title = product.name || product.title || "Produto";
  const safeHtml = sanitizeProductDescription(
    resolveProductDescription(product, canAccess),
    "Sem descrição disponível.",
  );
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1600&auto=format&fit=crop";
  const purchaseLink = (product.link_compra || product.link || "").trim() || null;
  const accessLinks = canAccess ? resolveProductAccessLinks(product) : [];
  const videoSrc = (product.video_url || product.video || "").trim() || null;
  const hasVideo = Boolean(videoSrc);

  const accessButtonClass = (enabled: boolean) =>
    `inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm tracking-[0.12em] transition-colors ${
      enabled
        ? "border-bc-primary bg-white text-bc-primary hover:bg-bc-primary hover:text-white"
        : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-400"
    }`;

  return (
    <section className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-[22px] border border-bc-primary/40 bg-white shadow-sm">
        <img
          src={imageSrc}
          alt={`Capa ilustrativa — ${title}`}
          className="h-[200px] w-full object-cover md:h-[260px]"
        />
      </div>

      <div className="w-full min-w-0 rounded-[28px] border border-bc-primary/45 bg-bc-page-bg p-5 shadow-sm md:p-7">
        <h1
          className="break-words text-2xl leading-tight text-bc-primary md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <div
          className="product-html mt-4 w-full min-w-0 max-w-full text-sm leading-relaxed text-[#3A3A3A] [&_a]:text-[#5a6349] [&_a]:underline [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:text-bc-primary [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:text-bc-primary [&_h3]:text-base [&_h3]:text-bc-primary [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          style={{ fontFamily: "var(--font-body)" }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </div>

      {hasVideo && (
        <div className="overflow-hidden rounded-[22px] border border-bc-primary/45 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-center gap-2 text-bc-primary">
            <PlayCircle className="h-5 w-5" />
            <span className="text-sm tracking-wide">VÍDEO</span>
          </div>
          {canAccess ? (
            <video
              src={videoSrc || undefined}
              controls
              preload="metadata"
              className="mx-auto aspect-video w-full max-w-2xl rounded-xl bg-[#e8eadf]"
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center rounded-xl bg-[#eef1e9] text-bc-primary">
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <Lock className="h-8 w-8" />
                <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
                  Vídeo liberado após a compra
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={`flex flex-col items-stretch gap-3 sm:items-end ${
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-bc-primary bg-bc-primary px-5 py-2.5 text-sm tracking-[0.12em] text-white transition-colors hover:opacity-95"
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
