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

/* ============================================================ RESUMO COMPACTO (home do Planejamento) ============================================================
 * Helpers puros usados só pela home compacta — não mexem no fetch/mutations
 * existentes, só derivam uma leitura resumida de details/vendors/checklist. */

/** "R$ 850" / "R$ 2 mil" / "R$ 18,5 mil" / "R$ 120 mil" / "R$ 1,2 mi" — evita números enormes na tela compacta. */
export function formatCurrencyCompact(value: number | null | undefined): string {
  const v = Math.abs(value || 0);
  const sign = (value || 0) < 0 ? "-" : "";
  if (v < 1_000) return `${sign}${moneyBR(v)}`;
  if (v < 1_000_000) {
    return `${sign}R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `${sign}R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
}

export type CompactTimelineItem = {
  month: number; // 0-11
  year: number;
  label: string; // "AGO"
  isCurrent: boolean;
  isWeddingMonth: boolean;
};

const MONTH_LABELS_PT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export type CompactWeddingTimeline = {
  items: CompactTimelineItem[];
  /** Meses inteiros até o casamento (0 = é este mês). */
  monthsRemaining: number;
};

/** Mini timeline visual (mês atual → mês do casamento), gerada a partir das datas — nunca hardcoded.
 * Perto do casamento mostra todo mês intermediário; longe, resume a 1-2 meses de referência
 * entre o atual e o do casamento (nunca vira uma timeline enorme). */
export function getCompactWeddingTimeline(
  currentDate: Date,
  weddingDateIso: string | null | undefined
): CompactWeddingTimeline {
  if (!weddingDateIso) return { items: [], monthsRemaining: 0 };
  const [wy, wm, wd] = weddingDateIso.split("-").map(Number);
  if (!wy || !wm || !wd) return { items: [], monthsRemaining: 0 };
  const weddingMonth = wm - 1;
  const curMonth = currentDate.getMonth();
  const curYear = currentDate.getFullYear();
  const monthsBetween = (wy - curYear) * 12 + (weddingMonth - curMonth);

  if (monthsBetween <= 0) {
    return {
      items: [{ month: weddingMonth, year: wy, label: MONTH_LABELS_PT[weddingMonth], isCurrent: true, isWeddingMonth: true }],
      monthsRemaining: 0,
    };
  }

  const items: CompactTimelineItem[] = [
    { month: curMonth, year: curYear, label: MONTH_LABELS_PT[curMonth], isCurrent: true, isWeddingMonth: false },
  ];

  const pushMonthAtOffset = (offset: number) => {
    const total = curYear * 12 + curMonth + offset;
    const y = Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    items.push({ month: m, year: y, label: MONTH_LABELS_PT[m], isCurrent: false, isWeddingMonth: false });
  };

  if (monthsBetween <= 3) {
    for (let i = 1; i < monthsBetween; i++) pushMonthAtOffset(i);
  } else if (monthsBetween <= 7) {
    pushMonthAtOffset(Math.round(monthsBetween / 2));
  } else {
    pushMonthAtOffset(Math.round(monthsBetween / 3));
    pushMonthAtOffset(Math.round((monthsBetween * 2) / 3));
  }

  items.push({ month: weddingMonth, year: wy, label: MONTH_LABELS_PT[weddingMonth], isCurrent: false, isWeddingMonth: true });
  return { items, monthsRemaining: monthsBetween };
}

/** Frase curta da fase atual do planejamento — regra de código, sem IA em tempo real. */
export function getPlanningPhase(daysUntilWedding: number): string {
  if (daysUntilWedding > 365) return "Comece pelos fornecedores principais.";
  if (daysUntilWedding > 180) return "Hora de fechar os principais detalhes.";
  if (daysUntilWedding > 90) return "Comece a revisar convidados, roupas e fornecedores.";
  if (daysUntilWedding > 30) return "Hora de finalizar contratos e confirmações.";
  return "Reta final: confirme tudo e cuide dos últimos detalhes.";
}

export type TaskPriorityLevel = "overdue" | "urgent" | "upcoming" | "later";

export type PrioritizedTask = ChecklistItem & {
  priorityLevel: TaskPriorityLevel;
  dueDate: Date | null;
};

/** checklist_items não tem due date — a fase ("6 meses antes", "2 semanas antes") já carrega
 * esse prazo, então derivamos a data recomendada a partir dela + da data do casamento. */
function parsePhaseOffsetDays(phase: string): number | null {
  const monthsMatch = phase.match(/(\d+)\s*m[eê]s/i);
  if (monthsMatch) return Number(monthsMatch[1]) * 30;
  const weeksMatch = phase.match(/(\d+)\s*semana/i);
  if (weeksMatch) return Number(weeksMatch[1]) * 7;
  return null;
}

function computeTaskDueDate(phase: string, weddingDateIso: string | null | undefined): Date | null {
  if (!weddingDateIso) return null;
  const offsetDays = parsePhaseOffsetDays(phase);
  if (offsetDays == null) return null;
  const [y, m, d] = weddingDateIso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  due.setDate(due.getDate() - offsetDays);
  return due;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getTaskPriority(dueDate: Date | null, currentDate: Date): TaskPriorityLevel {
  if (!dueDate) return "later";
  const diffDays = Math.round((startOfDay(dueDate).getTime() - startOfDay(currentDate).getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "urgent";
  if (diffDays <= 30) return "upcoming";
  return "later";
}

const TASK_PRIORITY_ORDER: Record<TaskPriorityLevel, number> = { overdue: 0, urgent: 1, upcoming: 2, later: 3 };

function sortByPriorityThenDue(a: PrioritizedTask, b: PrioritizedTask): number {
  const byPriority = TASK_PRIORITY_ORDER[a.priorityLevel] - TASK_PRIORITY_ORDER[b.priorityLevel];
  if (byPriority !== 0) return byPriority;
  if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.sort_order - b.sort_order;
}

/** As tarefas pendentes que mais precisam de atenção agora (seção "Agora"), no máx. `limit`. */
export function getPriorityTasks(
  checklist: ChecklistItem[],
  weddingDateIso: string | null | undefined,
  currentDate: Date,
  limit = 3
): PrioritizedTask[] {
  const withPriority: PrioritizedTask[] = checklist
    .filter((item) => !item.done)
    .map((item) => {
      const dueDate = computeTaskDueDate(item.phase, weddingDateIso);
      return { ...item, dueDate, priorityLevel: getTaskPriority(dueDate, currentDate) };
    });
  withPriority.sort(sortByPriorityThenDue);
  return withPriority.slice(0, limit);
}

/** Próximas tarefas (seção "Próximos passos"), excluindo as já mostradas em "Agora". */
export function getUpcomingTasksExcludingPriority(
  checklist: ChecklistItem[],
  priorityTaskIds: Set<string>,
  weddingDateIso: string | null | undefined,
  currentDate: Date,
  limit = 3
): PrioritizedTask[] {
  const rest: PrioritizedTask[] = checklist
    .filter((item) => !item.done && !priorityTaskIds.has(item.id))
    .map((item) => {
      const dueDate = computeTaskDueDate(item.phase, weddingDateIso);
      return { ...item, dueDate, priorityLevel: getTaskPriority(dueDate, currentDate) };
    });
  rest.sort(sortByPriorityThenDue);
  return rest.slice(0, limit);
}

/** "Atrasada há 12 dias" / "Em 4 dias" / "11 set" — label de prazo pra seção "Agora". */
export function formatTaskDueLabel(dueDate: Date | null, currentDate: Date): string {
  if (!dueDate) return "";
  const diffDays = Math.round((startOfDay(dueDate).getTime() - startOfDay(currentDate).getTime()) / 86400000);
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Atrasada há ${days} dia${days === 1 ? "" : "s"}`;
  }
  if (diffDays === 0) return "Hoje";
  if (diffDays <= 7) return `Em ${diffDays} dia${diffDays === 1 ? "" : "s"}`;
  return dueDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

/** "18 dias" / "hoje" / "atrasada" — label curto pra seção "Próximos passos". */
export function formatDaysFromNowShort(dueDate: Date | null, currentDate: Date): string {
  if (!dueDate) return "";
  const diffDays = Math.round((startOfDay(dueDate).getTime() - startOfDay(currentDate).getTime()) / 86400000);
  if (diffDays < 0) return "atrasada";
  if (diffDays === 0) return "hoje";
  return `${diffDays} dia${diffDays === 1 ? "" : "s"}`;
}

export type UpcomingVendorPayment = {
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: string; // ISO
  overdue: boolean;
};

/** Próximos pagamentos, derivados do saldo em aberto de cada fornecedor (contracted - paid)
 * com data de pagamento final cadastrada. Atrasado vem primeiro; depois, por proximidade. */
export function getUpcomingVendorPayments(
  vendors: Vendor[],
  currentDate: Date,
  limit = 2
): UpcomingVendorPayment[] {
  const today = startOfDay(currentDate);
  const pending: UpcomingVendorPayment[] = vendors
    .filter((v) => v.final_payment_date && v.contracted_value - v.paid_value > 0.01)
    .map((v) => {
      const [y, m, d] = v.final_payment_date!.split("-").map(Number);
      const due = new Date(y, m - 1, d);
      return {
        vendorId: v.id,
        vendorName: v.name,
        amount: v.contracted_value - v.paid_value,
        dueDate: v.final_payment_date!,
        overdue: due.getTime() < today.getTime(),
      };
    });
  pending.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  return pending.slice(0, limit);
}
