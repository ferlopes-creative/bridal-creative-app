import { Bell } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { SiteBannerCarousel } from "@/components/SiteBannerCarousel";

/** Banner (configurável via Aparência do app), saudação e countdown de dias —
 * a antiga abertura da Início, agora vivendo na aba "Meus produtos". */
export default function WeddingHero({
  logoUrl,
  guestMode,
  hasUnread,
  onNotifications,
  weddingName,
  weddingDaysLeft,
  onPlanning,
  activeHeroUrls,
  isMobile,
  showHero,
}: {
  logoUrl: string | null;
  guestMode: boolean;
  hasUnread: boolean;
  onNotifications: () => void;
  weddingName: string | null;
  weddingDaysLeft: number | null;
  onPlanning: () => void;
  activeHeroUrls: string[];
  isMobile: boolean;
  showHero: boolean;
}) {
  return (
    <>
      <section className="relative min-h-[240px] overflow-hidden rounded-b-2xl md:min-h-[320px]">
        <div className="absolute inset-0 bg-bc-primary">
          {showHero ? (
            <SiteBannerCarousel
              urls={activeHeroUrls}
              slideMinClass={isMobile ? "min-h-[240px]" : "min-h-[320px] lg:min-h-[360px]"}
              imageObjectPosition={isMobile ? "center" : "center top"}
            />
          ) : null}
        </div>
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[240px] w-full max-w-6xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 md:min-h-[320px]">
          <header className="pointer-events-auto flex items-center justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-16">
              <BrandLogo
                src={logoUrl}
                className="max-h-12 max-w-12 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)] md:max-h-14 md:max-w-[4.5rem]"
              />
            </div>
            {!guestMode ? (
              <button
                type="button"
                onClick={onNotifications}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                aria-label="Notificações"
              >
                <Bell className="h-6 w-6" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white/90" aria-hidden />
                )}
              </button>
            ) : (
              <div className="h-10 w-10" aria-hidden />
            )}
          </header>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:pt-9 md:pt-10">
        <div className="border-b border-bc-primary/15 pb-3">
          <p
            className="text-sm font-bold tracking-[0.06em] text-bc-primary sm:text-base sm:tracking-[0.1em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bem-vinda(o){weddingName ? `, ${weddingName}` : ""}!
          </p>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <h1
            className="text-base leading-snug text-bc-primary sm:text-xl"
            style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
          >
            Um grande amor,
            <br />
            merece um
            <br />
            <span className="text-4xl leading-tight sm:text-6xl" style={{ fontFamily: "var(--font-script)" }}>
              Grande dia!
            </span>
          </h1>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div
              className="rounded-[3px] px-4 py-2 text-center text-white sm:px-6 sm:py-2.5"
              style={{ backgroundColor: "var(--bc-primary)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-white/75 sm:text-[10px]">Faltam</p>
              <p className="text-base font-semibold whitespace-nowrap sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
                {weddingDaysLeft !== null ? `${weddingDaysLeft} dias` : "--"}
              </p>
            </div>
            <button
              type="button"
              onClick={onPlanning}
              className="text-[10px] font-normal text-bc-primary hover:underline sm:text-xs"
            >
              Ver planejamento →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
