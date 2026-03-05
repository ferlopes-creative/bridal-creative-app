/**
 * Dashboard Page — Bridal Creative
 * Área de membros com bônus automáticos ao comprar "convites"
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/BottomNav";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/hero-dashboard-3bwfV63NU8FVBh4sbUDr2w.webp";

const PRODUCT_CONVITES =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-convites-icGCijVnJ8YrAisPF779Ja.webp";

const PRODUCT_MENU =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-menu-8fF3qQuSeZEDW2wUNBPvC6.webp";

const PRODUCT_VENTAROLA =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-ventarola-XyZhQnZPw6CkFLubxmxdwo.webp";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [userProducts, setUserProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔐 Verifica login + carrega compras
  useEffect(() => {
    const loadUser = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLocation("/");
        return;
      }

      const { data } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("status", "active");

      if (data) {
        const productIds = data.map((p) => p.product_id);
        setUserProducts(productIds);
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const hasAccess = (productId: string) => {
    return userProducts.includes(productId);
  };

  // 🎁 Regra: se comprou convites, libera todos bônus
  const hasConvites = hasAccess("convites");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ fontFamily: "var(--font-body)" }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 w-full max-w-7xl mx-auto"
      style={{
        backgroundImage: `url(${FLORAL_BG})`,
        backgroundSize: "400px auto",
        backgroundRepeat: "repeat",
        backgroundColor: "#F7F5F0",
      }}
    >
      <Header />

      {/* HERO */}
      <section className="mx-4 mt-2 rounded-2xl overflow-hidden shadow-lg">
        <div className="relative h-[260px] bg-[#677354]">
          <img
            src={HERO_IMG}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#677354]/85 via-[#677354]/50 to-transparent" />
          <div className="relative z-10 flex items-center h-full px-7">
            <h2
              className="text-white text-[22px]"
              style={{
                fontFamily: "var(--font-display)",
                fontVariant: "small-caps",
              }}
            >
              Nosso propósito é tornar seu sonho uma realidade!
            </h2>
          </div>
        </div>
      </section>

      {/* SEUS PRODUTOS */}
      <section className="px-5 mt-8">
        <h2
          className="mb-4 text-[17px]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
          }}
        >
          Seus Produtos
        </h2>

        <div className="flex gap-4 flex-wrap">
          <ProductCard
            image={PRODUCT_CONVITES}
            title="Kit de Convites Editáveis"
            locked={!hasConvites}
            size="large"
          />
        </div>
      </section>

      {/* 🎁 BÔNUS INCLUSOS */}
      <section className="px-5 mt-9">
        <h2
          className="mb-4 text-[17px]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
          }}
        >
          Bônus Inclusos
        </h2>

        <div className="flex gap-4 flex-wrap">
          <ProductCard
            image={PRODUCT_CONVITES}
            title="Site Editável"
            locked={!hasConvites}
          />

          <ProductCard
            image={PRODUCT_CONVITES}
            title="Save the Date"
            locked={!hasConvites}
          />

          <ProductCard
            image={PRODUCT_CONVITES}
            title="Manual dos Padrinhos"
            locked={!hasConvites}
          />

          <ProductCard
            image={PRODUCT_CONVITES}
            title="Manual de Edição"
            locked={!hasConvites}
          />

          <ProductCard
            image={PRODUCT_CONVITES}
            title="Convite Vídeo Editável"
            locked={!hasConvites}
          />
        </div>
      </section>

      {/* OUTROS PRODUTOS */}
      <section className="px-5 mt-9">
        <h2
          className="mb-4 text-[17px]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
          }}
        >
          Outros Produtos
        </h2>

        <div className="flex gap-3 overflow-x-auto pb-4">
          <ProductCard
            image={PRODUCT_VENTAROLA}
            title="Ventarola"
            locked={!hasAccess("ventarola")}
          />

          <ProductCard
            image={PRODUCT_MENU}
            title="Menu Editável"
            locked={!hasAccess("menu")}
          />
        </div>
      </section>

      <BottomNav />
    </div>
  );
}