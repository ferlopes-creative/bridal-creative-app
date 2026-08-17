import { useEffect, useState } from "react";
import { Bell, Check, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { PageLoading } from "@/components/PageLoading";
import {
  getReadNotificationIds,
  markNotificationRead,
  setLastNotificationViewedAt,
} from "@/lib/notificationViewed";
import { supabase } from "@/lib/supabase";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";

const TABLE = "app_notifications";

type Row = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

/** "Hoje" / "Ontem" / "Há N dias" — sem data nem hora completas. */
function formatRelativeDays(iso: string): string {
  const created = new Date(iso);
  created.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - created.getTime()) / 86400000);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return `Há ${diffDays} dias`;
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const readIds = getReadNotificationIds();
        setItems((data as Row[]).filter((n) => !readIds.has(n.id)));
      }
      setLoading(false);
      setLastNotificationViewedAt(new Date().toISOString());
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only gate + redirect
  }, []);

  const dismiss = (id: string) => {
    if (dismissingIds.has(id)) return;
    markNotificationRead(id);
    setDismissingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }, 220);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-bc-page-bg pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-5">
        <header className="sticky top-0 z-30 mb-4 flex items-center justify-between bg-bc-page-bg/95 py-2 backdrop-blur-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-10 max-w-10 object-contain" />
          </div>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border border-bc-primary/20 bg-bc-primary/10 text-bc-primary"
            aria-hidden
          >
            <Bell className="h-4 w-4" />
          </span>
        </header>

        <div className="mb-4 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-1 text-bc-primary"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg text-bc-primary" style={{ fontFamily: "var(--font-display)" }}>
            Notificações
          </h1>
        </div>

        {loading ? (
          <PageLoading label="Carregando avisos..." className="min-h-[50vh] py-12" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-bc-primary/20 bg-white/80 p-6 text-center">
            <p className="text-xs text-bc-primary/80">Nenhum aviso por enquanto.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => dismiss(n.id)}
                className={`cursor-pointer rounded-xl border border-bc-primary/20 bg-white/90 p-3.5 shadow-sm transition-all duration-200 ease-out hover:border-bc-primary/35 ${
                  dismissingIds.has(n.id) ? "-translate-x-2 opacity-0" : "opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide text-bc-primary/60">
                      {formatRelativeDays(n.created_at)}
                    </p>
                    <h2
                      className="mt-1 text-sm text-bc-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {n.title}
                    </h2>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                      {n.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    title="Marcar como lida"
                    aria-label="Marcar como lida"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-bc-primary/50 hover:bg-bc-primary/10 hover:text-bc-primary"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomAppNav />
    </div>
  );
}
