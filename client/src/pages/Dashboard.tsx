import { useEffect, useMemo, useState } from "react";
import { Bell, Lock } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";
import { PageLoading } from "@/components/PageLoading";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { SiteBannerCarousel } from "@/components/SiteBannerCarousel";
import { useIsMobile } from "@/hooks/useMobile";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import {
  useSiteSettings,
  resolveAppPageBackground,
  resolveHeroBannerMobileUrls,
  resolveHeroBannerDesktopUrls,
} from "@/contexts/SiteSettingsContext";
import type { KitBonusRow } from "@/lib/kitBonus";
import { canAccessProduct } from "@/lib/productAccess";
import { resolveWhatsAppUrl } from "@/lib/whatsappUrl";
import WelcomePopup from "@/components/WelcomePopup";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import { isGuestMode } from "@/lib/guestMode";
import { supabase } from "@/lib/supabase";
import { consumeWelcomePopupPending } from "@/lib/welcomePopup";

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

const cardWrap = "min-w-[108px] w-[28vw] max-w-[124px] shrink-0 snap-start";

function ProductCard({
  product,
  showLockedOverlay = false,
  onNavigate,
}: {
  product: Product;
  showLockedOverlay?: boolean;
  onNavigate: () => void;
}) {
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";

  return (
    <article
      onClick={onNavigate}
      className="w-full cursor-pointer justify-self-center overflow-hidden rounded-2xl bg-bc-banner p-1.5 shadow-[0_2px_14px_rgba(53,58,46,0.12)] transition-[transform,box-shadow] hover:scale-[1.01] hover:shadow-[0_4px_18px_rgba(53,58,46,0.14)] sm:p-2.5"
    >
      <div className="overflow-hidden rounded-[10px] bg-bc-banner-light p-1 sm:rounded-[6px] sm:p-0.5">
        <div className="relative overflow-hidden rounded-[6px] sm:rounded-[4px]">
          <img
            src={imageSrc}
            alt={product.name || "Produto"}
            className="aspect-[3/4] w-full object-cover"
          />
          {showLockedOverlay ? (
            <>
              <div className="absolute inset-0 bg-black/20" aria-hidden />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Lock
                  className="h-7 w-7 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:h-8 sm:w-8"
                  strokeWidth={2}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <h3
        className="mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-[1.2] tracking-[0.08em] text-white sm:mt-2.5 sm:text-[11px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {product.name || "Produto"}
      </h3>
    </article>
  );
}

function ProductList({
  products,
  keyPrefix,
  showLocked,
  onOpen,
}: {
  products: Product[];
  keyPrefix: string;
  showLocked: boolean | ((product: Product) => boolean);
  onOpen: (id: string) => void;
}) {
  const locked = (product: Product) =>
    typeof showLocked === "function" ? showLocked(product) : showLocked;

  return (
    <>
      <div className="md:hidden">
        <HorizontalScrollRow contentKey={products.map((p) => p.id).join()}>
          {products.map((product) => (
            <div key={`${keyPrefix}-m-${product.id}`} className={cardWrap}>
              <ProductCard
                product={product}
                showLockedOverlay={locked(product)}
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
            onNavigate={() => onOpen(product.id)}
          />
        ))}
      </div>
    </>
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
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const guestMode = isGuestMode();

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;
  const whatsappUrl = resolveWhatsAppUrl(settings);
  const heroMobileUrls = useMemo(
    () => resolveHeroBannerMobileUrls(settings),
    [settings.hero_banner_urls, settings.hero_banner_desktop_urls]
  );
  const heroDesktopUrls = useMemo(
    () => resolveHeroBannerDesktopUrls(settings),
    [settings.hero_banner_urls, settings.hero_banner_desktop_urls]
  );
  const isMobile = useIsMobile();
  const activeHeroUrls = isMobile ? heroMobileUrls : heroDesktopUrls;
  const showHero = activeHeroUrls.length > 0;

  useEffect(() => {
    refreshSiteSettings();
  }, [refreshSiteSettings]);

  const openProduct = (id: string) => setLocation(`/dashboard/product/${id}`);

  useEffect(() => {
    const loadProducts = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (userData.user) {
        const { data: purchasesData } = await supabase
          .from("purchases")
          .select("product_id, status")
          .eq("user_id", userData.user.id)
          .eq("status", "active");

        if (purchasesData) {
          setPurchasedIds(new Set(purchasesData.map((item) => item.product_id)));
        }
      } else {
        setPurchasedIds(new Set());
      }

      const { data: kbData } = await supabase
        .from("kit_bonus_products")
        .select("kit_product_id, bonus_product_id");

      setKitBonusRows(kbData ? (kbData as KitBonusRow[]) : []);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar dashboard/products:", error);
      } else if (data) {
        setProducts(
          data.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.title ?? "Produto",
            description: item.description ?? item.descricao ?? null,
            type: (item.type ?? item.tipo ?? "PRO") as "PRO" | "BON" | string,
            image_url: item.image_url ?? item.image ?? null,
            image: item.image ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            video_url: item.video_url ?? item.video ?? null,
            link_compra: item.link_compra ?? item.link ?? null,
          }))
        );
      }
      setLoading(false);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (!loading && !guestMode && consumeWelcomePopupPending()) {
      setShowWelcomePopup(true);
    }
  }, [loading, guestMode]);

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
  const accessibleBonusProducts = useMemo(
    () => bonusProducts.filter((product) => canAccessProduct(product, purchasedIds, kitBonusRows)),
    [bonusProducts, purchasedIds, kitBonusRows]
  );
  const purchasedProducts = useMemo(
    () => nonBonusProducts.filter((product) => purchasedIds.has(product.id)),
    [nonBonusProducts, purchasedIds]
  );
  const suggestedProducts = useMemo(
    () => nonBonusProducts.filter((product) => !purchasedIds.has(product.id)),
    [nonBonusProducts, purchasedIds]
  );

  const canAccess = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bc-page-bg">
        <PageBackgroundTexture
          imageUrl={pageBgUrl}
          settings={settings}
          backgroundColor={settings.colors.pageBg}
        />
        <PageLoading label="Carregando seus produtos..." className="relative min-h-screen flex-1" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <div
        className={`fixed top-0 right-0 left-0 z-40 bg-bc-page-bg/96 backdrop-blur-sm shadow-sm transition-all duration-300 ${
          showScrollHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-10 max-w-10 object-contain" />
          </div>
          {!guestMode ? (
            <button
              type="button"
              onClick={() => setLocation("/notifications")}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-bc-primary transition-colors hover:bg-bc-primary/10"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
              {hasUnread && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-bc-page-bg" aria-hidden />
              )}
            </button>
          ) : (
            <div className="h-10 w-10" aria-hidden />
          )}
        </div>
      </div>

      <PageBackgroundTexture
        imageUrl={pageBgUrl}
        settings={settings}
        backgroundColor={settings.colors.pageBg}
      />
      <section className="relative min-h-[240px] overflow-hidden md:min-h-[320px]">
        <div className="absolute inset-0 bg-bc-primary">
          {showHero ? (
            <SiteBannerCarousel
              urls={activeHeroUrls}
              slideMinClass={isMobile ? "min-h-[240px]" : "min-h-[320px] lg:min-h-[360px]"}
              imageObjectPosition={isMobile ? "center" : "center top"}
            />
          ) : null}
        </div>
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[240px] w-full max-w-6xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 md:min-h-[320px]">
          <header className="pointer-events-auto flex items-center justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-16">
              <BrandLogo
                src={logoUrl}
                className="max-h-12 max-w-12 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] md:max-h-14 md:max-w-[4.5rem]"
              />
            </div>
            {!guestMode ? (
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
            ) : (
              <div className="h-10 w-10" aria-hidden />
            )}
          </header>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-7 md:pt-9">
        <section>
          <h2 className="app-section-title">SEUS PRODUTOS</h2>
          <ProductList products={purchasedProducts} keyPrefix="owned" showLocked={false} onOpen={openProduct} />
          {purchasedProducts.length === 0 && (
            <p className="text-sm text-bc-primary/75">Nenhum produto liberado no momento.</p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="app-section-title">PENSADOS PARA VOCÊ</h2>
          <ProductList products={suggestedProducts} keyPrefix="suggested" showLocked onOpen={openProduct} />
          {suggestedProducts.length === 0 && (
            <p className="text-sm text-bc-primary/75">Sem sugestões bloqueadas para agora.</p>
          )}
        </section>

        {accessibleBonusProducts.length > 0 ? (
          <section className="mt-10">
            <h2 className="app-section-title">BÔNUS</h2>
            <ProductList
              products={accessibleBonusProducts}
              keyPrefix="bonus"
              showLocked={false}
              onOpen={openProduct}
            />
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="app-section-title">OUTROS PRODUTOS</h2>
          <ProductList
            products={nonBonusProducts}
            keyPrefix="other"
            showLocked={(product) => !canAccess(product)}
            onOpen={openProduct}
          />
          {nonBonusProducts.length === 0 && (
            <p className="text-sm text-bc-primary/75">Nenhum outro produto disponível.</p>
          )}
        </section>

        {whatsappUrl ? (
          <section className="app-cta-banner mt-10">
            <p
              className="text-xs font-medium uppercase leading-snug tracking-[0.12em] md:text-sm"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Quer algo mais personalizado?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-sm tracking-[0.04em] underline underline-offset-[3px] opacity-95 transition-opacity hover:opacity-100"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Chame nossa equipe.
            </a>
          </section>
        ) : null}
      </div>

      <WelcomePopup open={showWelcomePopup} onOpenChange={setShowWelcomePopup} logoUrl={logoUrl} />

      <WhatsAppSupportButton aboveBottomNav />
      <BottomAppNav />
    </div>
  );
}
