import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import { ProductList, type Product } from "@/components/ProductGrid";
import { useAppData } from "@/contexts/AppDataContext";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import { canAccessProduct } from "@/lib/productAccess";
import { resolveSectionProducts } from "@/lib/dashboardSections";

export default function OwnedProducts() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const { products, purchasedIds, kitBonusRows, ready } = useAppData();

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;

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
        <PageLoading label="Carregando conteúdo..." className="relative min-h-screen" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bc-page-bg px-4 py-6">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      <div className="relative mx-auto mb-6 flex w-full max-w-6xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-bc-primary hover:bg-bc-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          <BrandLogo src={logoUrl} className="max-h-11 max-w-11 object-contain" />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <h1
          className="mb-5 text-lg text-bc-primary sm:text-xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          Meus produtos
        </h1>

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
    </div>
  );
}
