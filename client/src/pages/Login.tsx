/**
 * Login Page — Bridal Creative
 * Desktop Responsive + Supabase Magic Link
 */

import { useState } from "react";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert("Erro ao enviar email.");
      setLoading(false);
      return;
    }

    alert("Verifique seu email para entrar.");
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{
        backgroundImage: `url(${FLORAL_BG})`,
        backgroundSize: "400px auto",
        backgroundRepeat: "repeat",
        backgroundColor: "#F7F5F0",
      }}
    >
      <div className="w-full max-w-md lg:max-w-6xl bg-transparent flex flex-col lg:flex-row items-center justify-center gap-16 py-16">

        {/* LADO ESQUERDO — BRANDING (desktop) */}
        <motion.div
          className="hidden lg:flex flex-col items-center text-center"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-6">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" fill="none">
              <circle cx="50" cy="50" r="46" stroke="#B8A88A" strokeWidth="0.7" />
              <circle cx="50" cy="50" r="40" stroke="#B8A88A" strokeWidth="0.4" />
            </svg>
            <span
              className="relative text-[30px] font-semibold tracking-wider"
              style={{ fontFamily: "var(--font-display)", color: "#677354" }}
            >
              BC
            </span>
          </div>

          <h1
            className="text-[28px] tracking-[0.18em] text-[#3A3A3A] mb-2"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontVariant: "small-caps",
            }}
          >
            Bridal Creative
          </h1>

          <p
            className="text-[14px] text-[#8A8A7A]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            O seu casamento começa aqui.
          </p>
        </motion.div>

        {/* FORM */}
        <motion.div
          className="w-full max-w-[420px] bg-white/70 backdrop-blur-md rounded-2xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#E8E3DA]/60"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2
            className="text-center text-[16px] tracking-[0.14em] text-[#3A3A3A] mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontVariant: "small-caps",
            }}
          >
            Acessar sua área
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] text-[#6B6B60] mb-2"
                style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8A88A]" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Use o e-mail informado na compra"
                  className="w-full pl-11 pr-4 py-3 text-[14px] bg-white border border-[#E8E3DA] rounded-xl text-[#3A3A3A] placeholder:text-[#B5B5A8] focus:outline-none focus:border-[#677354]/50 focus:ring-2 focus:ring-[#677354]/15 transition-all duration-300"
                  style={{ fontFamily: "var(--font-body)" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#677354] text-white text-[15px] rounded-xl hover:bg-[#5a6649] transition-all duration-300 shadow-[0_4px_16px_rgba(103,115,84,0.35)] disabled:opacity-70"
              style={{
                fontFamily: "var(--font-body)",
                fontVariant: "small-caps",
                letterSpacing: "0.12em",
              }}
            >
              {loading ? "Enviando..." : "Entrar"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}