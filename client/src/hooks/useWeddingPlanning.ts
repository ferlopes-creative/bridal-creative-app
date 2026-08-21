import { useMemo } from "react";
import {
  daysUntil,
  getCompactWeddingTimeline,
  getPlanningPhase,
  getPriorityTasks,
  getUpcomingTasksExcludingPriority,
  getUpcomingVendorPayments,
  type ChecklistItem,
  type CompactWeddingTimeline,
  type PrioritizedTask,
  type UpcomingVendorPayment,
  type Vendor,
  type WeddingDetails,
} from "@/lib/weddingPlanning";

export type WeddingPlanningSummary = {
  daysUntilWedding: number;
  completionPercentage: number;
  contractedSuppliers: number;
  amountRemaining: number;
  timeline: CompactWeddingTimeline;
  planningPhase: string;
  priorityTasks: PrioritizedTask[];
  upcomingPayments: UpcomingVendorPayment[];
  upcomingTasks: PrioritizedTask[];
};

/**
 * Deriva o resumo compacto da home do Planejamento a partir dos dados já carregados
 * pela página (sem buscar nada sozinho — details/vendors/checklist continuam vindo
 * do loadAll existente). Mantém o JSX livre de cálculo.
 */
export function useWeddingPlanning(
  details: WeddingDetails | null,
  vendors: Vendor[],
  checklist: ChecklistItem[]
): WeddingPlanningSummary {
  return useMemo(() => {
    const now = new Date();
    const weddingDateIso = details?.wedding_date ?? null;
    const daysUntilWedding = daysUntil(weddingDateIso);

    const totalPaid = vendors.reduce((s, v) => s + v.paid_value, 0);
    const totalContracted = vendors.reduce((s, v) => s + v.contracted_value, 0);

    const completionPercentage = checklist.length
      ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)
      : 0;

    const priorityTasks = getPriorityTasks(checklist, weddingDateIso, now, 3);
    const priorityTaskIds = new Set(priorityTasks.map((t) => t.id));
    const upcomingTasks = getUpcomingTasksExcludingPriority(checklist, priorityTaskIds, weddingDateIso, now, 3);
    const upcomingPayments = getUpcomingVendorPayments(vendors, now, 2);
    const timeline = getCompactWeddingTimeline(now, weddingDateIso);
    const planningPhase = getPlanningPhase(daysUntilWedding);

    return {
      daysUntilWedding,
      completionPercentage,
      contractedSuppliers: vendors.length,
      amountRemaining: Math.max(0, totalContracted - totalPaid),
      timeline,
      planningPhase,
      priorityTasks,
      upcomingPayments,
      upcomingTasks,
    };
  }, [details, vendors, checklist]);
}
