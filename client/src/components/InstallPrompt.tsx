import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "bridal_install_prompt_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Banner mobile (1ª visita) pra adicionar à tela inicial e pedir permissão de notificação.
 * Notificação aqui é só a permissão do navegador — enviar push de verdade exige
 * infraestrutura própria (service worker, chaves, backend) ainda não implementada. */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useEffect(() => {
    if (!isMobile() || isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIOS()) {
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function handleNotification() {
    if (typeof Notification === "undefined") return;
    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    void handleNotification();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[220] max-w-sm rounded-xl border border-white/10 bg-bc-primary px-4 py-3 text-white shadow-[0_8px_28px_rgba(0,0,0,0.25)] sm:inset-x-auto sm:right-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="absolute right-2 top-2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-5 text-sm font-medium">Adicione o app à tela inicial</p>
      {isIOS() ? (
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          Toque em <strong>Compartilhar</strong> (ícone de seta pra cima) e depois em{" "}
          <strong>"Adicionar à Tela de Início"</strong>.
        </p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          Acesse mais rápido, direto do seu celular, sem precisar abrir o navegador.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!isIOS() && deferredPrompt ? (
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-bc-primary"
          >
            Adicionar à tela inicial
          </button>
        ) : null}
        {notifStatus === "default" ? (
          <button
            type="button"
            onClick={() => void handleNotification()}
            className="rounded-full border border-white/40 px-3 py-1.5 text-xs font-medium text-white"
          >
            Ativar notificações
          </button>
        ) : null}
        <button type="button" onClick={dismiss} className="px-2 py-1.5 text-xs text-white/70">
          Agora não
        </button>
      </div>
    </div>
  );
}
