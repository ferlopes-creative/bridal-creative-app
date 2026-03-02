/**
 * Dashboard Page — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * Paleta: #677354 (olive), #F7F5F0 (cream bg), #B8A88A (gold), #3A3A3A (text)
 * Tipografia: Playfair Display (títulos small-caps) + Inter (corpo)
 */

import { motion } from "framer-motion";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/BottomNav";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/hero-dashboard-3bwfV63NU8FVBh4sbUDr2w.webp";
const PRODUCT_CONVITES = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-convites-icGCijVnJ8YrAisPF779Ja.webp";
const PRODUCT_VENTAROLA = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-ventarola-XyZhQnZPw6CkFLubxmxdwo.webp";
const PRODUCT_MENU = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/product-menu-8fF3qQuSeZEDW2wUNBPvC6.webp";
const FLORAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

const myProducts = [
  { image: PRODUCT_CONVITES, title: "Kit de Convites Editáveis", locked: false },
];

const suggestedProducts = [
  { image: PRODUCT_VENTAROLA, title: "Ventarola", locked: true },
  { image: PRODUCT_MENU, title: "Menu Editável", locked: true },
  { image: PRODUCT_CONVITES, title: "Menu Editável", locked: true },
  { image: PRODUCT_VENTAROLA, title: "Ventarola", locked: true },
];

const bonusProducts = [
  { image: PRODUCT_CONVITES, title: "Kit de Convites Editáveis", locked: false },
  { image: PRODUCT_CONVITES, title: "Kit de Convites Editáveis", locked: false },
];

const otherProducts = [
  { image: PRODUCT_MENU, title: "Menu Editável", locked: true },
  { image: PRODUCT_CONVITES, title: "Kit de Convites Editáveis", locked: true },
  { image: PRODUCT_VENTAROLA, title: "Ventarola", locked: true },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[17px] tracking-[0.14em] text-[#3A3A3A] mb-4"
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontVariant: "small-caps",
      }}
    >
      {children}
    </h2>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function Dashboard() {
  return (
    <div
      className="min-h-screen pb-28 w-full max-w-7xl mx-auto relative"
      style={{
        backgroundImage: `url(${FLORAL_BG})`,
        backgroundSize: "400px auto",
        backgroundRepeat: "repeat",
        backgroundColor: "#F7F5F0",
      }}
    >
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <motion.section
        className="mx-4 mt-2 rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
      >
        <div className="relative h-[260px] sm:h-[300px] bg-[#677354]">
          <img
            src={HERO_IMG}
            alt="Wedding stationery collection"
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#677354]/85 via-[#677354]/50 to-transparent" />
          <div className="relative z-10 flex flex-col justify-center h-full px-7">
            <motion.h2
              className="text-white text-[22px] sm:text-[26px] leading-[1.3] max-w-[220px]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontVariant: "small-caps",
                letterSpacing: "0.06em",
                textShadow: "0 2px 12px rgba(0,0,0,0.25)",
              }}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Nosso propósito é tornar seu sonho uma realidade!
            </motion.h2>
          </div>
        </div>
      </motion.section>

      {/* Seus Produtos */}
      <motion.section
        className="px-5 mt-8"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.15}
      >
        <SectionTitle>Seus Produtos</SectionTitle>
        <div className="flex gap-4">
          {myProducts.map((product, i) => (
            <ProductCard key={`my-${i}`} {...product} size="large" />
          ))}
        </div>
      </motion.section>

      {/* Pensados para Você */}
      <motion.section
        className="mt-9"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.25}
      >
        <div className="px-5">
          <SectionTitle>Pensados para Você</SectionTitle>
        </div>
        <div
          className="flex gap-3 overflow-x-auto px-5 pb-3 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
          {suggestedProducts.map((product, i) => (
            <div key={`sug-${i}`} className="snap-start flex-shrink-0">
              <ProductCard {...product} />
            </div>
          ))}
        </div>
        {/* Scroll indicator */}
        <div className="flex justify-center mt-3 gap-1.5">
          <div className="w-10 h-[2.5px] bg-[#677354] rounded-full" />
          <div className="w-10 h-[2.5px] bg-[#D4CFC5] rounded-full" />
          <div className="w-10 h-[2.5px] bg-[#D4CFC5] rounded-full" />
        </div>
      </motion.section>

      {/* Bônus */}
      <motion.section
        className="px-5 mt-9"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.35}
      >
        <SectionTitle>Bônus</SectionTitle>
        <div className="flex gap-4">
          {bonusProducts.map((product, i) => (
            <ProductCard key={`bonus-${i}`} {...product} />
          ))}
        </div>
      </motion.section>

      {/* CTA Personalização */}
      <motion.section
        className="mx-5 mt-9 bg-[#677354] rounded-2xl py-5 px-6 text-center shadow-[0_2px_16px_rgba(103,115,84,0.25)]"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.45}
      >
        <p
          className="text-white/95 text-[15px] leading-relaxed"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
            letterSpacing: "0.06em",
          }}
        >
          Quer algo totalmente personalizado?
        </p>
        <a
          href="#"
          className="inline-block mt-1.5 text-white text-[15px] underline underline-offset-4 decoration-[#B8A88A] hover:decoration-white transition-colors duration-300 font-medium"
          style={{
            fontFamily: "var(--font-display)",
            fontVariant: "small-caps",
            letterSpacing: "0.06em",
          }}
        >
          Chame a nossa equipe
        </a>
      </motion.section>

      {/* Outros Produtos */}
      <motion.section
        className="px-5 mt-9"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.55}
      >
        <SectionTitle>Outros Produtos</SectionTitle>
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
          {otherProducts.map((product, i) => (
            <div key={`other-${i}`} className="flex-shrink-0">
              <ProductCard {...product} size="small" />
            </div>
          ))}
        </div>
      </motion.section>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
