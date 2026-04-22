import logoSrc from "@/logo-bridal-creative.png";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

/** Logotipo oficial Bridal Creative (`client/src/logo-bridal-creative.png`). */
export default function BrandLogo({ className = "", alt = "Bridal Creative" }: BrandLogoProps) {
  return <img src={logoSrc} alt={alt} className={`object-contain ${className}`} />;
}
