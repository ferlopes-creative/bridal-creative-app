import { useEffect, useRef, useState } from "react";

const SHOWN_KEY = "bridal_intro_shown";
const FADE_MS = 700;
const MAX_WAIT_MS = 8000;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Vídeo de abertura na primeira vez que o app abre nesta sessão; funde pra fora no final. */
export default function SplashVideo() {
  const [visible, setVisible] = useState(() => {
    if (prefersReducedMotion()) return false;
    try {
      return sessionStorage.getItem(SHOWN_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SHOWN_KEY, "1");
    } catch {
      /* ignore */
    }

    const finish = () => setFadingOut(true);
    const timeout = window.setTimeout(finish, MAX_WAIT_MS);

    const video = videoRef.current;
    video?.addEventListener("ended", finish);
    video?.addEventListener("error", finish);

    return () => {
      window.clearTimeout(timeout);
      video?.removeEventListener("ended", finish);
      video?.removeEventListener("error", finish);
    };
  }, [visible]);

  useEffect(() => {
    if (!fadingOut) return;
    const timeout = window.setTimeout(() => setVisible(false), FADE_MS);
    return () => window.clearTimeout(timeout);
  }, [fadingOut]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black"
      style={{
        opacity: fadingOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fadingOut ? "none" : "auto",
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}
