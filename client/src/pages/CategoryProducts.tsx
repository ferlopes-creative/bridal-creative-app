import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import { ProductList, type Product } from "@/components/ProductGrid";
import { useAppData } from "@/contexts/AppDataContext";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import { canAccessProduct } from "@/lib/productAccess";
import { categoryProductIdsIncludingSubcategories, subcategoriesOf } from "@/lib/productCategories";

export default function CategoryProducts() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/categoria/:id");
  const { settings } = useSiteSettings();
  const { products, purchasedIds, kitBonusRows, ready } = useAppData();
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;

  const category = useMemo(
    () => settings.product_categories_config.find((item) => item.id === params?.id) ?? null,
    [settings.product_categories_config, params?.id]
  );

  const subcategories = useMemo(
    () =>
      category
        ? subcategoriesOf(settings.product_categories_config, category.id).filter((sub) => sub.visible)
        : [],
    [settings.product_categories_config, category]
  );

  const categoryProducts = useMemo(() => {
    if (!category) return [];
    const idsInScope =
      activeSubcategoryId != null
        ? settings.product_categories_config.find((item) => item.id === activeSubcategoryId)
            ?.product_ids ?? []
        : categoryProductIdsIncludingSubcategories(settings.product_categories_config, category.id);

    const byId = new Map(products.map((product) => [product.id, product]));
    const term = search.trim().toLowerCase();
    return idsInScope
      .map((id) => byId.get(id))
      .filter((product): product is Product => product != null && !purchasedIds.has(product.id))
      .filter((product) => !term || (product.name || "").toLowerCase().includes(term));
  }, [category, activeSubcategoryId, settings.product_categories_config, products, purchasedIds, search]);

  const canAccess = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

  if (!match) {
    setLocation("/dashboard");
    return null;
  }

  if (!ready) {
    return (
      <div className="relative min-h-screen bg-bc-page-bg">
        <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
        <PageLoading label="Carregando conteúdo..." className="relative min-h-screen" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bc-page-bg px-4">
        <p className="text-sm text-zinc-600">Atalho não encontrado.</p>
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="rounded-md bg-bc-primary px-4 py-2 text-sm text-white"
        >
          Voltar ao início
        </button>
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
          {category.name || "Categoria"}
        </h1>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bc-primary/40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar em ${category.name || "categoria"}...`}
            className="h-11 w-full rounded-md border border-bc-primary/15 bg-white pl-9 pr-3 text-sm text-bc-primary outline-none focus:border-bc-primary/40"
          />
        </div>

        {subcategories.length > 0 && (
          <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setActiveSubcategoryId(null)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeSubcategoryId == null
                  ? "border-bc-primary bg-bc-primary text-white"
                  : "border-bc-primary/25 text-bc-primary hover:bg-bc-primary/5"
              }`}
            >
              Todos
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveSubcategoryId(sub.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeSubcategoryId === sub.id
                    ? "border-bc-primary bg-bc-primary text-white"
                    : "border-bc-primary/25 text-bc-primary hover:bg-bc-primary/5"
                }`}
              >
                {sub.name || "Subcategoria"}
              </button>
            ))}
          </div>
        )}

        {categoryProducts.length === 0 ? (
          <p className="text-sm text-bc-primary/75">
            {search.trim() ? "Nenhum produto encontrado pra essa busca." : "Nenhum produto aqui ainda."}
          </p>
        ) : (
          <ProductList
            products={categoryProducts}
            keyPrefix={category.id}
            showLocked={(product) => !canAccess(product)}
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
