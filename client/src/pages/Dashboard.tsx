/**
 * Dashboard Page — Bridal Creative
 * Produtos dinâmicos + bônus automáticos
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/BottomNav";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/hero-dashboard-3bwfV63NU8FVBh4sbUDr2w.webp";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

const BONUS_PRODUCTS = [
  "site-casamento",
  "manual-padrinhos",
  "save-the-date",
  "convite-video",
];

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLocation("/");
        return;
      }

      // pegar compras
      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("status", "active");

      const purchasedIds =
        purchasesData?.map((p) => p.product_id) || [];

      setPurchases(purchasedIds);

      // pegar produtos
      const { data: productsData } = await supabase
        .from("products")
        .select("*");

      if (productsData) {
        setProducts(productsData);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const hasAccess = (id: string) => purchases.includes(id);

  const hasConvites = hasAccess("convites");

  const userProducts = products.filter((p) => {
    if (hasConvites && BONUS_PRODUCTS.includes(p.id)) return true;
    return hasAccess(p.id);
  });

  const lockedProducts = products.filter((p) => {
    if (hasConvites && BONUS_PRODUCTS.includes(p.id)) return false;
    return !hasAccess(p.id);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
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

      {/* PRODUTOS COMPRADOS */}
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
          {userProducts.map((product) => (
            <ProductCard
              key={product.id}
              title={product.name}
              locked={false}
            />
          ))}
        </div>
      </section>

      {/* PRODUTOS BLOQUEADOS */}
      <section className="px-5 mt-9">
        <h2
          className="mb-4 text-[17px]"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
          }}
        >
          Disponível para você
        </h2>

        <div className="flex gap-4 flex-wrap">
          {lockedProducts.map((product) => (
            <ProductCard
              key={product.id}
              title={product.name}
              locked={true}
            />
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}