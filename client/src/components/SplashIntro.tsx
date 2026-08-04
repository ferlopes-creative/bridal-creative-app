import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";

const SHOWN_KEY = "bridal_intro_shown";
const FADE_MS = 900;
const HOLD_MS = 2600;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Tela de abertura só com CSS (logo + linha + texto animados), sem depender de vídeo. */
export default function SplashIntro({ onFinished }: { onFinished?: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (prefersReducedMotion()) return false;
    try {
      return sessionStorage.getItem(SHOWN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!visible) {
      onFinished?.();
      return;
    }
    try {
      sessionStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }
    const timeout = window.setTimeout(() => setFadingOut(true), HOLD_MS);
    return () => window.clearTimeout(timeout);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!fadingOut) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onFinished?.();
    }, FADE_MS);
    return () => window.clearTimeout(timeout);
  }, [fadingOut]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-bc-page-bg"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      <BrandLogo className="bc-splash-logo h-28 w-28 sm:h-36 sm:w-36" />
      <div className="bc-splash-line" />
      <p className="bc-splash-text" style={{ fontFamily: "var(--font-display)" }}>
        Bridal Creative
      </p>
    </div>
  );
}
