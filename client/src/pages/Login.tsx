import { useState } from "react";
import { Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import BrandLogo from "@/components/BrandLogo";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const serifFont = "'Cormorant Garamond', 'Cinzel', 'Times New Roman', serif";
  const sansFont = "'Montserrat', 'Lato', 'Arial', sans-serif";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setLoading(true);
    try {
      const bypassEmails = (import.meta.env.VITE_DEV_BYPASS_EMAILS || "")
        .split(",")
        .map((item: string) => item.trim().toLowerCase())
        .filter(Boolean);
      const shouldBypass = bypassEmails.includes(email.trim().toLowerCase());

      if (shouldBypass) {
        localStorage.setItem("dev_bypass_auth", "true");
        setLocation("/dashboard");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({ email });
      if (!error) {
        setLocation("/dashboard");
        return;
      }

      const message = (error.message || "").toLowerCase();
      const userNotFound =
        message.includes("user not found") ||
        message.includes("invalid login credentials") ||
        message.includes("not registered");

      if (userNotFound) {
        const tempPassword = `${Math.random().toString(36).slice(2)}A!9`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: tempPassword,
        });

        if (signUpError) throw signUpError;
        setLocation("/dashboard");
        return;
      }

      throw error;
    } catch (error) {
      console.error("Erro ao enviar magic link:", error);
      alert("Não foi possível enviar o link de acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 py-10 md:py-14"
      style={{
        backgroundColor: "#F9F9F7",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: `url(${FLORAL_BG})`, backgroundSize: "420px auto", backgroundRepeat: "repeat" }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[460px] items-center justify-center">
        <section className="w-full">
          <header className="mb-12 flex flex-col items-center text-center">
            <BrandLogo className="mx-auto mb-8 h-[100px] w-auto max-w-[160px]" />

            <h1
              className="text-[42px] leading-none text-[#6B7459] md:text-[52px]"
              style={{
                fontFamily: serifFont,
                fontWeight: 500,
                letterSpacing: "0.15em",
              }}
            >
              BRIDAL CREATIVE
            </h1>
            <p
              className="mt-3 text-[11px] text-[#7B776D]"
              style={{ letterSpacing: "0.15em", fontFamily: sansFont, fontWeight: 300 }}
            >
              O SEU CASAMENTO COMEÇA AQUI.
            </p>
          </header>

          <div className="mx-auto max-w-[400px] rounded-xl border border-[#e9e9e6] bg-transparent p-10">
            <h2
              className="mb-9 text-center text-[24px] font-medium uppercase tracking-widest text-[#6B7459]"
              style={{
                fontFamily: serifFont,
              }}
            >
              FAÇA SEU CADASTRO
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="mx-auto max-w-[320px]">
                <label
                  htmlFor="email"
                  className="mb-2 block text-[13px] font-light uppercase tracking-widest text-[#6B7459]"
                  style={{
                    fontFamily: sansFont,
                  }}
                >
                  EMAIL
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B7459]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="USE O E-MAIL INFORMADO NO MOMENTO DA COMPRA."
                    className="h-9 w-full rounded-md border border-[#ddddda] bg-transparent pr-3 pl-9 text-xs text-[#3F3F39] placeholder:text-[9px] placeholder:font-light placeholder:tracking-widest placeholder:text-[#b5b2aa] outline-none transition focus:border-[#6B7459]"
                    style={{ fontFamily: sansFont }}
                    required
                  />
                </div>
              </div>

              <p
                className="text-center text-[12px] uppercase tracking-widest text-[#7B776D]"
                style={{ fontFamily: sansFont, letterSpacing: "0.08em" }}
              >
                JÁ TEM UMA CONTA?{" "}
                <a href="/" className="underline decoration-1 underline-offset-2">
                  FAÇA LOGIN
                </a>
              </p>

              <div className="flex w-full justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="inline-flex h-10 min-w-[200px] items-center justify-center gap-2 rounded-lg px-8 text-[22px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  style={{
                    backgroundColor: "#6B7459",
                    fontFamily: serifFont,
                    letterSpacing: "0.15em",
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner className="size-5 shrink-0 text-white" />
                      ENVIANDO...
                    </>
                  ) : (
                    "ENTRAR"
                  )}
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem("dev_bypass_auth", "true");
                setLocation("/dashboard");
              }}
              className="mt-6 mx-auto block text-[10px] uppercase tracking-widest text-[#a5a198] hover:text-[#6B7459]"
              style={{ fontFamily: sansFont }}
            >
              Login de Desenvolvedor
            </button>
          </div>
        </section>
      </div>

      <a
        href={import.meta.env.VITE_WHATSAPP_URL || "https://wa.me/"}
        target="_blank"
        rel="noreferrer"
        className="fixed right-5 bottom-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#6B7459] text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-90"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.55 1.75 6.53L3 29l6.66-1.73A12.96 12.96 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Z" fill="white" fillOpacity="0.2" />
          <path
            d="M10.9 9.9c.3-.67.62-.68.9-.7h.77c.23 0 .55.08.84.65.3.57 1.02 1.97 1.12 2.12.1.15.16.33.03.54-.13.2-.2.33-.38.52-.18.2-.38.44-.54.58-.18.15-.36.3-.15.6.21.3.94 1.55 2.03 2.5 1.4 1.22 2.58 1.6 2.95 1.78.36.18.58.15.8-.09.2-.24.87-1.01 1.1-1.36.24-.35.47-.29.8-.18.33.12 2.06.97 2.42 1.15.35.18.58.27.67.42.09.15.09.88-.2 1.74-.29.86-1.72 1.65-2.4 1.73-.62.08-1.4.12-2.27-.15-.53-.17-1.22-.4-2.1-.78-3.7-1.6-6.1-5.34-6.28-5.6-.18-.27-1.5-2-.1-3.84Z"
            fill="white"
          />
        </svg>
      </a>
    </div>
  );
}