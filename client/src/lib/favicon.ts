function upsertLink(rel: string, href: string, sizes?: string): void {
  const selector = sizes ? `link[rel="${rel}"][sizes="${sizes}"]` : `link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    if (sizes) link.setAttribute("sizes", sizes);
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Aplica o ícone do app (favicon da aba + ícone ao adicionar à tela inicial). */
export function applyFaviconToDocument(url: string | null | undefined): void {
  const href = url?.trim();
  if (!href) return;
  upsertLink("icon", href);
  upsertLink("apple-touch-icon", href);
}
