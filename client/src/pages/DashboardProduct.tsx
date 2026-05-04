import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { PageLoading } from "@/components/PageLoading";
import ProductView from "@/components/ProductView";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import type { KitBonusRow } from "@/lib/kitBonus";
import { canAccessProduct } from "@/lib/productAccess";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  descricao?: string | null;
  type?: string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
  link?: string | null;
};

export default function DashboardProduct() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const [match, params] = useRoute("/dashboard/product/:id");
  const [product, setProduct] = useState<Product | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [kitBonusRows, setKitBonusRows] = useState<KitBonusRow[]>([]);
  const [loading, setLoading] = useState(true);

  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;

  useEffect(() => {
    const loadProduct = async () => {
      const isDevBypass = localStorage.getItem("dev_bypass_auth") === "true";
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user && !isDevBypass) {
        setLocation("/");
        return;
      }

      if (!match || !params?.id) {
        setLocation("/dashboard");
        return;
      }

      if (userData.user) {
        const { data: purchasesData } = await supabase
          .from("purchases")
          .select("product_id, status")
          .eq("user_id", userData.user.id)
          .eq("status", "active");
        if (purchasesData) {
          setPurchasedIds(new Set(purchasesData.map((p) => p.product_id)));
        }
      }

      const { data: kbData } = await supabase.from("kit_bonus_products").select("kit_product_id, bonus_product_id");
      if (kbData) setKitBonusRows(kbData as KitBonusRow[]);

      const productId = decodeURIComponent(String(params.id)).trim();

      const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();

      if (error) {
        console.error("DashboardProduct / products:", error.message, error);
      }

      if (data) {
        const item = data as Record<string, unknown>;
        setProduct({
          id: String(item.id),
          name: (item.name ?? item.title ?? "Produto") as string,
          title: item.title as string | null | undefined,
          description: (item.description ?? item.descricao) as string | null | undefined,
          descricao: item.descricao as string | null | undefined,
          type: (item.type ?? item.tipo ?? "PRO") as string,
          image_url: (item.image_url ?? item.image) as string | null | undefined,
          image: item.image as string | null | undefined,
          thumbnail_url: item.thumbnail_url as string | null | undefined,
          video_url: (item.video_url ?? item.video) as string | null | undefined,
          link_compra: (item.link_compra ?? item.link) as string | null | undefined,
          link: item.link as string | null | undefined,
        });
      }
      setLoading(false);
    };

    loadProduct();
  }, [match, params?.id]);

  const canAccess = product ? canAccessProduct(product, purchasedIds, kitBonusRows) : false;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#F7F5F0]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `url(${pageBgUrl})`,
            backgroundSize: "360px auto",
            backgroundRepeat: "repeat",
            backgroundColor: "#FBFAF6",
          }}
        />
        <PageLoading label="Carregando conteúdo..." className="relative min-h-screen" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F5F0] px-4">
        <p className="text-sm text-zinc-600">Produto não encontrado.</p>
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="rounded-md bg-[#6B705C] px-4 py-2 text-sm text-white"
        >
          Voltar ao dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F7F5F0] px-4 py-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url(${pageBgUrl})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
          backgroundColor: "#FBFAF6",
        }}
      />
      <div className="relative mx-auto mb-6 flex w-full max-w-3xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[#6B705C] hover:bg-[#6B705C]/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">
          <BrandLogo src={logoUrl} className="max-h-11 max-w-11 object-contain" />
        </div>
      </div>
      <div className="relative w-full min-w-0">
        <ProductView product={product} canAccess={canAccess} />
      </div>
    </div>
  );
}
