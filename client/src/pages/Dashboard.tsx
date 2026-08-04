import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { isVisibleInCatalog } from "@/lib/productVisibility";
import { resolveWhatsAppUrl } from "@/lib/whatsappUrl";
import {
  resolveSectionProducts,
  sectionShowsLockedOverlay,
  shouldRenderDashboardSection,
} from "@/lib/dashboardSections";
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
  is_hidden?: boolean | null;
};

const cardWrap = "min-w-[108px] w-[28vw] max-w-[124px] shrink-0 snap-start";
const cardWrapLarge = "min-w-[136px] w-[36vw] max-w-[160px] shrink-0 snap-start";

function ProductCard({
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
        className="relative w-full cursor-pointer justify-self-center overflow-hidden rounded-[2px] transition-transform hover:scale-[1.01]"
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
      className="w-full cursor-pointer justify-self-center overflow-hidden rounded-2xl bg-bc-banner p-1.5 shadow-[0_2px_14px_rgba(53,58,46,0.12)] transition-[transform,box-shadow] hover:scale-[1.01] hover:shadow-[0_4px_18px_rgba(53,58,46,0.14)] sm:p-2.5"
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

function ProductList({
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
  const [weddingName, setWeddingName] = useState<string | null>(null);
  const [weddingDaysLeft, setWeddingDaysLeft] = useState<number | null>(null);
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

        const { data: weddingData } = await supabase
          .from("wedding_details")
          .select("bride_name, wedding_date")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        setWeddingName(weddingData?.bride_name?.trim() || null);
        if (weddingData?.wedding_date) {
          const [y, m, d] = weddingData.wedding_date.split("-").map(Number);
          const target = new Date(y, m - 1, d);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          setWeddingDaysLeft(Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000)));
        } else {
          setWeddingDaysLeft(null);
        }
      } else {
        setPurchasedIds(new Set());
        setWeddingName(null);
        setWeddingDaysLeft(null);
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
            is_hidden: item.is_hidden === true,
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

  const canAccess = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

  const visibleInCatalog = (product: Product) =>
    isVisibleInCatalog(product, canAccess(product));

  const sectionCtx = useMemo(
    () => ({
      purchasedIds,
      canAccess,
      visibleInCatalog,
    }),
    [purchasedIds, kitBonusRows, products]
  );

  const sectionBlocks = useMemo(() => {
    // "Bônus" some como fileira própria — os itens entram na mesma fileira de "Meus produtos".
    const bonusProducts = resolveSectionProducts(
      { id: "__bonus_merge__", title: "", kind: "products", mode: "automatic", auto_rule: "bonus" },
      products,
      sectionCtx
    );

    return settings.dashboard_sections_config
      .map((section) => {
        if (section.mode === "automatic" && section.auto_rule === "bonus") {
          return null;
        }

        if (section.kind === "whatsapp") {
          if (!shouldRenderDashboardSection(section, 0, whatsappUrl)) return null;
          return (
            <section key={section.id} className="app-cta-banner">
              <p
                className="text-xs font-medium uppercase leading-snug tracking-[0.12em] md:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {section.title}
              </p>
              <a
                href={whatsappUrl!}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-sm tracking-[0.04em] underline underline-offset-[3px] opacity-95 transition-opacity hover:opacity-100"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Chame nossa equipe.
              </a>
            </section>
          );
        }

        const isPurchasedSection = section.mode === "automatic" && section.auto_rule === "purchased";
        let sectionProducts = resolveSectionProducts(section, products, sectionCtx);
        if (isPurchasedSection && bonusProducts.length > 0) {
          const existingIds = new Set(sectionProducts.map((p) => p.id));
          sectionProducts = [
            ...sectionProducts,
            ...bonusProducts.filter((p) => !existingIds.has(p.id)),
          ];
        }

        if (!shouldRenderDashboardSection(section, sectionProducts.length, whatsappUrl)) {
          return null;
        }

        const emptyMessage =
          section.mode === "automatic" && section.auto_rule === "purchased"
            ? "Nenhum produto liberado no momento."
            : section.mode === "automatic" && section.auto_rule === "unpurchased"
              ? "Sem sugestões bloqueadas para agora."
              : "Nenhum produto nesta seção.";

        return (
          <section key={section.id}>
            <h2 className="app-section-title">{section.title.toUpperCase()}</h2>
            <ProductList
              products={sectionProducts}
              keyPrefix={section.id}
              showLocked={(product) => sectionShowsLockedOverlay(section, product, canAccess)}
              showTitle={!isPurchasedSection}
              showFrame={!isPurchasedSection}
              imageAspectClass={isPurchasedSection ? "aspect-square" : undefined}
              large={isPurchasedSection}
              onOpen={openProduct}
            />
            {sectionProducts.length === 0 && (
              <p className="text-sm text-bc-primary/75">{emptyMessage}</p>
            )}
          </section>
        );
      })
      .filter((block) => block != null);
  }, [settings.dashboard_sections_config, products, sectionCtx, whatsappUrl, purchasedIds, kitBonusRows]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bc-page-bg">
        <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
        <PageLoading label="Carregando seus produtos..." className="relative min-h-screen flex-1" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bc-page-bg pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
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

      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      <section className="relative min-h-[240px] overflow-hidden rounded-b-2xl md:min-h-[320px]">
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

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:pt-9 md:pt-10">
        <div className="border-b border-bc-primary/15 pb-3">
          <p
            className="text-sm font-bold tracking-[0.06em] text-bc-primary sm:text-base sm:tracking-[0.1em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bem-vinda(o){weddingName ? `, ${weddingName}` : ""}!
          </p>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <h1
            className="text-base leading-snug text-bc-primary sm:text-xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
          >
            Um grande amor,
            <br />
            merece um
            <br />
            <span className="text-4xl leading-tight sm:text-6xl" style={{ fontFamily: "var(--font-script)" }}>
              Grande dia!
            </span>
          </h1>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div
              className="rounded-[3px] px-4 py-2 text-center text-white sm:px-6 sm:py-2.5"
              style={{ backgroundColor: "var(--bc-primary)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/75 sm:text-[10px]">Faltam</p>
              <p className="text-base font-semibold whitespace-nowrap sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                {weddingDaysLeft !== null ? `${weddingDaysLeft} dias` : "--"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation("/planejamento")}
              className="text-[10px] font-normal text-bc-primary hover:underline sm:text-xs"
            >
              Ver planejamento →
            </button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-10 md:pt-12">
        {sectionBlocks.map((block, index) => (
          <div key={index} className={index > 0 ? "mt-6 md:mt-10" : undefined}>
            {block}
          </div>
        ))}
      </div>

      <WelcomePopup open={showWelcomePopup} onOpenChange={setShowWelcomePopup} logoUrl={logoUrl} />

      <WhatsAppSupportButton aboveBottomNav />
      <BottomAppNav />
    </div>
  );
}
