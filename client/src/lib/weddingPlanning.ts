export type WeddingDetails = {
  user_id: string;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string | null; // ISO date (yyyy-mm-dd)
  budget_total: number;
  vows: string | null;
};

export type Vendor = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  contact: string | null;
  contracted_value: number;
  paid_value: number;
  closing_date: string | null;
  final_payment_date: string | null;
  payment_terms: string | null;
};

export type ChecklistItem = {
  id: string;
  user_id: string;
  phase: string;
  title: string;
  done: boolean;
  is_custom: boolean;
  sort_order: number;
};

export type GuestSide = "Noiva" | "Noivo" | "Ambos";
export type GuestStatus = "confirmado" | "pendente" | "nao";

export type Guest = {
  id: string;
  user_id: string;
  name: string;
  side: GuestSide;
  status: GuestStatus;
};

export const VENDOR_CATEGORIES = [
  "Buffet",
  "Fotografia",
  "Vídeo",
  "Decoração",
  "Música / DJ",
  "Doces e bolo",
  "Papelaria",
  "Vestido e trajes",
  "Cerimonial / Assessoria",
  "Convites e site",
  "Transporte",
  "Hospedagem",
  "Beleza",
  "Lua de mel",
  "Outros",
] as const;

/** Mesma lógica de communityAccess.ts/productAccess.ts: acesso Premium vem
 * de uma compra ativa do produto marcado como is_wedding_planning_premium,
 * nunca de um estado local. */
export function hasWeddingPremiumAccess(
  purchasedIds: Set<string>,
  premiumProductId: string | null
): boolean {
  if (!premiumProductId) return false;
  return purchasedIds.has(premiumProductId);
}

export function moneyBR(value: number | null | undefined): string {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShortBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  confirmado: "Confirmado",
  pendente: "Aguardando",
  nao: "Não vai",
};
