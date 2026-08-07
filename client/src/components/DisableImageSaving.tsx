import { useEffect } from "react";

/** Bloqueia o menu de clique-direito/toque-longo ("Salvar imagem", "Copiar imagem")
 * sobre qualquer <img> do app. Complementa o CSS que tira o menu de toque longo do
 * iOS/Android. Não impede print de tela — isso não dá pra bloquear via navegador. */
export default function DisableImageSaving() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "IMG") {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return null;
}
