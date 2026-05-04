import { useCallback, useEffect, useRef, useState } from "react";

type Metrics = { show: boolean; thumbW: number; thumbLeft: number };

const initialMetrics: Metrics = { show: false, thumbW: 100, thumbLeft: 0 };

/**
 * Lista horizontal com scroll nativo e barra de progresso (track + thumb)
 * para indicar que há mais conteúdo ao deslizar — alinhado ao tema olive do dashboard.
 */
export function HorizontalScrollRow({
  children,
  contentKey,
  className,
  /** Largura máxima da barra (centrada). */
  indicatorMaxWidthClass = "max-w-[min(11rem,88vw)]",
}: {
  children: React.ReactNode;
  /** Dispara nova medição quando a lista muda (ex.: ids ou length). */
  contentKey?: string | number;
  className?: string;
  indicatorMaxWidthClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const scrollable = scrollWidth > clientWidth + 2;
    if (!scrollable) {
      setMetrics((prev) => (prev.show ? initialMetrics : prev));
      return;
    }
    const maxScroll = scrollWidth - clientWidth;
    const thumbW = (clientWidth / scrollWidth) * 100;
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbW) : 0;
    setMetrics({ show: true, thumbW, thumbLeft });
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
    <div className={className}>
      <div
        ref={ref}
        className="-mx-0.5 flex gap-3 overflow-x-auto overscroll-x-contain px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
      {metrics.show ? (
        <div
          className={`relative mx-auto mt-3 h-2 ${indicatorMaxWidthClass} w-full`}
          aria-hidden
        >
          <div className="absolute inset-0 rounded-full bg-[#e8e6df] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]" />
          <div
            className="absolute top-0 h-full rounded-full bg-[#6B705C] shadow-sm transition-[left,width] duration-100 ease-out"
            style={{
              width: `${metrics.thumbW}%`,
              left: `${metrics.thumbLeft}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
