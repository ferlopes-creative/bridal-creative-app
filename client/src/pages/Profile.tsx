import { useEffect, useState } from "react";
import { CircleUserRound, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import WhatsAppSupportButton from "@/components/WhatsAppSupportButton";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import { clearGuestMode, isGuestMode } from "@/lib/guestMode";
import { supabase } from "@/lib/supabase";

const serifFont = "'Cormorant Garamond', 'Cinzel', 'Times New Roman', serif";
const sansFont = "'Montserrat', 'Lato', 'Arial', sans-serif";

type ProfileUser = {
  email: string;
  createdAt: string | null;
  productCount: number;
};

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-light uppercase tracking-[0.16em] text-[#6B705C]/70"
        style={{ fontFamily: sansFont }}
      >
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[#3F3F39]" style={{ fontFamily: sansFont, fontWeight: 400 }}>
        {value}
      </p>
    </div>
  );
}

function GuestProfileCTA({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mt-6 w-full max-w-sm">
      <h2
        className="text-lg font-medium uppercase tracking-[0.1em] text-[#6B705C]"
        style={{ fontFamily: serifFont }}
      >
        Modo convidado
      </h2>
      <p
        className="mt-3 text-sm leading-relaxed text-[#6B705C]/80"
        style={{ fontFamily: sansFont, fontWeight: 300 }}
      >
        Faça login para acessar todos os recursos, liberar seus produtos e personalizar sua experiência.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex h-10 min-w-[180px] items-center justify-center rounded-lg px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "#6B7459",
            fontFamily: serifFont,
            letterSpacing: "0.12em",
          }}
        >
          FAZER LOGIN
        </button>
      </div>
    </div>
  );
}

function LoggedInProfile({
  user,
  formatMemberSince,
}: {
  user: ProfileUser;
  formatMemberSince: (iso: string | null) => string | null;
}) {
  const memberSince = formatMemberSince(user.createdAt);

  return (
    <div className="mt-6 w-full max-w-sm text-left">
      <h2
        className="text-center text-lg font-medium uppercase tracking-[0.1em] text-[#6B705C]"
        style={{ fontFamily: serifFont }}
      >
        Sua conta
      </h2>

      <div className="mt-5 space-y-3 rounded-xl border border-[#e9e9e6] bg-white/60 px-4 py-4 backdrop-blur-sm">
        <ProfileField label="E-mail" value={user.email} />
        {memberSince ? <ProfileField label="Membro desde" value={memberSince} /> : null}
        <ProfileField
          label="Produtos ativos"
          value={user.productCount === 1 ? "1 produto" : `${user.productCount} produtos`}
        />
      </div>
    </div>
  );
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;

  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (isGuestMode()) {
        setGuest(true);
        setUser(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setGuest(true);
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("product_id")
        .eq("user_id", data.user.id)
        .eq("status", "active");

      setGuest(false);
      setUser({
        email: data.user.email ?? "—",
        createdAt: data.user.created_at ?? null,
        productCount: purchasesData?.length ?? 0,
      });
      setLoading(false);
    };

    void load();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      /* session may already be gone */
    }
    clearGuestMode();
    setLocation("/login");
  };

  const formatMemberSince = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-[#F7F5F0]">
        <PageBackgroundTexture
          imageUrl={pageBgUrl}
          settings={settings}
          backgroundColor="#FBFAF6"
        />
        <PageLoading label="Carregando perfil..." className="relative min-h-screen flex-1" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <PageBackgroundTexture
        imageUrl={pageBgUrl}
        settings={settings}
        backgroundColor="#FBFAF6"
      />

      <header className="relative border-b border-[#6B705C]/12 bg-[#FBFAF6]/96 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-10 max-w-10 object-contain" />
          </div>
          <h1
            className="text-sm font-bold uppercase tracking-[0.12em] text-[#6B705C]"
            style={{ fontFamily: serifFont }}
          >
            Perfil
          </h1>
          <div className="h-10 w-10" aria-hidden />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-lg px-4 pt-8">
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#6B705C]/25 bg-[#6B705C]/8 shadow-inner"
            aria-hidden
          >
            <CircleUserRound className="h-14 w-14 text-[#6B705C]/70" strokeWidth={1.1} />
          </div>

          {guest ? (
            <GuestProfileCTA
              onLogin={() => {
                clearGuestMode();
                setLocation("/login");
              }}
            />
          ) : user ? (
            <LoggedInProfile user={user} formatMemberSince={formatMemberSince} />
          ) : null}
        </div>

        {!guest && user ? (
          <div className="mt-10 flex justify-center pb-4">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-[#6B705C]/30 bg-transparent px-5 py-2.5 text-sm font-medium uppercase tracking-[0.1em] text-[#6B705C] transition-colors hover:bg-[#6B705C]/8 disabled:opacity-60"
              style={{ fontFamily: serifFont }}
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        ) : null}
      </main>

      <WhatsAppSupportButton aboveBottomNav />
      <BottomAppNav />
    </div>
  );
}
