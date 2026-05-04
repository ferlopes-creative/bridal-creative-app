import { useEffect, useState } from "react";
import { Bell, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { PageLoading } from "@/components/PageLoading";
import { setLastNotificationViewedAt } from "@/lib/notificationViewed";
import { supabase } from "@/lib/supabase";
import { useSiteSettings, DEFAULT_FLORAL_BG } from "@/contexts/SiteSettingsContext";

const TABLE = "app_notifications";

type Row = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const pageBgUrl = settings.page_background_image_url || DEFAULT_FLORAL_BG;
  const logoUrl = settings.logo_url;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const isDevBypass = localStorage.getItem("dev_bypass_auth") === "true";
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user && !isDevBypass) {
        setLocation("/");
        return;
      }

      const { data, error } = await supabase
        .from(TABLE)
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setItems(data as Row[]);
      }
      setLoading(false);
      setLastNotificationViewedAt(new Date().toISOString());
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only gate + redirect
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FBFAF6] pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url(${pageBgUrl})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#6B705C]/25 bg-[#FBFAF6]/90 p-1">
            <BrandLogo src={logoUrl} className="h-full w-full" />
          </div>
          <span className="rounded-full border border-[#6B705C]/20 bg-[#6B705C]/10 p-2 text-[#6B705C]" aria-hidden>
            <Bell className="h-6 w-6" />
          </span>
        </header>

        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-1 text-[#6B705C]"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-3xl text-[#6B705C]" style={{ fontFamily: "var(--font-display)" }}>
            Notificações
          </h1>
        </div>

        {loading ? (
          <PageLoading label="Carregando avisos..." className="min-h-[50vh] py-12" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[#6B705C]/30 bg-white/80 p-8 text-center">
            <p className="text-sm text-[#6B705C]/80">Nenhum aviso por enquanto.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-[#6B705C]/25 bg-white/90 p-5 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-[#6B705C]/70">{formatDate(n.created_at)}</p>
                <h2 className="mt-2 text-xl text-[#6B705C]" style={{ fontFamily: "var(--font-display)" }}>
                  {n.title}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomAppNav />
    </div>
  );
}
