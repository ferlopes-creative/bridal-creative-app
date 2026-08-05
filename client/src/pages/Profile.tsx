import { useEffect, useState } from "react";
import { CircleUserRound, LogOut, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import { Spinner } from "@/components/ui/spinner";
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
  displayName: string | null;
};

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-light uppercase tracking-[0.16em] text-bc-primary/70"
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
        className="text-lg font-medium uppercase tracking-[0.1em] text-bc-primary"
        style={{ fontFamily: serifFont }}
      >
        Modo convidado
      </h2>
      <p
        className="mt-3 text-sm leading-relaxed text-bc-primary/80"
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

function DisplayNameField({
  displayName,
  onSaved,
}: {
  displayName: string | null;
  onSaved: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSaving(false);
    if (error) {
      console.error("Erro ao salvar nome:", error);
      return;
    }
    setEditing(false);
    onSaved(trimmed);
  };

  if (editing) {
    return (
      <div>
        <p
          className="text-[10px] font-light uppercase tracking-[0.16em] text-bc-primary/70"
          style={{ fontFamily: sansFont }}
        >
          Nome
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            autoFocus
            disabled={saving}
            className="h-9 flex-1 rounded-md border border-bc-primary/20 bg-white px-2.5 text-sm text-[#3F3F39] outline-none focus:ring-2 focus:ring-bc-primary/25"
            style={{ fontFamily: sansFont }}
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !value.trim()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-bc-primary px-3 text-xs text-white disabled:opacity-60"
          >
            {saving ? <Spinner className="size-3.5 text-white" /> : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p
          className="text-[10px] font-light uppercase tracking-[0.16em] text-bc-primary/70"
          style={{ fontFamily: sansFont }}
        >
          Nome
        </p>
        <p className="mt-0.5 text-sm text-[#3F3F39]" style={{ fontFamily: sansFont, fontWeight: 400 }}>
          {displayName || "Adicionar nome"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setValue(displayName || "");
          setEditing(true);
        }}
        className="shrink-0 rounded-full p-1.5 text-bc-primary/60 transition-colors hover:bg-bc-primary/10 hover:text-bc-primary"
        aria-label="Editar nome"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LoggedInProfile({
  user,
  formatMemberSince,
  onDisplayNameSaved,
}: {
  user: ProfileUser;
  formatMemberSince: (iso: string | null) => string | null;
  onDisplayNameSaved: (name: string) => void;
}) {
  const memberSince = formatMemberSince(user.createdAt);

  return (
    <div className="mt-6 w-full max-w-sm text-left">
      <h2
        className="text-center text-lg font-medium uppercase tracking-[0.1em] text-bc-primary"
        style={{ fontFamily: serifFont }}
      >
        Sua conta
      </h2>

      <div className="mt-5 space-y-3 rounded-xl border border-[#e9e9e6] bg-white/60 px-4 py-4 backdrop-blur-sm">
        <DisplayNameField displayName={user.displayName} onSaved={onDisplayNameSaved} />
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
        displayName: (data.user.user_metadata?.display_name as string | undefined)?.trim() || null,
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
      <div className="relative min-h-screen bg-bc-page-bg">
        <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
        <PageLoading label="Carregando perfil..." className="relative min-h-screen flex-1" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bc-page-bg pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />

      <header className="relative border-b border-bc-primary/12 bg-bc-page-bg/96 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-10 max-w-10 object-contain" />
          </div>
          <h1
            className="text-sm font-bold uppercase tracking-[0.12em] text-bc-primary"
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
            className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-bc-primary/25 bg-bc-primary/8 shadow-inner"
            aria-hidden
          >
            <CircleUserRound className="h-14 w-14 text-bc-primary/70" strokeWidth={1.1} />
          </div>

          {guest ? (
            <GuestProfileCTA
              onLogin={() => {
                clearGuestMode();
                setLocation("/login");
              }}
            />
          ) : user ? (
            <LoggedInProfile
              user={user}
              formatMemberSince={formatMemberSince}
              onDisplayNameSaved={(name) => setUser((prev) => (prev ? { ...prev, displayName: name } : prev))}
            />
          ) : null}
        </div>

        {!guest && user ? (
          <div className="mt-10 flex justify-center pb-4">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-bc-primary/30 bg-transparent px-5 py-2.5 text-sm font-medium uppercase tracking-[0.1em] text-bc-primary transition-colors hover:bg-bc-primary/8 disabled:opacity-60"
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
