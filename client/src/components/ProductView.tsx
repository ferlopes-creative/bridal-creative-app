import { ExternalLink, PlayCircle } from "lucide-react";

type ProductViewData = {
  id?: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  descricao?: string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
  link?: string | null;
};

interface ProductViewProps {
  product: ProductViewData;
}

export default function ProductView({ product }: ProductViewProps) {
  const title = product.name || product.title || "Produto";
  const description = product.description || product.descricao || "Sem descrição disponível.";
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1600&auto=format&fit=crop";
  const purchaseLink = product.link_compra || product.link;
  const hasVideo = Boolean(product.video_url);

  return (
    <section className="mx-auto w-full max-w-3xl rounded-[28px] border border-[#6B705C]/60 bg-[#F7F5F0] p-4 shadow-sm md:p-6">
      <div className="overflow-hidden rounded-[22px] border border-[#6B705C]/40 bg-white">
        <img
          src={imageSrc}
          alt={title || "Imagem do produto"}
          className="h-[220px] w-full object-cover md:h-[280px]"
        />
      </div>

      <div className="mt-5 space-y-3">
        <h1
          className="text-3xl leading-none text-[#6B705C] md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[#3A3A3A] md:text-base">
          {description}
        </p>
      </div>

      {hasVideo && (
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#6B705C]/45 bg-white p-4">
          <div className="mb-2 flex items-center justify-center gap-2 text-[#6B705C]">
            <PlayCircle className="h-5 w-5" />
            <span className="text-sm tracking-wide">VÍDEO</span>
          </div>
          <video
            src={product.video_url || undefined}
            controls
            preload="metadata"
            className="mx-auto aspect-video w-full max-w-2xl rounded-xl bg-[#e8eadf]"
          />
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <a
          href={purchaseLink || "#"}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2 text-sm tracking-[0.12em] transition-colors ${
            purchaseLink
              ? "border-[#6B705C] bg-white text-[#6B705C] hover:bg-[#6B705C] hover:text-white"
              : "cursor-not-allowed border-zinc-300 bg-zinc-100 text-zinc-400"
          }`}
          aria-disabled={!purchaseLink}
          onClick={(e) => {
            if (!purchaseLink) e.preventDefault();
          }}
        >
          LINK
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
