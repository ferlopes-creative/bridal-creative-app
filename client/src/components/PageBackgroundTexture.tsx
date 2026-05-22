import {
  DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  resolvePageBackgroundOpacityPercent,
  type SiteSettings,
} from "@/contexts/SiteSettingsContext";

type PageBackgroundTextureProps = {
  imageUrl: string;
  /** Se omitido, usa `settings` ou o padrão do CMS. */
  opacityPercent?: number;
  settings?: SiteSettings;
  backgroundSize?: string;
  backgroundColor?: string;
  className?: string;
};

export default function PageBackgroundTexture({
  imageUrl,
  opacityPercent,
  settings,
  backgroundSize = "360px auto",
  backgroundColor,
  className = "pointer-events-none absolute inset-0",
}: PageBackgroundTextureProps) {
  const percent =
    opacityPercent ??
    (settings ? resolvePageBackgroundOpacityPercent(settings) : DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT);

  return (
    <div
      className={className}
      style={{
        opacity: percent / 100,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize,
        backgroundRepeat: "repeat",
        ...(backgroundColor ? { backgroundColor } : {}),
      }}
    />
  );
}
