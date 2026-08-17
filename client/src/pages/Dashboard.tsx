import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Lock, Star } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import HeroBanner from "@/components/HeroBanner";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";
import { PageLoading } from "@/components/PageLoading";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { ProductList, ProductPrice, type Product } from "@/components/ProductGrid";
import { formatTestimonialDate, type TestimonialConfig } from "@/lib/testimonials";
import { useAppData } from "@/contexts/AppDataContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import {
  useSiteSettings,
  resolveDashboardBackground,
  resolveHeroBannerMobileUrls,
  resolveHeroBannerDesktopUrls,
} from "@/contexts/SiteSettingsContext";
import { canAccessProduct } from "@/lib/productAccess";
import { categoryProductIdsIncludingSubcategories } from "@/lib/productCategories";
import { isVisibleInCatalog } from "@/lib/productVisibility";
import { resolveWhatsAppUrl } from "@/lib/whatsappUrl";
import {
  resolveSectionCategories,
  resolveSectionProducts,
  sectionShowsLockedOverlay,
  shouldRenderDashboardSection,
} from "@/lib/dashboardSections";
import DisplayNamePrompt from "@/components/DisplayNamePrompt";
import WelcomePopup from "@/components/WelcomePopup";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import { isGuestMode } from "@/lib/guestMode";
import { supabase } from "@/lib/supabase";
import { consumeWelcomePopupPending } from "@/lib/welcomePopup";

function TestimonialCard({ testimonial }: { testimonial: TestimonialConfig }) {
  const [expanded, setExpanded] = useState(false);
  const initial = (testimonial.author_name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col rounded-[2px] bg-white p-3.5 shadow-[0_2px_14px_rgba(53,58,46,0.08)] sm:w-[240px]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bc-primary/15 text-xs font-semibold text-bc-primary">
          {testimonial.photo_url ? (
            <img src={testimonial.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0">
          <p
            className="truncate text-xs font-semibold text-bc-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {testimonial.author_name || "Anônimo"}
          </p>
          {testimonial.submitted_at ? (
            <p className="text-[9px] text-bc-primary/60">
              Enviado em {formatTestimonialDate(testimonial.submitted_at)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              className={`h-3 w-3 ${
                value <= testimonial.rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-bc-primary/70">
          {testimonial.rating.toFixed(1)}
        </span>
      </div>

      <p
        className={`mt-2 flex-1 text-xs leading-snug text-bc-primary/85 ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {testimonial.text}
      </p>

      {testimonial.text.length > 90 ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1.5 self-start text-[11px] font-medium text-bc-primary underline underline-offset-2"
        >
          {expanded ? "Ler menos" : "Ler mais"}
        </button>
      ) : null}
    </div>
  );
}

/** Dias de calendário restantes até o casamento (ignora hora do dia). */
function daysUntilWedding(target: Date, now: Date): number {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((t - n) / 86400000));
}

function chunkIntoPagesOfFour<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    pages.push(items.slice(i, i + 4));
  }
  return pages;
}

function SuggestedProductCard({
  product,
  locked,
  onOpen,
}: {
  product: Product;
  locked: boolean;
  onOpen: () => void;
}) {
  const imageSrc =
    product.image_url ||
    product.image ||
    product.thumbnail_url ||
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";

  return (
    <article onClick={onOpen} className="cursor-pointer">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2px] bg-bc-banner-light">
        <img src={imageSrc} alt={product.name || "Produto"} className="h-full w-full object-cover" />
        {locked ? (
          <>
            <div className="absolute inset-0 bg-black/20" aria-hidden />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Lock
                className="h-6 w-6 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
                strokeWidth={2}
              />
            </div>
          </>
        ) : null}
      </div>
      <p
        className="mt-2 text-[11px] font-normal uppercase leading-snug tracking-[0.04em] text-bc-primary"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {product.name || "Produto"}
      </p>
      {locked && product.price != null ? (
        <ProductPrice price={product.price} promoPrice={product.promo_price} className="mt-0.5" />
      ) : null}
    </article>
  );
}

function SuggestedProductsGrid({
  products,
  showLocked,
  onOpen,
}: {
  products: Product[];
  showLocked: boolean | ((product: Product) => boolean);
  onOpen: (id: string) => void;
}) {
  const locked = (product: Product) =>
    typeof showLocked === "function" ? showLocked(product) : showLocked;
  const pages = useMemo(() => chunkIntoPagesOfFour(products), [products]);

  return (
    <>
      <div className="md:hidden">
        <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1">
          {pages.map((page, index) => (
            <div key={index} className="grid w-full shrink-0 snap-start grid-cols-2 gap-x-4 gap-y-6">
              {page.map((product) => (
                <SuggestedProductCard
                  key={product.id}
                  product={product}
                  locked={locked(product)}
                  onOpen={() => onOpen(product.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="hidden grid-cols-4 gap-4 md:grid">
        {products.map((product) => (
          <SuggestedProductCard
            key={product.id}
            product={product}
            locked={locked(product)}
            onOpen={() => onOpen(product.id)}
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
  const { products, purchasedIds, kitBonusRows, ready } = useAppData();
  const loading = !ready;
  const [showScrollHeader, setShowScrollHeader] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [weddingCountdownDays, setWeddingCountdownDays] = useState<number | null>(null);
  const guestMode = isGuestMode();

  const pageBgUrl = resolveDashboardBackground(settings);
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
    const loadWeddingInfo = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setWeddingCountdownDays(null);
        return;
      }

      const registeredName = (userData.user.user_metadata?.display_name as string | undefined)?.trim();
      if (!guestMode && !registeredName) {
        setShowNamePrompt(true);
      }

      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("wedding_date")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (weddingData?.wedding_date) {
        const [y, m, d] = weddingData.wedding_date.split("-").map(Number);
        const target = new Date(y, m - 1, d);
        setWeddingCountdownDays(daysUntilWedding(target, new Date()));
      } else {
        setWeddingCountdownDays(null);
      }
    };

    loadWeddingInfo();
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

  const visibleCategories = useMemo(
    () =>
      settings.product_categories_config.filter(
        (category) =>
          !category.parent_id &&
          category.visible &&
          categoryProductIdsIncludingSubcategories(settings.product_categories_config, category.id)
            .length > 0
      ),
    [settings.product_categories_config]
  );

  const visibleTestimonials = useMemo(
    () => settings.testimonials_config.filter((testimonial) => testimonial.visible),
    [settings.testimonials_config]
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
        if (
          section.mode === "automatic" &&
          (section.auto_rule === "bonus" || section.auto_rule === "purchased")
        ) {
          // "Bônus" e "Meus produtos" (comprados) agora vivem na aba própria "Meus produtos".
          return null;
        }

        if (section.kind === "whatsapp") {
          if (!shouldRenderDashboardSection(section, 0, whatsappUrl)) return null;
          return (
            <section key={section.id} className="mt-10 py-6 text-center md:mt-14">
              <h2
                className="mx-auto max-w-xs text-xl leading-snug text-bc-primary sm:max-w-sm sm:text-2xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {section.title}
              </h2>
              <a
                href={whatsappUrl!}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-bc-primary px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-bc-primary transition-colors hover:bg-bc-primary hover:text-white"
              >
                <svg viewBox="0 0 32 32" className="h-4 w-4 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path
                    d="M10.9 9.9c.3-.67.62-.68.9-.7h.77c.23 0 .55.08.84.65.3.57 1.02 1.97 1.12 2.12.1.15.16.33.03.54-.13.2-.2.33-.38.52-.18.2-.38.44-.54.58-.18.15-.36.3-.15.6.21.3.94 1.55 2.03 2.5 1.4 1.22 2.58 1.6 2.95 1.78.36.18.58.15.8-.09.2-.24.87-1.01 1.1-1.36.24-.35.47-.29.8-.18.33.12 2.06.97 2.42 1.15.35.18.58.27.67.42.09.15.09.88-.2 1.74-.29.86-1.72 1.65-2.4 1.73-.62.08-1.4.12-2.27-.15-.53-.17-1.22-.4-2.1-.78-3.7-1.6-6.1-5.34-6.28-5.6-.18-.27-1.5-2-.1-3.84Z"
                    fill="currentColor"
                  />
                  <path
                    d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.55 1.75 6.53L3 29l6.66-1.73A12.96 12.96 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Zm0 2c6.08 0 11 4.92 11 11s-4.92 11-11 11a10.96 10.96 0 0 1-5.6-1.53l-.4-.24-3.95 1.03 1.05-3.85-.26-.4A10.96 10.96 0 0 1 5 16C5 9.92 9.92 5 16 5Z"
                    fill="currentColor"
                  />
                </svg>
                Fale com nossa equipe
              </a>
            </section>
          );
        }

        if (section.kind === "categories") {
          const sectionCategories = resolveSectionCategories(section, visibleCategories);
          if (sectionCategories.length === 0) return null;
          return (
            <section key={section.id} className="mt-6 md:mt-9">
              <h2
                className="mb-3.5 text-sm text-bc-primary sm:text-lg"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
              >
                {section.title.toUpperCase()}
              </h2>
              <div className="flex gap-6 overflow-x-auto pb-1 sm:gap-10">
                {sectionCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setLocation(`/dashboard/categoria/${category.id}`)}
                    className="flex shrink-0 flex-col items-center gap-2"
                  >
                    <span className="h-20 w-20 overflow-hidden rounded-full bg-bc-banner-light ring-1 ring-bc-primary/10 sm:h-24 sm:w-24">
                      {category.photo_url ? (
                        <img src={category.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span
                      className="max-w-[96px] text-center text-[11px] leading-tight text-bc-primary sm:max-w-[112px] sm:text-xs"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {category.name || "Sem nome"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        }

        if (section.kind === "testimonials") {
          if (visibleTestimonials.length === 0) return null;
          return (
            <section key={section.id} className="mt-8 mb-2 md:mt-12">
              <div className="mx-[calc(50%-50vw)] w-screen" style={{ backgroundColor: "var(--bc-primary)" }}>
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:flex md:items-start md:gap-6">
                  {settings.testimonials_banner_url ? (
                    <img
                      src={settings.testimonials_banner_url}
                      alt=""
                      className="mb-4 aspect-square w-full rounded-[2px] object-cover md:mb-0 md:w-56 md:shrink-0 lg:w-64"
                    />
                  ) : null}
                  <div className="min-w-0 md:flex-1">
                    <h2
                      className="mb-3 text-base text-white sm:text-lg"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                    >
                      {section.title}
                    </h2>
                    <HorizontalScrollRow contentKey={visibleTestimonials.map((t) => t.id).join()}>
                      {visibleTestimonials.map((testimonial) => (
                        <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                      ))}
                    </HorizontalScrollRow>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (section.kind === "category_highlight") {
          const category = section.category_id
            ? settings.product_categories_config.find((c) => c.id === section.category_id)
            : null;
          if (!category) return null;
          const byId = new Map(products.map((product) => [product.id, product]));
          const highlightProducts = category.product_ids
            .map((id) => byId.get(id))
            .filter((product): product is Product => product != null && !purchasedIds.has(product.id))
            .slice(0, 4);
          if (highlightProducts.length === 0) return null;
          return (
            <section key={section.id} className="mt-6 md:mt-9">
              <div className="mb-3">
                {section.subtitle?.trim() ? (
                  <p
                    className="text-[11px] font-normal uppercase tracking-[0.14em] text-bc-primary/70 sm:text-xs"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {section.subtitle.toUpperCase()}
                  </p>
                ) : null}
                <h2
                  className="mt-0.5 text-sm text-bc-primary sm:text-lg"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {section.title.toUpperCase()}
                </h2>
              </div>
              <SuggestedProductsGrid
                products={highlightProducts}
                showLocked={(product) => !canAccess(product)}
                onOpen={openProduct}
              />
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => setLocation(`/dashboard/categoria/${category.id}`)}
                  className="text-[10px] font-normal text-bc-primary hover:underline sm:text-xs"
                >
                  Ver todas →
                </button>
              </div>
            </section>
          );
        }

        const isPurchasedSection = section.mode === "automatic" && section.auto_rule === "purchased";
        const isSuggestedSection = section.id === "suggested";
        let sectionProducts = resolveSectionProducts(section, products, sectionCtx);
        if (isPurchasedSection && bonusProducts.length > 0) {
          const existingIds = new Set(sectionProducts.map((p) => p.id));
          sectionProducts = [
            ...sectionProducts,
            ...bonusProducts.filter((p) => !existingIds.has(p.id)),
          ];
        }
        if (!isPurchasedSection) {
          sectionProducts = sectionProducts.filter((p) => !purchasedIds.has(p.id));
        }

        if (!shouldRenderDashboardSection(section, sectionProducts.length, whatsappUrl)) {
          return null;
        }

        const emptyMessage =
          section.mode === "automatic" && section.auto_rule === "purchased"
            ? "Nenhum produto liberado no momento."
            : isSuggestedSection
              ? "Sem sugestões novas por agora."
              : "Nenhum produto nesta seção.";

        const sectionNode = (
          <section key={section.id}>
            {isSuggestedSection ? (
              <div className="mb-4">
                <p
                  className="text-[11px] font-normal uppercase tracking-[0.14em] text-bc-primary/70 sm:text-xs"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {section.title.toUpperCase()}
                </p>
                <h2
                  className="mt-0.5 text-sm text-bc-primary sm:text-lg"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  PRONTOS PARA USAR
                </h2>
              </div>
            ) : (
              <h2 className="app-section-title">{section.title.toUpperCase()}</h2>
            )}
            {isPurchasedSection ? (
              <>
                <ProductList
                  products={sectionProducts}
                  keyPrefix={section.id}
                  showLocked={(product) => sectionShowsLockedOverlay(section, product, canAccess)}
                  showFrame={false}
                  showTitle={false}
                  imageAspectClass="aspect-square"
                  onOpen={openProduct}
                />
                {sectionProducts.length > 0 && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setLocation("/dashboard/meus-produtos")}
                      className="text-[10px] font-normal text-bc-primary hover:underline sm:text-xs"
                    >
                      Ver todos →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <SuggestedProductsGrid
                products={sectionProducts}
                showLocked={(product) => sectionShowsLockedOverlay(section, product, canAccess)}
                onOpen={openProduct}
              />
            )}
            {sectionProducts.length === 0 && (
              <p className="text-sm text-bc-primary/75">{emptyMessage}</p>
            )}
          </section>
        );

        return sectionNode;
      })
      .filter((block) => block != null);
  }, [
    settings.dashboard_sections_config,
    products,
    sectionCtx,
    whatsappUrl,
    purchasedIds,
    kitBonusRows,
    visibleCategories,
    visibleTestimonials,
    settings.testimonials_banner_url,
    settings.product_categories_config,
    setLocation,
  ]);

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

      <HeroBanner
        logoUrl={logoUrl}
        guestMode={guestMode}
        hasUnread={hasUnread}
        onNotifications={() => setLocation("/notifications")}
        activeHeroUrls={activeHeroUrls}
        isMobile={isMobile}
        showHero={showHero}
        weddingCountdownDays={weddingCountdownDays}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-4 md:pt-5">
        {sectionBlocks.map((block, index) => (
          <div key={index} className={index > 0 ? "mt-6 md:mt-10" : undefined}>
            {block}
          </div>
        ))}
      </div>

      <WelcomePopup open={showWelcomePopup} onOpenChange={setShowWelcomePopup} logoUrl={logoUrl} />
      <DisplayNamePrompt open={showNamePrompt} onSaved={() => setShowNamePrompt(false)} />

      <WhatsAppSupportButton aboveBottomNav />
      <BottomAppNav />
    </div>
  );
}
