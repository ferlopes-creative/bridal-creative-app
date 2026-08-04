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

    // iOS Safari (principalmente em modo "adicionar à tela inicial") só garante autoplay
    // de forma confiável se `muted`/`playsInline` forem setados como propriedade antes do
    // play(), além do atributo HTML — e às vezes precisa do `load()` explícito primeiro.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("webkit-playsinline", "true");

    const attemptPlay = () => {
      video.play().catch(() => {
        // Autoplay realmente bloqueado nesse aparelho — não trava numa tela parada.
        finish();
      });
    };

    if (video.readyState >= 2) {
      attemptPlay();
    } else {
      video.load();
      video.addEventListener("loadeddata", attemptPlay, { once: true });
    }

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
      video.removeEventListener("loadeddata", attemptPlay);
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
        muted
        playsInline
        // eslint-disable-next-line react/no-unknown-property
        webkit-playsinline="true"
        preload="auto"
      />
    </div>
  );
}
