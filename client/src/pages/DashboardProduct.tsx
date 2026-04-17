import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import ProductView from "@/components/ProductView";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
};

export default function DashboardProduct() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dashboard/product/:id");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

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

      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, image_url, image, thumbnail_url, video_url, link_compra")
        .eq("id", params.id)
        .single();

      if (!error && data) {
        setProduct(data);
      }
      setLoading(false);
    };

    loadProduct();
  }, [match, params?.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0]">
        <p className="text-sm text-[#6B705C]">Carregando conteúdo...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F5F0]">
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
    <div className="min-h-screen bg-[#F7F5F0] px-4 py-6">
      <div className="mx-auto mb-4 w-full max-w-3xl">
        <button
          type="button"
          onClick={() => setLocation("/dashboard")}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-[#6B705C] hover:bg-[#6B705C]/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>
      <ProductView product={product} />
    </div>
  );
}
