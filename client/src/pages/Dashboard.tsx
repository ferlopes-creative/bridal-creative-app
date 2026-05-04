import { useEffect, useMemo, useState } from "react";
import { Bell, Lock } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { PageLoading } from "@/components/PageLoading";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import { useSiteSettings, DEFAULT_FLORAL_BG } from "@/contexts/SiteSettingsContext";
import type { KitBonusRow } from "@/lib/kitBonus";
import { canAccessProduct } from "@/lib/productAccess";
import { supabase } from "@/lib/supabase";

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

const DEFAULT_HEADLINE = "Nosso propósito é tornar seu sonho uma realidade!";

function ProductCard({
  product,
  locked = false,
  onNavigate,
}: {
  product: Product;
  locked?: boolean;
  onNavigate: () => void;
}) {
  const productTitle = product.name || "Produto";
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";

  return (
    <article
      onClick={onNavigate}
      className="w-full max-w-[200px] cursor-pointer justify-self-center overflow-hidden rounded-[22px] bg-[#5F684F] p-3 shadow-sm transition-transform hover:scale-[1.01] sm:max-w-none"
    >
      <div className="relative overflow-hidden rounded-[10px] bg-[#aeb6a1]">
        <img
          src={imageSrc}
          alt={productTitle}
          className={`aspect-square w-full object-cover ${locked ? "opacity-45 grayscale-[0.2]" : ""}`}
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
        className="mt-3 line-clamp-2 text-center text-[13px] leading-[1.15] text-white md:text-[14px]"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
      >
        {productTitle}
      </h3>
    </article>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const { hasUnread } = useNotificationBellBadge();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [kitBonusRows, setKitBonusRows] = useState<KitBonusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHeader, setShowScrollHeader] = useState(false);

  const pageBgUrl = settings.page_background_image_url || DEFAULT_FLORAL_BG;
  const logoUrl = settings.logo_url;
  const heroImageUrl = settings.hero_image_url;
  const heroHeadline = (settings.hero_headline || "").trim() || DEFAULT_HEADLINE;

  const hasAccess = (product: Product) => purchasedIds.has(product.id);
  const access = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

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

      const { data: kbData, error: kbError } = await supabase
        .from("kit_bonus_products")
        .select("kit_product_id, bonus_product_id");

      if (!kbError && kbData) {
        setKitBonusRows(kbData as KitBonusRow[]);
      } else {
        setKitBonusRows([]);
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

  const getType = (product: Product) => (product.type || "PRO").toUpperCase();

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
  const otherProducts = useMemo(() => nonBonusProducts, [nonBonusProducts]);

  const sectionTitleClass =
    "mb-4 text-2xl uppercase tracking-wide text-[#6B705C] md:text-3xl";

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F5F0]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url(${pageBgUrl})`,
            backgroundSize: "360px auto",
            backgroundRepeat: "repeat",
            backgroundColor: "#FBFAF6",
          }}
        />
        <PageLoading label="Carregando seus produtos..." className="relative min-h-screen flex-1" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <div
        className={`fixed top-0 right-0 left-0 z-40 bg-white/96 backdrop-blur-sm shadow-sm transition-all duration-300 ${
          showScrollHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#6B705C]/25 bg-[#FBFAF6]/90 p-0.5">
            <BrandLogo src={logoUrl} className="h-full w-full" />
          </div>
          <button
            type="button"
            onClick={() => setLocation("/notifications")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6B705C] transition-colors hover:bg-[#6B705C]/10"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url(${pageBgUrl})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
          backgroundColor: "#FBFAF6",
        }}
      />
      <section className="relative min-h-[240px] overflow-hidden md:min-h-[260px]">
        <div
          className="absolute inset-0"
          style={{
            background: heroImageUrl
              ? undefined
              : "linear-gradient(180deg, #C7CDBE 0%, #9FA792 34%, #6B705C 100%)",
            ...(heroImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(107,112,92,0.55) 0%, rgba(107,112,92,0.75) 100%), url(${heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
        />
        <div className="relative z-10 mx-auto flex min-h-[240px] w-full max-w-6xl flex-col px-4 pt-6 pb-6 md:min-h-[260px]">
          <header className="mb-4 flex items-center justify-between">
            <div className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/10 p-1 md:h-14 md:w-14">
              <BrandLogo
                src={logoUrl}
                className="h-full w-full brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setLocation("/notifications")}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
              aria-label="Notificações"
            >
              <Bell className="h-6 w-6" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white/90" aria-hidden />
              )}
            </button>
          </header>
          <div className="flex flex-1 items-center text-white">
            <h2
              className="max-w-[95%] text-[26px] leading-[1.15] sm:max-w-[85%] md:max-w-[70%] md:text-[32px] lg:text-[34px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {heroHeadline}
            </h2>
          </div>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-8">
        <section>
          <h2 className={sectionTitleClass} style={{ fontFamily: "var(--font-display)" }}>
            SEUS PRODUTOS
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {purchasedProducts.map((product) => (
              <ProductCard
                key={`owned-${product.id}`}
                product={product}
                locked={false}
                onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
              />
            ))}
          </div>
          {purchasedProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum produto liberado no momento.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className={sectionTitleClass} style={{ fontFamily: "var(--font-display)" }}>
            PENSADOS PARA VOCÊ
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {suggestedProducts.map((product) => (
              <ProductCard
                key={`suggested-${product.id}`}
                product={product}
                locked={true}
                onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
              />
            ))}
          </div>
          {suggestedProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Sem sugestões bloqueadas para agora.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className={sectionTitleClass} style={{ fontFamily: "var(--font-display)" }}>
            BÔNUS
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bonusProducts.map((product) => (
              <ProductCard
                key={`bonus-${product.id}`}
                product={product}
                locked={!access(product)}
                onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
              />
            ))}
          </div>
          {bonusProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum bônus cadastrado.</p>
          )}
        </section>

        <section className="mt-9 rounded-2xl bg-[#6B705C] px-5 py-6 text-center text-white">
          <p className="text-xl leading-tight md:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
            Quer algo mais personalizado?
          </p>
          <a
            href={import.meta.env.VITE_WHATSAPP_URL || "https://wa.me/"}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xl underline underline-offset-4 md:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Chame nossa equipe.
          </a>
        </section>

        <section className="mt-10">
          <h2 className={sectionTitleClass} style={{ fontFamily: "var(--font-display)" }}>
            OUTROS PRODUTOS
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {otherProducts.map((product) => (
              <ProductCard
                key={`other-${product.id}`}
                product={product}
                locked={!access(product)}
                onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
              />
            ))}
          </div>
          {otherProducts.length === 0 && (
            <p className="text-sm text-[#6B705C]/75">Nenhum outro produto disponível.</p>
          )}
        </section>
      </div>

      <BottomAppNav />
    </div>
  );
}
