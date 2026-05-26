import { useEffect, useState } from "react";
import {
  DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  resolvePageBackgroundOpacityPercent,
  type SiteSettings,
} from "@/contexts/SiteSettingsContext";

type PageBackgroundTextureProps = {
  imageUrl?: string | null;
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
  const url = imageUrl?.trim() || "";
  const [ready, setReady] = useState(false);

  const percent =
    opacityPercent ??
    (settings ? resolvePageBackgroundOpacityPercent(settings) : DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT);

  useEffect(() => {
    if (!url) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const img = new Image();
    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    img.onload = markReady;
    img.onerror = markReady;
    img.src = url;
    if (img.complete) markReady();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return null;

  return (
    <div
      className={className}
      style={{
        opacity: ready ? percent / 100 : 0,
        transition: "opacity 180ms ease-out",
        backgroundImage: `url(${url})`,
        backgroundSize,
        backgroundRepeat: "repeat",
        ...(backgroundColor ? { backgroundColor } : {}),
      }}
    />
  );
}
