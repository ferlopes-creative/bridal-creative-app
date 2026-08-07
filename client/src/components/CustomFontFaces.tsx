import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { buildFontFaceCss } from "@/lib/customFonts";

/** Registra as fontes personalizadas enviadas no Admin via @font-face,
 * pra funcionarem tanto no editor quanto na página do produto. */
export default function CustomFontFaces() {
  const { settings } = useSiteSettings();
  const css = buildFontFaceCss(settings.custom_fonts_config);
  if (!css) return null;
  return <style>{css}</style>;
}
