import { useEffect, useRef, useState } from "react";

const SHOWN_KEY = "bridal_intro_shown";
const FADE_MS = 900;
/** Começa a esmaecer um pouco antes do vídeo acabar, pra dissolver em vez de cortar. */
const FADE_LEAD_S = 0.6;
const MAX_WAIT_MS = 8000;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export default function SplashVideo({ onFinished }: { onFinished?: () => void }) {
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
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFadingOut(true);
  };

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

    const video = videoRef.current;
    if (!video) {
      finish();
      return;
    }

    // Alguns navegadores só respeitam autoplay se `muted` for setado via propriedade, não só o atributo.
    video.muted = true;
    video.play().catch(() => {
      // Autoplay bloqueado (ex: sem interação prévia) — não trava a pessoa numa tela parada.
      finish();
    });

    const onTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - FADE_LEAD_S) {
        finish();
      }
    };

    const timeout = window.setTimeout(finish, MAX_WAIT_MS);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);

    return () => {
      window.clearTimeout(timeout);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
    };
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
