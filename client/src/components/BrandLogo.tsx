import logoSrc from "@/logo-bridal-creative.png";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  /** URL do CMS (`site_settings.logo_url`); se vazio, usa o PNG embutido. */
  src?: string | null;
};

/** Logotipo Bridal Creative: PNG local ou URL configurada no admin. */
export default function BrandLogo({ className = "", alt = "Bridal Creative", src }: BrandLogoProps) {
  return <img src={src || logoSrc} alt={alt} className={`object-contain ${className}`} />;
}
