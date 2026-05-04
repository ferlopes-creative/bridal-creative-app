import { useEffect, useMemo, useState } from "react";
import { Bell, Lock } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";
import { PageLoading } from "@/components/PageLoading";
import { SiteBannerCarousel } from "@/components/SiteBannerCarousel";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
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

function ProductCard({
  product,
  showLockedOverlay = false,
  onNavigate,
}: {
  product: Product;
  /** Produto normal não adquirido: overlay verde na imagem + cadeado (nunca para tipo BÔNUS). */
  showLockedOverlay?: boolean;
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
      className="w-full cursor-pointer justify-self-center overflow-hidden rounded-[22px] bg-[#5F684F] p-2 shadow-sm transition-transform hover:scale-[1.01] sm:p-3"
    >
      <div className="relative overflow-hidden rounded-[10px] bg-[#aeb6a1]">
        <img src={imageSrc} alt={productTitle} className="aspect-[3/4] w-full object-cover" />
        {showLockedOverlay ? (
          <>
            <div className="absolute inset-0 bg-[#6B705C]/55" aria-hidden />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg bg-white/95 p-2 shadow-sm sm:rounded-xl sm:p-3">
                <Lock className="h-6 w-6 text-[#6B705C] sm:h-8 sm:w-8" />
              </div>
            </div>
          </>
        ) : null}
      </div>

      <h3
        className="mt-2 line-clamp-2 text-center text-[11px] font-bold leading-[1.15] text-white sm:mt-3 sm:text-[12px]"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
      >
        {productTitle}
      </h3>
    </article>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { settings, refresh: refreshSiteSettings } = useSiteSettings();
  const { hasUnread } = useNotificationBellBadge();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [kitBonusRows, setKitBonusRows] = useState<KitBonusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHeader, setShowScrollHeader] = useState(false);

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;
  const heroBannerUrls = useMemo(() => settings.hero_banner_urls ?? [], [settings.hero_banner_urls]);

  useEffect(() => {
    void refreshSiteSettings();
  }, [refreshSiteSettings]);

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
    "mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[#6B705C] md:text-base";

  /** Largura de cada cartão no carrossel horizontal (telefone / breakpoint antes de md). */
  const mobileCardWrap = "min-w-[142px] w-[40vw] max-w-[168px] shrink-0 snap-start";

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F5F0]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-10 max-w-10 object-contain" />
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
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url(${pageBgUrl})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
          backgroundColor: "#FBFAF6",
        }}
      />
      <section className="relative min-h-[240px] overflow-hidden md:min-h-[260px]">
        <div className="absolute inset-0 bg-[#6B705C]">
          <SiteBannerCarousel urls={heroBannerUrls} />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[240px] w-full max-w-6xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 md:min-h-[260px]">
          <header className="flex items-center justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-16">
              <BrandLogo
                src={logoUrl}
                className="max-h-12 max-w-12 object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:max-h-14 md:max-w-[4.5rem]"
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
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-6 md:pt-8">
        <section>
          <h2 className={sectionTitleClass} style={{ fontFamily: "var(--font-display)" }}>
            SEUS PRODUTOS
          </h2>
          <div className="md:hidden">
            <HorizontalScrollRow contentKey={purchasedProducts.map((p) => p.id).join()}>
              {purchasedProducts.map((product) => (
                <div key={`owned-m-${product.id}`} className={mobileCardWrap}>
                  <ProductCard
                    product={product}
                    showLockedOverlay={false}
                    onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
                  />
                </div>
              ))}
            </HorizontalScrollRow>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid">
            {purchasedProducts.map((product) => (
              <ProductCard
                key={`owned-${product.id}`}
                product={product}
                showLockedOverlay={false}
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
          <div className="md:hidden">
            <HorizontalScrollRow contentKey={suggestedProducts.map((p) => p.id).join()}>
              {suggestedProducts.map((product) => (
                <div key={`sug-m-${product.id}`} className={mobileCardWrap}>
                  <ProductCard
                    product={product}
                    showLockedOverlay={true}
                    onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
                  />
                </div>
              ))}
            </HorizontalScrollRow>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid">
            {suggestedProducts.map((product) => (
              <ProductCard
                key={`suggested-${product.id}`}
                product={product}
                showLockedOverlay={true}
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
          <div className="md:hidden">
            <HorizontalScrollRow contentKey={bonusProducts.map((p) => p.id).join()}>
              {bonusProducts.map((product) => (
                <div key={`bon-m-${product.id}`} className={mobileCardWrap}>
                  <ProductCard
                    product={product}
                    showLockedOverlay={false}
                    onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
                  />
                </div>
              ))}
            </HorizontalScrollRow>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid">
            {bonusProducts.map((product) => (
              <ProductCard
                key={`bonus-${product.id}`}
                product={product}
                showLockedOverlay={false}
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
          <div className="md:hidden">
            <HorizontalScrollRow contentKey={otherProducts.map((p) => p.id).join()}>
              {otherProducts.map((product) => (
                <div key={`oth-m-${product.id}`} className={mobileCardWrap}>
                  <ProductCard
                    product={product}
                    showLockedOverlay={!access(product)}
                    onNavigate={() => setLocation(`/dashboard/product/${product.id}`)}
                  />
                </div>
              ))}
            </HorizontalScrollRow>
          </div>
          <div className="hidden grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid">
            {otherProducts.map((product) => (
              <ProductCard
                key={`other-${product.id}`}
                product={product}
                showLockedOverlay={!access(product)}
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
