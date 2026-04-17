import { useEffect, useMemo, useState } from "react";
import { Bell, Home, Lock, MessageCircle, PlayCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";
type Product = {
  id: string;
  name?: string | null;
  description?: string | null;
  type: "PRO" | "BON" | string;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
};

function ProductCard({
  product,
  locked = false,
  onClick,
}: {
  product: Product;
  locked?: boolean;
  onClick: () => void;
}) {
  const productTitle = product.name || "Produto";
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";

  return (
    <article
      onClick={onClick}
      className="w-[164px] cursor-pointer overflow-hidden rounded-[22px] bg-[#5F684F] p-3 shadow-sm transition-transform hover:scale-[1.01]"
    >
      <div className="relative overflow-hidden rounded-[10px] bg-[#aeb6a1]">
        <img
          src={imageSrc}
          alt={productTitle}
          className={`h-[146px] w-full object-cover ${locked ? "opacity-45 grayscale-[0.2]" : ""}`}
        />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl bg-white/90 p-3">
              <Lock className="h-8 w-8 text-[#6B705C]" />
            </div>
          </div>
        )}
      </div>

      <h3
        className="mt-3 line-clamp-2 text-center text-[14px] leading-[1.15] text-white"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
      >
        {productTitle}
      </h3>
    </article>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showScrollHeader, setShowScrollHeader] = useState(false);

  const getType = (product: Product) => (product.type || "PRO").toUpperCase();
  const hasAccess = (product: Product) => purchasedIds.has(product.id);

  useEffect(() => {
    const loadProducts = async () => {
      const isDevBypass = localStorage.getItem("dev_bypass_auth") === "true";
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user && !isDevBypass) {
        setLocation("/");
        return;
      }

      if (userData.user) {
        const { data: purchasesData, error: purchasesError } = await supabase
          .from("purchases")
          .select("product_id, status")
          .eq("user_id", userData.user.id)
          .eq("status", "active");

        if (!purchasesError && purchasesData) {
          setPurchasedIds(new Set(purchasesData.map((item) => item.product_id)));
        }
      } else {
        setPurchasedIds(new Set());
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar dashboard/products:", error);
        console.log("Erro detalhado dashboard/products:", JSON.stringify(error, null, 2));
      } else if (data) {
        const normalized = data.map((item: any) => ({
          id: item.id,
          name: item.name ?? item.title ?? "Produto",
          description: item.description ?? item.descricao ?? null,
          type: (item.type ?? item.tipo ?? "PRO") as "PRO" | "BON" | string,
          image_url: item.image_url ?? item.image ?? null,
          image: item.image ?? null,
          thumbnail_url: item.thumbnail_url ?? null,
          video_url: item.video_url ?? item.video ?? null,
          link_compra: item.link_compra ?? item.link ?? null,
        }));
        setProducts(normalized);
      }
      setLoading(false);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollHeader(window.scrollY > 90);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nonBonusProducts = useMemo(
    () => products.filter((product) => getType(product) !== "BON"),
    [products]
  );
  const bonusProducts = useMemo(
    () => products.filter((product) => getType(product) === "BON"),
    [products]
  );
  const purchasedProducts = useMemo(
    () => nonBonusProducts.filter((product) => hasAccess(product)),
    [nonBonusProducts, purchasedIds]
  );
  const suggestedProducts = useMemo(
    () => nonBonusProducts.filter((product) => !hasAccess(product)),
    [nonBonusProducts, purchasedIds]
  );
  const otherProducts = useMemo(
    () => nonBonusProducts,
    [nonBonusProducts]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0]">
        <p className="text-sm text-[#6B705C]">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-28 -mx-4 md:-mx-8 lg:-mx-16 xl:-mx-24">
      <div
        className={`fixed top-0 right-0 left-0 z-40 bg-white/96 backdrop-blur-sm shadow-sm transition-all duration-300 ${
          showScrollHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#6B705C]/30 text-[#6B705C]">
            <span className="text-lg" style={{ fontFamily: "var(--font-display)" }}>BC</span>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6B705C] transition-colors hover:bg-[#6B705C]/10"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url(${FLORAL_BG})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
          backgroundColor: "#FBFAF6",
        }}
      />
      <section className="relative min-h-[270px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #C7CDBE 0%, #9FA792 34%, #6B705C 100%)",
            }}
          />
          <div className="relative z-10 flex min-h-[270px] w-full flex-col px-4 pt-6 pb-6">
            <header className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/35 text-white">
                <span className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>BC</span>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                aria-label="Notificações"
              >
                <Bell className="h-6 w-6" />
              </button>
            </header>
            <div className="flex flex-1 items-center text-white">
            <h2
              className="max-w-[72%] text-[34px] leading-[1.12] md:max-w-[62%] md:text-[40px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Nosso propósito é tornar seu sonho uma realidade!
            </h2>
            </div>
          </div>
      </section>

      <div className="relative w-full px-4 pt-8">

        <section>
          <h2
            className="mb-4 text-4xl uppercase tracking-wide text-[#6B705C]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            SEUS PRODUTOS
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {purchasedProducts.map((product) => (
              <ProductCard
                key={`owned-${product.id}`}
                product={product}
                locked={false}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              />
            ))}
          </div>
          {purchasedProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum produto liberado no momento.</p>
          )}
        </section>

        <section className="mt-8">
          <h2
            className="mb-4 text-4xl uppercase tracking-wide text-[#6B705C]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            PENSADOS PARA VOCÊ
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {suggestedProducts.map((product) => (
              <ProductCard
                key={`suggested-${product.id}`}
                product={product}
                locked={true}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              />
            ))}
          </div>
          {suggestedProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Sem sugestões bloqueadas para agora.</p>
          )}
        </section>

        <section className="mt-8">
          <h2
            className="mb-4 text-4xl uppercase tracking-wide text-[#6B705C]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            BÔNUS
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bonusProducts.map((product) => (
              <ProductCard
                key={`bonus-${product.id}`}
                product={product}
                locked={!hasAccess(product)}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              />
            ))}
          </div>
          {bonusProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum bônus cadastrado.</p>
          )}
        </section>

        <section className="mt-9 -mx-4 bg-[#6B705C] px-5 py-6 text-center text-white md:-mx-8 lg:-mx-16 xl:-mx-24">
          <p className="text-3xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Quer algo mais personalizado?
          </p>
          <a
            href={import.meta.env.VITE_WHATSAPP_URL || "https://wa.me/"}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-3xl underline underline-offset-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chame nossa equipe.
          </a>
        </section>

        <section className="mt-10">
          <h2
            className="mb-4 text-4xl uppercase tracking-wide text-[#6B705C]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            OUTROS PRODUTOS
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {otherProducts.map((product) => (
              <ProductCard
                key={`other-${product.id}`}
                product={product}
                locked={!hasAccess(product)}
                onClick={() => {
                  setSelectedProduct(product);
                }}
              />
            ))}
          </div>
          {otherProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum outro produto disponível.</p>
          )}
        </section>
      </div>

      <nav className="fixed right-0 bottom-0 left-0 mx-auto flex h-20 w-full max-w-6xl items-center justify-center gap-16 rounded-t-[28px] bg-[#6B705C] text-white">
        <button type="button" className="opacity-100" aria-label="Início">
          <Home className="h-8 w-8" />
        </button>
        <button type="button" className="opacity-95" aria-label="Comunidade">
          <MessageCircle className="h-8 w-8" />
        </button>
      </nav>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#F7F5F0] p-4 shadow-xl md:p-6">
            {(() => {
              const title = selectedProduct.name || "Produto";
              const imageSrc =
                selectedProduct.image_url ||
                selectedProduct.image ||
                selectedProduct.thumbnail_url ||
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";
              const unlocked = hasAccess(selectedProduct);

              return (
                <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl text-[#6B705C]" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-[#6B705C]/25 bg-white">
                <img src={imageSrc} alt={title} className="h-[180px] w-full object-cover md:h-[240px]" />
              </div>

              <div>
                <h4 className="text-xl text-[#6B705C]" style={{ fontFamily: "var(--font-display)" }}>
                  {title}
                </h4>
                <p className="mt-1 text-sm text-zinc-600">
                  {selectedProduct.description || "Sem descrição disponível."}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#6B705C]/25 bg-white p-4">
                {selectedProduct.video_url ? (
                  <video
                    src={selectedProduct.video_url}
                    controls
                    preload="metadata"
                    className="mx-auto aspect-video w-full rounded-xl bg-[#e8eadf]"
                  />
                ) : (
                  <div className="flex h-[170px] items-center justify-center rounded-xl bg-[#eef1e9] text-[#6B705C]">
                    <div className="flex flex-col items-center gap-2">
                      <PlayCircle className="h-8 w-8" />
                      <p className="text-sm" style={{ fontFamily: "var(--font-display)" }}>
                        Vídeo demonstrativo indisponível
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                {unlocked ? (
                  <a
                    href={selectedProduct.link_compra || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#6B705C] px-5 text-sm tracking-wide text-[#6B705C]"
                    onClick={(e) => {
                      if (!selectedProduct.link_compra) e.preventDefault();
                    }}
                  >
                    LINK
                  </a>
                ) : (
                  <a
                    href={selectedProduct.link_compra || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-[#6B705C] px-5 text-sm tracking-wide text-white"
                    onClick={(e) => {
                      if (!selectedProduct.link_compra) e.preventDefault();
                    }}
                  >
                    QUERO TER ACESSO AGORA
                  </a>
                )}
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}