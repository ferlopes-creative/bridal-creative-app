import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import WeddingHero from "@/components/WeddingHero";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import { ProductList, type Product } from "@/components/ProductGrid";
import { useAppData } from "@/contexts/AppDataContext";
import {
  useSiteSettings,
  resolveDashboardBackground,
  resolveHeroBannerMobileUrls,
  resolveHeroBannerDesktopUrls,
} from "@/contexts/SiteSettingsContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import { canAccessProduct } from "@/lib/productAccess";
import { resolveSectionProducts } from "@/lib/dashboardSections";
import { isGuestMode } from "@/lib/guestMode";
import { supabase } from "@/lib/supabase";

export default function OwnedProducts() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const { hasUnread } = useNotificationBellBadge();
  const { products, purchasedIds, kitBonusRows, ready } = useAppData();
  const [weddingName, setWeddingName] = useState<string | null>(null);
  const [weddingDaysLeft, setWeddingDaysLeft] = useState<number | null>(null);
  const guestMode = isGuestMode();

  const pageBgUrl = resolveDashboardBackground(settings);
  const logoUrl = settings.logo_url;
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
    const loadWeddingInfo = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setWeddingName(null);
        setWeddingDaysLeft(null);
        return;
      }
      const registeredName = (userData.user.user_metadata?.display_name as string | undefined)?.trim();
      const { data: weddingData } = await supabase
        .from("wedding_details")
        .select("bride_name, wedding_date")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      setWeddingName(registeredName || weddingData?.bride_name?.trim() || null);
      if (weddingData?.wedding_date) {
        const [y, m, d] = weddingData.wedding_date.split("-").map(Number);
        const target = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setWeddingDaysLeft(Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000)));
      } else {
        setWeddingDaysLeft(null);
      }
    };
    loadWeddingInfo();
  }, []);

  const canAccess = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

  const sectionCtx = useMemo(
    () => ({
      purchasedIds,
      canAccess,
      visibleInCatalog: () => true,
    }),
    [purchasedIds, kitBonusRows, products]
  );

  const ownedProducts = useMemo(() => {
    const purchased = resolveSectionProducts(
      { id: "owned", title: "", kind: "products", mode: "automatic", auto_rule: "purchased" },
      products,
      sectionCtx
    );
    const bonus = resolveSectionProducts(
      { id: "bonus", title: "", kind: "products", mode: "automatic", auto_rule: "bonus" },
      products,
      sectionCtx
    );
    const existingIds = new Set(purchased.map((p) => p.id));
    return [...purchased, ...bonus.filter((p) => !existingIds.has(p.id))];
  }, [products, sectionCtx]);

  if (!ready) {
    return (
      <div className="relative min-h-screen bg-bc-page-bg">
        <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
        <PageLoading label="Carregando seus produtos..." className="relative min-h-screen" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bc-page-bg pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />

      <WeddingHero
        logoUrl={logoUrl}
        guestMode={guestMode}
        hasUnread={hasUnread}
        onNotifications={() => setLocation("/notifications")}
        weddingName={weddingName}
        weddingDaysLeft={weddingDaysLeft}
        onPlanning={() => setLocation("/planejamento")}
        activeHeroUrls={activeHeroUrls}
        isMobile={isMobile}
        showHero={showHero}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-10 md:pt-12">
        <h2 className="app-section-title">Meus produtos</h2>
        {ownedProducts.length === 0 ? (
          <p className="text-sm text-bc-primary/75">Nenhum produto liberado no momento.</p>
        ) : (
          <ProductList
            products={ownedProducts}
            keyPrefix="owned"
            showLocked={false}
            showFrame={false}
            imageAspectClass="aspect-square"
            stacked
            onOpen={(id) => setLocation(`/dashboard/product/${id}`)}
          />
        )}
      </div>

      <WhatsAppSupportButton aboveBottomNav />
      <BottomAppNav />
    </div>
  );
}
