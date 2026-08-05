/** Cache simples em localStorage (sobrevive a fechar/reabrir o app, diferente de estado em memória).
 * Usado só para dados não sensíveis já visíveis na tela (catálogo, comentários, planejamento),
 * exibidos na hora enquanto os dados reais são buscados de novo em segundo plano. */

function storageKey(key: string) {
  return `bridal_cache_${key}`;
}

export function readLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* localStorage indisponível (modo privado, cota cheia) — ignora, cache é só otimização */
  }
}

export function clearLocalCache(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    /* ignore */
  }
}
