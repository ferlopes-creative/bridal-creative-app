import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type SiteBannerCarouselProps = {
  urls: string[];
  /** Classes aplicadas a cada slide + viewport (altura mínima da faixa) */
  slideMinClass?: string;
  className?: string;
};

/**
 * Carrossel de banners do CMS (`site_settings.hero_banner_urls`), preenchendo a área com `object-cover`.
 */
export function SiteBannerCarousel({
  urls,
  slideMinClass = "min-h-[240px] md:min-h-[260px]",
  className,
}: SiteBannerCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSlideIndex(api.selectedScrollSnap());
    const onSelect = () => setSlideIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || urls.length <= 1) return;
    const id = window.setInterval(() => api.scrollNext(), 6500);
    return () => window.clearInterval(id);
  }, [api, urls.length]);

  if (urls.length === 0) return null;

  return (
    <div className={cn("relative h-full w-full", slideMinClass, className)}>
      <Carousel
        className={cn("h-full w-full", slideMinClass)}
        opts={{ loop: urls.length > 1, align: "start", duration: 20 }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-0 flex h-full min-h-[inherit] items-stretch">
          {urls.map((url, i) => (
            <CarouselItem
              key={`${url}-${i}`}
              className={cn("relative h-full basis-full !pl-0", slideMinClass)}
            >
              <img
                src={url}
                alt=""
                className="absolute inset-0 size-full object-cover"
                decoding="async"
                draggable={false}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {urls.length > 1 ? (
        <div
          className="pointer-events-auto absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5"
          role="tablist"
          aria-label="Banners"
        >
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === slideIndex}
              aria-label={`Banner ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slideIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
              )}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
