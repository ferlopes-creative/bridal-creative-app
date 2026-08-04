import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Metrics = { scrollable: boolean; atEnd: boolean };

const initialMetrics: Metrics = { scrollable: false, atEnd: false };

export function HorizontalScrollRow({
  children,
  contentKey,
  className,
}: {
  children: React.ReactNode;
  contentKey?: string | number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const scrollable = scrollWidth > clientWidth + 2;
    if (!scrollable) {
      setMetrics((prev) => (prev.scrollable ? initialMetrics : prev));
      return;
    }
    const maxScroll = scrollWidth - clientWidth;
    setMetrics({ scrollable: true, atEnd: scrollLeft >= maxScroll - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, contentKey]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={ref}
        className="-mx-0.5 flex gap-3 overflow-x-auto overscroll-x-contain px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
      {metrics.scrollable ? (
        <div
          className="bc-drag-hint pointer-events-none absolute top-1/2 right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-bc-primary/60 shadow-[0_1px_6px_rgba(53,58,46,0.14)] backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: metrics.atEnd ? 0 : 1 }}
          aria-hidden
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </div>
      ) : null}
    </div>
  );
}
