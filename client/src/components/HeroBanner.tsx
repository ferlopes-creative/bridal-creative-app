import { Bell } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { SiteBannerCarousel } from "@/components/SiteBannerCarousel";

/** Banner do topo (carrossel configurável em Aparência do app) com logo e sino por cima. */
export default function HeroBanner({
  logoUrl,
  guestMode,
  hasUnread,
  onNotifications,
  activeHeroUrls,
  isMobile,
  showHero,
}: {
  logoUrl: string | null;
  guestMode: boolean;
  hasUnread: boolean;
  onNotifications: () => void;
  activeHeroUrls: string[];
  isMobile: boolean;
  showHero: boolean;
}) {
  return (
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
  );
}
