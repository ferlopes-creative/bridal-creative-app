import { useEffect, useRef, useState } from "react";
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
  /** object-position da imagem (útil em faixas largas no desktop) */
  imageObjectPosition?: string;
  className?: string;
};

/**
 * Carrossel de banners do CMS (`site_settings.hero_banner_urls`), preenchendo a área com `object-cover`.
 */
export function SiteBannerCarousel({
  urls,
  slideMinClass = "min-h-[240px]",
  imageObjectPosition = "center",
  className,
}: SiteBannerCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const slideCount = urls.length;
  const carouselKey = urls.join("\0");

  useEffect(() => {
    setSlideIndex(0);
  }, [carouselKey]);

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
    if (!api || slideCount <= 1) return;
    api.reInit();
  }, [api, carouselKey, slideCount]);

  useEffect(() => {
    const root = rootRef.current;
    if (!api || !root || slideCount <= 1) return;
    const ro = new ResizeObserver(() => {
      api.reInit();
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [api, slideCount]);

  useEffect(() => {
    if (!api || slideCount <= 1) return;
    const advance = () => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    };
    const id = window.setInterval(advance, 6500);
    return () => window.clearInterval(id);
  }, [api, slideCount]);

  if (slideCount === 0) return null;

  return (
    <div
      ref={rootRef}
      className={cn("relative h-full w-full", slideMinClass, className)}
    >
      <Carousel
        key={carouselKey}
        className={cn("h-full w-full", slideMinClass)}
        opts={{ loop: slideCount > 1, align: "start", duration: 20 }}
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
                style={{ objectPosition: imageObjectPosition }}
                decoding="async"
                draggable={false}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {slideCount > 1 ? (
        <div
          className="pointer-events-auto absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-1.5"
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
