import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import { ProductList, type Product } from "@/components/ProductGrid";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import type { KitBonusRow } from "@/lib/kitBonus";
import { canAccessProduct } from "@/lib/productAccess";
import { supabase } from "@/lib/supabase";

export default function CategoryProducts() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/categoria/:id");
  const { settings } = useSiteSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [kitBonusRows, setKitBonusRows] = useState<KitBonusRow[]>([]);
  const [loading, setLoading] = useState(true);

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;

  useEffect(() => {
    const load = async () => {
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
      }

      const { data: kbData } = await supabase
        .from("kit_bonus_products")
        .select("kit_product_id, bonus_product_id");
      if (kbData) setKitBonusRows(kbData as KitBonusRow[]);

      const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
      if (error) {
        console.error("CategoryProducts / products:", error.message, error);
      } else if (data) {
        setProducts(
          data.map((item: any) => ({
            id: item.id,
            name: item.name ?? item.title ?? "Produto",
            type: (item.type ?? item.tipo ?? "PRO") as "PRO" | "BON" | string,
            image_url: item.image_url ?? item.image ?? null,
            image: item.image ?? null,
            thumbnail_url: item.thumbnail_url ?? null,
            link_compra: item.link_compra ?? item.link ?? null,
          }))
        );
      }
      setLoading(false);
    };

    void load();
  }, []);

  const category = useMemo(
    () => settings.product_categories_config.find((item) => item.id === params?.id) ?? null,
    [settings.product_categories_config, params?.id]
  );

  const categoryProducts = useMemo(() => {
    if (!category) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return category.product_ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => product != null);
  }, [category, products]);

  const canAccess = (product: Product) => canAccessProduct(product, purchasedIds, kitBonusRows);

  if (!match) {
    setLocation("/dashboard");
    return null;
  }

  if (loading) {
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

        {categoryProducts.length === 0 ? (
          <p className="text-sm text-bc-primary/75">Nenhum produto neste atalho ainda.</p>
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
