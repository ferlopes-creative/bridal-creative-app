import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Star } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { HorizontalScrollRow } from "@/components/HorizontalScrollRow";
import { PageLoading } from "@/components/PageLoading";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { ProductList, type Product } from "@/components/ProductGrid";
import { SiteBannerCarousel } from "@/components/SiteBannerCarousel";
import { formatTestimonialDate, type TestimonialConfig } from "@/lib/testimonials";
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

  const visibleCategories = useMemo(
    () =>
      settings.product_categories_config.filter(
        (category) => category.visible && category.product_ids.length > 0
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

        const sectionNode = (
          <section key={isPurchasedSection ? undefined : section.id}>
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

        if (!isPurchasedSection) {
          return sectionNode;
        }

        return (
          <Fragment key={section.id}>
            {sectionNode}
            {visibleCategories.length > 0 ? (
              <section className="mt-6 md:mt-9">
                <h2 className="app-section-title">EXPLORE</h2>
                <div className="flex gap-6 overflow-x-auto pb-1 sm:gap-10">
                  {visibleCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setLocation(`/dashboard/categoria/${category.id}`)}
                      className="flex shrink-0 flex-col items-center gap-2"
                    >
                      <span className="h-24 w-24 overflow-hidden rounded-full bg-bc-banner-light ring-1 ring-bc-primary/10 sm:h-28 sm:w-28">
                        {category.photo_url ? (
                          <img
                            src={category.photo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
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
            ) : null}
            {visibleTestimonials.length > 0 ? (
              <section className="mt-8 mb-2 md:mt-12">
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
                        O que as noivas dizem…
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
            ) : null}
          </Fragment>
        );
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
