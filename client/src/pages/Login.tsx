import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import BrandLogo from "@/components/BrandLogo";
import { useSiteSettings, resolveLoginPageBackground } from "@/contexts/SiteSettingsContext";
import { useLocation } from "wouter";
import { loginOrRegisterWithEmail } from "@/lib/authEmailLogin";
import { clearGuestMode, setGuestMode } from "@/lib/guestMode";
import { isSupabaseConfigured } from "@/lib/supabase";
import { markWelcomePopupPending } from "@/lib/welcomePopup";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";

export default function Login() {
  const [, setLocation] = useLocation();
  const { settings, refresh: refreshSiteSettings } = useSiteSettings();

  useEffect(() => {
    void refreshSiteSettings();
  }, [refreshSiteSettings]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const serifFont = "'Cormorant Garamond', 'Cinzel', 'Times New Roman', serif";
  const sansFont = "'Montserrat', 'Lato', 'Arial', sans-serif";

  const pageBgUrl = resolveLoginPageBackground(settings);
  const logoUrl = settings.logo_url;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    if (!isSupabaseConfigured) {
      alert(
        "Supabase não está configurado neste deploy. Na Vercel, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY e faça redeploy."
      );
      return;
    }

    setLoading(true);
    try {
      const { isNewUser } = await loginOrRegisterWithEmail(email);
      clearGuestMode();
      if (isNewUser) {
        markWelcomePopupPending();
      }
      setLocation("/dashboard");
    } catch (error) {
      console.error("Erro ao acessar:", error);
      const message =
        error instanceof Error ? error.message : "Não foi possível acessar com este e-mail.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: "#F9F9F7" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: `url(${pageBgUrl})`, backgroundSize: "420px auto", backgroundRepeat: "repeat" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[420px] items-center justify-center px-4 py-8 md:py-12">
        <section className="w-full">
          <header className="mb-8 flex flex-col items-center text-center md:mb-10">
            <BrandLogo src={logoUrl} className="mx-auto mb-5 h-[76px] w-auto max-w-[132px] md:h-[88px] md:max-w-[148px]" />

            <h1
              className="text-[26px] leading-none text-[#6B7459] md:text-[32px]"
              style={{
                fontFamily: serifFont,
                fontWeight: 500,
                letterSpacing: "0.12em",
              }}
            >
              BRIDAL CREATIVE
            </h1>
            <p
              className="mt-2 text-[9px] text-[#7B776D] md:text-[10px]"
              style={{ letterSpacing: "0.12em", fontFamily: sansFont, fontWeight: 300 }}
            >
              O SEU CASAMENTO COMEÇA AQUI.
            </p>
          </header>

          <div className="mx-auto max-w-[400px] rounded-xl border border-[#e9e9e6] bg-transparent p-6 md:p-8">
            {!isSupabaseConfigured && (
              <p
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-center text-[10px] leading-snug text-amber-900"
                role="alert"
              >
                Ambiente sem Supabase (variáveis VITE_* em falta). Configure na Vercel e publique de novo.
              </p>
            )}
            <h2
              className="mb-6 text-center text-[17px] font-medium uppercase tracking-[0.18em] text-[#6B7459] md:text-[19px]"
              style={{
                fontFamily: serifFont,
              }}
            >
              ACESSE SUA CONTA
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mx-auto max-w-[320px]">
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[11px] font-light uppercase tracking-[0.18em] text-[#6B7459]"
                  style={{
                    fontFamily: sansFont,
                  }}
                >
                  EMAIL
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7459]" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="USE O E-MAIL INFORMADO NO MOMENTO DA COMPRA."
                    className="h-8 w-full rounded-md border border-[#ddddda] bg-transparent pr-2.5 pl-8 text-[11px] text-[#3F3F39] placeholder:text-[8px] placeholder:font-light placeholder:tracking-[0.14em] placeholder:text-[#b5b2aa] outline-none transition focus:border-[#6B7459]"
                    style={{ fontFamily: sansFont }}
                    required
                  />
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="inline-flex h-9 min-w-[168px] items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70 md:h-10 md:text-[16px]"
                  style={{
                    backgroundColor: "#6B7459",
                    fontFamily: serifFont,
                    letterSpacing: "0.12em",
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner className="size-4 shrink-0 text-white" />
                      ACESSANDO...
                    </>
                  ) : (
                    "ACESSAR"
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setGuestMode(true);
                    setLocation("/dashboard");
                  }}
                  className="text-[11px] font-light uppercase tracking-[0.16em] text-[#6B7459]/80 underline underline-offset-4 transition-colors hover:text-[#6B7459] disabled:opacity-60"
                  style={{ fontFamily: sansFont }}
                >
                  Convidado — entrar sem login
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <WhatsAppSupportButton />
    </div>
  );
}