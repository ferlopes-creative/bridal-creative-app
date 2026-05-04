/**
 * Gera um nome de objeto seguro para Supabase Storage.
 * Nomes originais com espaços, acentos ou caracteres especiais costumam gerar "Invalid key".
 */
export function safeStorageObjectName(file: File): string {
  const raw = file.name || "file";
  const lastDot = raw.lastIndexOf(".");
  const ext =
    lastDot >= 0
      ? raw
          .slice(lastDot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 12)
      : "";
  const suffix = ext ? `.${ext}` : "";
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${id}${suffix}`;
}
