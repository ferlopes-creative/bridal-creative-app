/**
 * Login Page — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * Paleta: #677354 (olive), #F7F5F0 (cream bg), #B8A88A (gold), #3A3A3A (text)
 * Tipografia: Playfair Display (títulos small-caps) + Inter (corpo)
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

const FLORAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export default function Login() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/dashboard");
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-between max-w-[480px] mx-auto"
      style={{
        backgroundImage: `url(${FLORAL_BG})`,
        backgroundSize: "400px auto",
        backgroundRepeat: "repeat",
        backgroundColor: "#F7F5F0",
      }}
    >
      {/* Seção superior - Logo e título */}
      <motion.div
        className="flex flex-col items-center pt-12 sm:pt-16 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}
      >
        {/* Monograma ornamental BC */}
        <div className="relative w-[100px] h-[100px] flex items-center justify-center mb-6">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" fill="none">
            <circle cx="50" cy="50" r="46" stroke="#B8A88A" strokeWidth="0.7" />
            <circle cx="50" cy="50" r="40" stroke="#B8A88A" strokeWidth="0.4" />
            {/* Ornamentos cardeais */}
            <path d="M50 4 L51.5 8 L50 7 L48.5 8 Z" fill="#B8A88A" opacity="0.8" />
            <path d="M50 96 L51.5 92 L50 93 L48.5 92 Z" fill="#B8A88A" opacity="0.8" />
            <path d="M4 50 L8 51.5 L7 50 L8 48.5 Z" fill="#B8A88A" opacity="0.8" />
            <path d="M96 50 L92 51.5 L93 50 L92 48.5 Z" fill="#B8A88A" opacity="0.8" />
            {/* Folhas decorativas */}
            <path d="M22 12 Q28 16 24 22" stroke="#B8A88A" strokeWidth="0.5" fill="none" opacity="0.6" />
            <path d="M78 12 Q72 16 76 22" stroke="#B8A88A" strokeWidth="0.5" fill="none" opacity="0.6" />
            <path d="M22 88 Q28 84 24 78" stroke="#B8A88A" strokeWidth="0.5" fill="none" opacity="0.6" />
            <path d="M78 88 Q72 84 76 78" stroke="#B8A88A" strokeWidth="0.5" fill="none" opacity="0.6" />
            <path d="M14 30 Q17 28 15 25" stroke="#B8A88A" strokeWidth="0.4" fill="none" opacity="0.4" />
            <path d="M86 30 Q83 28 85 25" stroke="#B8A88A" strokeWidth="0.4" fill="none" opacity="0.4" />
            <path d="M14 70 Q17 72 15 75" stroke="#B8A88A" strokeWidth="0.4" fill="none" opacity="0.4" />
            <path d="M86 70 Q83 72 85 75" stroke="#B8A88A" strokeWidth="0.4" fill="none" opacity="0.4" />
          </svg>
          <span
            className="relative text-[26px] font-semibold tracking-wider"
            style={{ fontFamily: "var(--font-display)", color: "#677354" }}
          >
            BC
          </span>
        </div>

        {/* Título */}
        <h1
          className="text-[22px] sm:text-[26px] tracking-[0.18em] text-[#3A3A3A] mb-1.5"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontVariant: "small-caps",
          }}
        >
          Bridal Creative
        </h1>

        {/* Subtítulo */}
        <p
          className="text-[13px] text-[#8A8A7A] tracking-[0.04em]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          O seu casamento começa aqui.
        </p>
      </motion.div>

      {/* Seção do formulário */}
      <motion.div
        className="w-full px-6 mt-6 mb-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0, 0, 0.2, 1] }}
      >
        <div className="max-w-[360px] mx-auto bg-white/65 backdrop-blur-sm rounded-2xl p-6 shadow-[0_2px_24px_rgba(0,0,0,0.05)] border border-[#E8E3DA]/50">
          <h2
            className="text-center text-[15px] tracking-[0.14em] text-[#3A3A3A] mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontVariant: "small-caps",
            }}
          >
            Faça seu cadastro
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] text-[#6B6B60] mb-1.5 tracking-[0.02em]"
                style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Mail className="w-4 h-4 text-[#B8A88A]" strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Use o e-mail informado no momento da compra"
                  className="w-full pl-10 pr-4 py-3 text-[13px] bg-white/90 border border-[#E8E3DA] rounded-xl text-[#3A3A3A] placeholder:text-[#B5B5A8] placeholder:text-[11px] focus:outline-none focus:border-[#677354]/50 focus:ring-2 focus:ring-[#677354]/15 transition-all duration-300"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>
            </div>

            <p className="text-center text-[12px] text-[#8A8A7A]" style={{ fontFamily: "var(--font-body)" }}>
              Já tem uma conta?{" "}
              <button
                type="button"
                className="text-[#677354] underline underline-offset-2 hover:text-[#556244] transition-colors duration-200 font-medium"
              >
                Faça login
              </button>
            </p>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#677354] text-white text-[14px] font-medium rounded-xl hover:bg-[#5a6649] active:bg-[#4f5a40] transition-all duration-300 shadow-[0_2px_8px_rgba(103,115,84,0.3)] hover:shadow-[0_4px_16px_rgba(103,115,84,0.35)]"
              style={{
                fontFamily: "var(--font-body)",
                fontVariant: "small-caps",
                letterSpacing: "0.12em",
              }}
            >
              Entrar
            </button>
          </form>
        </div>
      </motion.div>

      {/* Rodapé com WhatsApp */}
      <motion.div
        className="py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <a
          href="https://wa.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#677354] flex items-center justify-center shadow-[0_2px_12px_rgba(103,115,84,0.35)] hover:bg-[#5a6649] transition-all duration-300 hover:scale-105"
          aria-label="Contato via WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </motion.div>
    </div>
  );
}
