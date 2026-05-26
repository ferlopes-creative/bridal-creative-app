import { cn } from "@/lib/utils";
import { resolveWhatsAppUrl } from "@/lib/whatsappUrl";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

type WhatsAppSupportButtonProps = {
  /** Posiciona acima da barra inferior fixa (dashboard, etc.) */
  aboveBottomNav?: boolean;
  className?: string;
};

export default function WhatsAppSupportButton({
  aboveBottomNav = false,
  className,
}: WhatsAppSupportButtonProps) {
  const { settings } = useSiteSettings();
  const href = resolveWhatsAppUrl(settings);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp — falar com suporte"
      style={{ backgroundColor: settings.colors.primary }}
      className={cn(
        "fixed right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_6px_20px_rgba(53,58,46,0.22)] transition-[opacity,transform] hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] sm:h-[3.25rem] sm:w-[3.25rem]",
        aboveBottomNav
          ? "bottom-[max(5.25rem,calc(4.75rem+env(safe-area-inset-bottom)))]"
          : "bottom-6",
        className
      )}
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.55 1.75 6.53L3 29l6.66-1.73A12.96 12.96 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Z"
          fill="white"
          fillOpacity="0.2"
        />
        <path
          d="M10.9 9.9c.3-.67.62-.68.9-.7h.77c.23 0 .55.08.84.65.3.57 1.02 1.97 1.12 2.12.1.15.16.33.03.54-.13.2-.2.33-.38.52-.18.2-.38.44-.54.58-.18.15-.36.3-.15.6.21.3.94 1.55 2.03 2.5 1.4 1.22 2.58 1.6 2.95 1.78.36.18.58.15.8-.09.2-.24.87-1.01 1.1-1.36.24-.35.47-.29.8-.18.33.12 2.06.97 2.42 1.15.35.18.58.27.67.42.09.15.09.88-.2 1.74-.29.86-1.72 1.65-2.4 1.73-.62.08-1.4.12-2.27-.15-.53-.17-1.22-.4-2.1-.78-3.7-1.6-6.1-5.34-6.28-5.6-.18-.27-1.5-2-.1-3.84Z"
          fill="white"
        />
      </svg>
    </a>
  );
}
