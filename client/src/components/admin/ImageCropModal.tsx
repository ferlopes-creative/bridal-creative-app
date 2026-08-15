import { useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const VIEWPORT = 320;

type Props = {
  /** URL da imagem a cortar (pode ser um object URL de arquivo local ou uma URL remota já salva). */
  imageUrl: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

/** Corte quadrado simples: arrasta pra posicionar, controle deslizante pra zoom. */
export default function ImageCropModal({ imageUrl, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNaturalSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  if (!imageUrl) return null;

  const baseScale = naturalSize ? VIEWPORT / Math.min(naturalSize.w, naturalSize.h) : 1;
  const dispW = naturalSize ? naturalSize.w * baseScale * zoom : VIEWPORT;
  const dispH = naturalSize ? naturalSize.h * baseScale * zoom : VIEWPORT;

  const clamp = (x: number, y: number) => {
    const minX = Math.min(0, VIEWPORT - dispW);
    const minY = Math.min(0, VIEWPORT - dispH);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  const handleImageLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNaturalSize({ w, h });
    const base = VIEWPORT / Math.min(w, h);
    setOffset({ x: (VIEWPORT - w * base) / 2, y: (VIEWPORT - h * base) / 2 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clamp(dragStart.current.offX + dx, dragStart.current.offY + dy));
  };

  const onPointerUp = () => setDragging(false);

  const handleZoomChange = (nextZoom: number) => {
    if (!naturalSize) {
      setZoom(nextZoom);
      return;
    }
    const nextW = naturalSize.w * baseScale * nextZoom;
    const nextH = naturalSize.h * baseScale * nextZoom;
    // Mantém o centro do recorte atual ao mudar o zoom.
    const centerX = offset.x - VIEWPORT / 2;
    const centerY = offset.y - VIEWPORT / 2;
    const ratio = nextZoom / zoom;
    setZoom(nextZoom);
    setOffset(clamp(centerX * ratio + VIEWPORT / 2, centerY * ratio + VIEWPORT / 2));
    void nextW;
    void nextH;
  };

  const handleConfirm = () => {
    const el = imgRef.current;
    if (!el || !naturalSize) return;
    setSaving(true);
    const outputSize = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSaving(false);
      return;
    }
    const factor = outputSize / VIEWPORT;
    ctx.drawImage(
      el,
      0,
      0,
      naturalSize.w,
      naturalSize.h,
      offset.x * factor,
      offset.y * factor,
      dispW * factor,
      dispH * factor
    );
    canvas.toBlob(
      (blob) => {
        setSaving(false);
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Dialog open={Boolean(imageUrl)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[min(92vw,420px)] gap-4 p-5" showCloseButton={false}>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-sm font-medium text-zinc-800">Cortar foto (quadrado)</DialogTitle>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-md bg-zinc-100 select-none"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none"
            style={{
              width: dispW,
              height: dispH,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-black/10" />
        </div>

        <div className="flex items-center gap-2.5">
          <ZoomIn className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-[#6B705C]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !naturalSize}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#6B705C] px-3.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? "Aplicando..." : "Aplicar corte"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
