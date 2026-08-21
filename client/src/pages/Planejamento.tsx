import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Calculator, CheckSquare, ChevronRight, Pencil, Star, Store, Users } from "lucide-react";
import { toast } from "sonner";
import BottomAppNav from "@/components/BottomAppNav";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { resolvePlanejamentoBackground, useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useWeddingPlanning, type WeddingPlanningSummary } from "@/hooks/useWeddingPlanning";
import { LOGIN_PATH } from "@/lib/authGuard";
import { loginOrRegisterWithEmail } from "@/lib/authEmailLogin";
import { clearGuestMode, isGuestMode } from "@/lib/guestMode";
import { readLocalCache, writeLocalCache } from "@/lib/localCache";
import { supabase } from "@/lib/supabase";
import {
  VENDOR_CATEGORIES,
  formatCurrencyCompact,
  formatDateBR,
  formatDateShortBR,
  formatDaysFromNowShort,
  formatTaskDueLabel,
  getChecklistItemPriority,
  GUEST_STATUS_LABEL,
  hasWeddingPremiumAccess,
  moneyBR,
  type ChecklistItem,
  type Guest,
  type GuestSide,
  type GuestStatus,
  type PrioritizedTask,
  type Vendor,
  type WeddingDetails,
} from "@/lib/weddingPlanning";
import "./Planejamento.css";

/* ============================================================ TIPOS DE TELA ============================================================ */
type Phase = "loading" | "guest-email" | "app";
type DashView = "dashboard" | "guests" | "vendors" | "checklist" | "budget" | "vows";

/* ============================================================ MODAL BASE ============================================================ */
function Modal({
  open,
  onClose,
  children,
  extraClass = "",
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  extraClass?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={`wp-modal-overlay ${extraClass}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="wp-modal">{children}</div>
    </div>
  );
}

/* ============================================================ GRÁFICO DE PIZZA ============================================================ */
const PIE_COLORS = ["#6B724D", "#A98B4F", "#8C6E9E", "#6E7BA6", "#C77B57", "#5B6470", "#9AA379"];
const PLACEHOLDER_PIE: [string, number][] = [
  ["Buffet", 32],
  ["Decoração", 18],
  ["Fotografia e vídeo", 15],
  ["Vestido e trajes", 10],
  ["Música / DJ", 8],
  ["Papelaria", 7],
  ["Outros", 10],
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function BudgetPie({ vendors }: { vendors: Vendor[] }) {
  const groups: Record<string, number> = {};
  vendors.forEach((v) => {
    const cat = v.category || "Outros";
    groups[cat] = (groups[cat] || 0) + v.contracted_value;
  });
  let entries = Object.entries(groups).filter(([, v]) => v > 0);
  let usingPlaceholder = false;
  if (entries.length === 0) {
    entries = PLACEHOLDER_PIE;
    usingPlaceholder = true;
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);

  let angle = 0;
  const arcs = entries.map(([, val], i) => {
    const sweep = (val / total) * 360;
    const d = describeArc(110, 110, 100, angle, angle + sweep);
    angle += sweep;
    return <path key={i} d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} />;
  });

  return (
    <div className="wp-pie-wrap">
      <svg id="wpPieChartSvg" viewBox="0 0 220 220" width="220" height="220">
        {arcs}
      </svg>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div>
          {entries.map(([cat, val], i) => {
            const pct = Math.round((val / total) * 100);
            return (
              <div className="wp-legend-row" key={cat}>
                <span className="wp-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="wp-legend-name">{cat}</span>
                <span className="wp-legend-value wp-mono">{usingPlaceholder ? "" : moneyBR(val)}</span>
                <span className="wp-legend-pct wp-mono">{pct}%</span>
              </div>
            );
          })}
        </div>
        {usingPlaceholder ? (
          <div className="wp-pie-caption">
            Exemplo ilustrativo — os dados reais aparecem conforme você cadastra fornecedores.
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================ TELA: PEDIR E-MAIL (CONVIDADA) ============================================================ */
function GuestEmailGate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Digite seu e-mail pra continuar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await loginOrRegisterWithEmail(trimmed);
      clearGuestMode();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com este e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Antes de continuar</h3>
      <p className="wp-modal-sub">
        Seus dados de planejamento ficam salvos na sua conta. Informe seu e-mail pra criar (ou entrar
        na) sua conta — sem senha, sem complicação.
      </p>
      <div className="wp-field">
        <label>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="seuemail@exemplo.com"
          autoFocus
        />
      </div>
      {error ? <p style={{ color: "#A1493F", fontSize: 12.5, marginBottom: 10 }}>{error}</p> : null}
      <div className="wp-modal-actions">
        <button className="wp-btn" onClick={() => void submit()} disabled={busy}>
          {busy ? "Entrando..." : "Continuar"}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================ QUIZ DE ONBOARDING ============================================================ */
type OnboardField = {
  key: "name1" | "name2" | "weddingDate" | "budgetTotal";
  type: "text" | "date" | "number";
  label: string;
  placeholder?: string;
};

type OnboardStep = {
  title: string;
  blurb: string;
  fields: OnboardField[];
};

const ONBOARD_STEPS: OnboardStep[] = [
  {
    title: "Bem-vinda!",
    blurb:
      "Vamos montar seu dashboard de casamento em poucos passos. Começamos com os nomes de vocês, pra deixar tudo com a sua cara.",
    fields: [
      { key: "name1", type: "text", label: "Seu nome", placeholder: "Ex: Fernanda" },
      { key: "name2", type: "text", label: "Nome dele/dela", placeholder: "Ex: Daniel" },
    ],
  },
  {
    title: "Quando é o grande dia?",
    blurb:
      "Vamos usar essa data pra montar sua contagem regressiva e organizar o checklist mês a mês, conforme o prazo se aproxima.",
    fields: [{ key: "weddingDate", type: "date", label: "Data do casamento" }],
  },
  {
    title: "Qual o orçamento do casamento?",
    blurb: "Conforme você for cadastrando fornecedores e valores pagos, calculamos quanto já foi pago e quanto falta.",
    fields: [{ key: "budgetTotal", type: "number", label: "Orçamento total (R$)", placeholder: "Ex: 68000" }],
  },
];

function OnboardingQuiz({ onFinish }: { onFinish: (answers: Record<string, string>) => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const step = ONBOARD_STEPS[stepIndex];

  function setFieldValue(key: string, val: string) {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }

  function next() {
    const missing = step.fields.some((f) => !(answers[f.key] || "").trim());
    if (missing) {
      window.alert("Preenche esse campo pra continuar 🙂");
      return;
    }
    if (stepIndex < ONBOARD_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onFinish(answers);
    }
  }
  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  return (
    <Modal open>
      <div className="wp-quiz-progress">
        {ONBOARD_STEPS.map((_, i) => (
          <div key={i} className={`wp-quiz-dot ${i <= stepIndex ? "wp-active" : ""}`} />
        ))}
      </div>
      <div className="wp-quiz-step-label">
        Passo {stepIndex + 1} de {ONBOARD_STEPS.length}
      </div>
      <h3>{step.title}</h3>
      {step.blurb ? <p className="wp-modal-sub">{step.blurb}</p> : null}
      {step.fields.map((field, i) => (
        <div className="wp-field" key={field.key}>
          <label>{field.label}</label>
          <input
            type={field.type}
            placeholder={field.placeholder || ""}
            value={answers[field.key] || ""}
            onChange={(e) => setFieldValue(field.key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") next();
            }}
            autoFocus={i === 0}
          />
        </div>
      ))}
      <div className="wp-modal-actions">
        <button className="wp-btn-ghost" style={{ visibility: stepIndex === 0 ? "hidden" : "visible" }} onClick={back}>
          Voltar
        </button>
        <button className="wp-btn" onClick={next}>
          {stepIndex === ONBOARD_STEPS.length - 1 ? "Ver meu dashboard" : "Próximo"}
        </button>
      </div>
    </Modal>
  );
}

/* Guarda o último carregamento por usuário em localStorage: revisitar Planejamento
 * (mesmo reabrindo o app do zero) não mostra tela de carregamento de novo —
 * hidrata na hora e atualiza em segundo plano. */
type PlanningCache = {
  userId: string;
  details: WeddingDetails | null;
  vendors: Vendor[];
  checklist: ChecklistItem[];
  guests: Guest[];
  isPremium: boolean;
  premiumLink: string | null;
  showOnboarding: boolean;
};
const PLANNING_CACHE_KEY = "planning_v1";
const getPlanningCache = () => readLocalCache<PlanningCache>(PLANNING_CACHE_KEY);
const setPlanningCache = (value: PlanningCache) => writeLocalCache(PLANNING_CACHE_KEY, value);

/* ============================================================ PÁGINA PRINCIPAL ============================================================ */
export default function Planejamento() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const pageBgUrl = resolvePlanejamentoBackground(settings);
  const { session } = useAppAccessState();

  /**
   * A sessão já resolvida pelo AppAccessProvider (persiste entre navegações, ao contrário
   * do state desta página) permite saber a usuária sincronamente ao montar de novo esta
   * página — assim, se o cache local bater com ela, mostramos o conteúdo já carregado
   * de cara em vez do spinner de tela cheia, igual ao Dashboard/AppDataContext.
   */
  const initialUid = session?.user?.id ?? null;
  const initialCache = !isGuestMode() && initialUid ? getPlanningCache() : null;
  const cacheReady = initialCache != null && initialCache.userId === initialUid;

  const [phase, setPhase] = useState<Phase>(() => {
    if (isGuestMode()) return "guest-email";
    return cacheReady ? "app" : "loading";
  });
  const [userId, setUserId] = useState<string | null>(cacheReady ? initialUid : null);
  const [view, setView] = useState<DashView>("dashboard");

  const [details, setDetails] = useState<WeddingDetails | null>(cacheReady ? initialCache!.details : null);
  const [showOnboarding, setShowOnboarding] = useState(cacheReady ? initialCache!.showOnboarding : false);
  const [vendors, setVendors] = useState<Vendor[]>(cacheReady ? initialCache!.vendors : []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(cacheReady ? initialCache!.checklist : []);
  const [guests, setGuests] = useState<Guest[]>(cacheReady ? initialCache!.guests : []);
  const [isPremium, setIsPremium] = useState(cacheReady ? initialCache!.isPremium : false);
  const [premiumLink, setPremiumLink] = useState<string | null>(cacheReady ? initialCache!.premiumLink : null);

  const [premiumModal, setPremiumModal] = useState<{ open: boolean; text: string }>({ open: false, text: "" });
  const [editCoupleOpen, setEditCoupleOpen] = useState(false);
  const [vendorModal, setVendorModal] = useState<{ open: boolean; vendor: Vendor | null }>({
    open: false,
    vendor: null,
  });
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [vowsDraft, setVowsDraft] = useState(cacheReady ? initialCache!.details?.vows || "" : "");

  /* -------------------- carregamento -------------------- */
  useEffect(() => {
    void init();
  }, []);

  async function init() {
    if (isGuestMode()) {
      setPhase("guest-email");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setLocation(LOGIN_PATH);
      return;
    }
    const uid = data.user.id;

    const planningCache = getPlanningCache();
    if (planningCache && planningCache.userId === uid) {
      const cached = planningCache;
      setUserId(uid);
      setDetails(cached.details);
      setVendors(cached.vendors);
      setChecklist(cached.checklist);
      setGuests(cached.guests);
      setVowsDraft(cached.details?.vows || "");
      setIsPremium(cached.isPremium);
      setPremiumLink(cached.premiumLink);
      setShowOnboarding(cached.showOnboarding);
      setPhase("app");
      await loadAll(uid, { silent: true });
      return;
    }

    await loadAll(uid);
  }

  async function loadAll(uid: string, opts?: { silent?: boolean }) {
    setUserId(uid);
    if (!opts?.silent) setPhase("loading");

    const [detailsRes, vendorsRes, checklistRes, guestsRes, purchasesRes, productRes] = await Promise.all([
      supabase.from("wedding_details").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("vendors").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("checklist_items").select("*").eq("user_id", uid).order("sort_order"),
      supabase.from("guests").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("purchases").select("product_id, status").eq("user_id", uid).eq("status", "active"),
      supabase.from("products").select("id, link_compra").eq("is_wedding_planning_premium", true).maybeSingle(),
    ]);

    const purchasedIds = new Set((purchasesRes.data || []).map((p) => String(p.product_id)));
    const premiumProductId = productRes.data?.id ? String(productRes.data.id) : null;
    /**
     * Temporário: Planejamento liberado pra todo mundo por decisão estratégica (sem cobrança
     * por enquanto). Pra voltar a cobrar, troque a linha abaixo de volta por:
     * hasWeddingPremiumAccess(purchasedIds, premiumProductId)
     */
    const isPremiumValue = true;
    const premiumLinkValue = productRes.data?.link_compra || null;
    const vendorsValue = (vendorsRes.data as Vendor[]) || [];
    const guestsValue = (guestsRes.data as Guest[]) || [];

    setIsPremium(isPremiumValue);
    setPremiumLink(premiumLinkValue);
    setVendors(vendorsValue);
    setGuests(guestsValue);
    setVowsDraft((detailsRes.data as WeddingDetails | null)?.vows || "");

    if (!detailsRes.data) {
      setDetails(null);
      setChecklist([]);
      setShowOnboarding(true);
      setPhase("app");
      setPlanningCache({
        userId: uid,
        details: null,
        vendors: vendorsValue,
        checklist: [],
        guests: guestsValue,
        isPremium: isPremiumValue,
        premiumLink: premiumLinkValue,
        showOnboarding: true,
      });
      return;
    }

    setDetails(detailsRes.data as WeddingDetails);

    let checklistRows = (checklistRes.data as ChecklistItem[]) || [];
    if (checklistRows.length === 0) {
      await supabase.rpc("seed_default_wedding_checklist", { p_user_id: uid });
      const refetch = await supabase.from("checklist_items").select("*").eq("user_id", uid).order("sort_order");
      checklistRows = (refetch.data as ChecklistItem[]) || [];
    }
    setChecklist(checklistRows);
    setShowOnboarding(false);
    setPhase("app");
    setPlanningCache({
      userId: uid,
      details: detailsRes.data as WeddingDetails,
      vendors: vendorsValue,
      checklist: checklistRows,
      guests: guestsValue,
      isPremium: isPremiumValue,
      premiumLink: premiumLinkValue,
      showOnboarding: false,
    });
  }

  /* -------------------- onboarding -------------------- */
  async function finishOnboarding(answers: Record<string, string>) {
    if (!userId) return;
    const payload = {
      user_id: userId,
      bride_name: answers.name1,
      groom_name: answers.name2,
      wedding_date: answers.weddingDate,
      budget_total: parseFloat(answers.budgetTotal) || 0,
    };
    await supabase.from("wedding_details").insert(payload);
    await supabase.rpc("seed_default_wedding_checklist", { p_user_id: userId });
    await loadAll(userId);
  }

  /* -------------------- editar informações -------------------- */
  async function saveEditCouple(n1: string, n2: string, date: string, budget: number) {
    if (!userId || !n1 || !n2 || !date) {
      window.alert("Preenche o nome dos dois e a data pra continuar 🙂");
      return;
    }
    await supabase
      .from("wedding_details")
      .update({ bride_name: n1, groom_name: n2, wedding_date: date, budget_total: budget })
      .eq("user_id", userId);
    setEditCoupleOpen(false);
    await loadAll(userId);
  }

  /* -------------------- premium helpers -------------------- */
  function showPremiumUpsell(text: string) {
    setPremiumModal({ open: true, text });
  }
  function handleLockedClick(text: string) {
    if (!isPremium) showPremiumUpsell(text);
  }

  /* -------------------- fornecedores -------------------- */
  async function saveVendor(input: {
    name: string;
    category: string;
    contact: string;
    contracted: number;
    paid: number;
    closingDate: string;
    finalPaymentDate: string;
    paymentTerms: string;
  }) {
    if (!userId) return;
    if (!input.name.trim()) {
      window.alert("Dá um nome pro fornecedor 🙂");
      return;
    }
    const payload = {
      user_id: userId,
      name: input.name.trim(),
      category: isPremium ? input.category || "Outros" : "Outros",
      contact: input.contact.trim() || null,
      contracted_value: input.contracted || 0,
      paid_value: input.paid || 0,
      closing_date: isPremium ? input.closingDate || null : null,
      final_payment_date: isPremium ? input.finalPaymentDate || null : null,
      payment_terms: isPremium ? input.paymentTerms.trim() || null : null,
    };
    if (vendorModal.vendor) {
      await supabase.from("vendors").update(payload).eq("id", vendorModal.vendor.id);
    } else {
      await supabase.from("vendors").insert(payload);
    }
    setVendorModal({ open: false, vendor: null });
    await loadAll(userId);
  }

  async function deleteVendor(id: string) {
    if (!userId) return;
    if (!window.confirm("Remover esse fornecedor da lista?")) return;
    await supabase.from("vendors").delete().eq("id", id);
    await loadAll(userId);
  }

  function editVendor(vendor: Vendor) {
    if (!isPremium) {
      showPremiumUpsell("Edite valores, categorias, datas e condições de pagamento com todo o detalhe.");
      return;
    }
    setVendorModal({ open: true, vendor });
  }

  /* -------------------- checklist -------------------- */
  async function toggleTask(item: ChecklistItem) {
    if (!userId) return;
    const nextDone = !item.done;
    setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: nextDone } : c)));
    const { error } = await supabase.from("checklist_items").update({ done: nextDone }).eq("id", item.id);
    if (error) {
      setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: item.done } : c)));
      toast.error("Não foi possível salvar essa tarefa. Tente de novo.");
    }
  }

  async function handleAddPhase() {
    if (!isPremium) {
      showPremiumUpsell('Criar novas fases no checklist, com o nome e a quantidade de meses que você quiser, é um recurso Premium.');
      return;
    }
    if (!userId) return;
    const phaseName = window.prompt('Nome da nova fase (ex: "4 meses antes" ou "Lua de mel"):');
    if (!phaseName) return;
    const title = window.prompt("Primeira tarefa dessa fase:");
    if (!title) return;
    const nextOrder = checklist.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    await supabase
      .from("checklist_items")
      .insert({ user_id: userId, phase: phaseName, title, is_custom: true, sort_order: nextOrder });
    await loadAll(userId);
  }

  async function handleAddTask(phase: string) {
    if (!isPremium) {
      showPremiumUpsell("Adicionar tarefas próprias e ilimitadas no seu checklist é um recurso Premium.");
      return;
    }
    if (!userId) return;
    const title = window.prompt("Nova tarefa:");
    if (!title) return;
    const nextOrder = checklist.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    await supabase.from("checklist_items").insert({ user_id: userId, phase, title, is_custom: true, sort_order: nextOrder });
    await loadAll(userId);
  }

  async function handleRemoveTask(item: ChecklistItem) {
    if (!isPremium) {
      showPremiumUpsell("Remover ou editar tarefas do checklist é um recurso Premium.");
      return;
    }
    await supabase.from("checklist_items").delete().eq("id", item.id);
    setChecklist((prev) => prev.filter((c) => c.id !== item.id));
  }

  /* -------------------- convidados -------------------- */
  function goToGuestPage() {
    if (!isPremium) {
      showPremiumUpsell("A lista de convidados completa, com status de confirmação por pessoa, é um recurso Premium.");
      return;
    }
    setView("guests");
    window.scrollTo(0, 0);
  }

  async function saveGuests(namesRaw: string, side: GuestSide, status: GuestStatus) {
    if (!userId) return;
    const names = namesRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (names.length === 0) {
      window.alert("Cole ao menos um nome 🙂");
      return;
    }
    await supabase.from("guests").insert(names.map((name) => ({ user_id: userId, name, side, status })));
    setGuestModalOpen(false);
    await loadAll(userId);
  }

  async function removeGuest(id: string) {
    if (!userId) return;
    await supabase.from("guests").delete().eq("id", id);
    setGuests((prev) => prev.filter((g) => g.id !== id));
  }

  /* -------------------- votos -------------------- */
  async function saveVows() {
    if (!userId) return;
    await supabase.from("wedding_details").update({ vows: vowsDraft }).eq("user_id", userId);
    window.alert("Votos salvos ✓");
  }

  /* -------------------- derivados -------------------- */
  const totalPaid = useMemo(() => vendors.reduce((s, v) => s + v.paid_value, 0), [vendors]);
  const totalContracted = useMemo(() => vendors.reduce((s, v) => s + v.contracted_value, 0), [vendors]);
  const budgetPct = details && details.budget_total > 0 ? Math.min(100, Math.round((totalPaid / details.budget_total) * 100)) : 0;
  const checklistGroups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    checklist.forEach((item) => {
      if (!map.has(item.phase)) map.set(item.phase, []);
      map.get(item.phase)!.push(item);
    });
    return Array.from(map.entries());
  }, [checklist]);
  const guestConfirmed = guests.filter((g) => g.status === "confirmado").length;
  const guestPending = guests.filter((g) => g.status === "pendente").length;
  /** Resumo compacto usado só pela home (view "dashboard") — ver useWeddingPlanning. */
  const planning = useWeddingPlanning(details, vendors, checklist);

  /* ============================================================ RENDER ============================================================ */
  if (phase === "loading") {
    return (
      <div className="wp-page">
        <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
        <PlanningSkeleton />
        <BottomAppNav />
      </div>
    );
  }

  return (
    <div className="wp-page">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      {view === "dashboard" ? (
        <PlanningHome
          details={details}
          planning={planning}
          onEditCouple={() => setEditCoupleOpen(true)}
          onNavigate={setView}
          onGoToGuests={goToGuestPage}
          onToggleTask={(item) => void toggleTask(item)}
        />
      ) : view === "vendors" ? (
        <div className="wp-wrap">
          <button className="wp-back-link" onClick={() => setView("dashboard")}>
            ← Voltar ao dashboard
          </button>
          <div className="wp-page-header">
            <h1 style={{ fontSize: 24 }}>Fornecedores</h1>
          </div>

          <div className="wp-section">
            <div className="wp-section-head">
              <div />
              <div className="wp-section-head-right">
                <button className="wp-btn" onClick={() => setVendorModal({ open: true, vendor: null })}>
                  + Adicionar fornecedor
                </button>
              </div>
            </div>
            <div className="wp-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>Categoria</th>
                    <th>Contato</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr className="wp-empty-row">
                      <td colSpan={4}>Nenhum fornecedor cadastrado ainda. Clique em "+ Adicionar fornecedor" pra começar.</td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v.id}>
                        <td>{v.name}</td>
                        <td>{v.category || "—"}</td>
                        <td>{v.contact || "—"}</td>
                        <td>
                          <button className="wp-row-btn" onClick={() => editVendor(v)} title="Editar">
                            ✎
                          </button>
                          <button className="wp-row-btn wp-danger" onClick={() => void deleteVendor(v.id)} title="Remover">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="wp-section">
            <div className="wp-section-head">
              <div className="wp-section-head-left">
                <h2>Controle financeiro por fornecedor</h2>
              </div>
            </div>
            <div
              className={`wp-card ${!isPremium ? "wp-locked" : ""}`}
              style={{ padding: 0 }}
              onClick={() =>
                handleLockedClick(
                  "Veja o controle financeiro completo por fornecedor — valores, % pago, datas de fechamento e pagamento final, e como cada pagamento foi combinado."
                )
              }
            >
              <div className="wp-locked-content wp-table-scroll">
                <table style={{ border: "none", borderRadius: 0 }}>
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Contratado</th>
                      <th>Pago</th>
                      <th>Restante</th>
                      <th>%</th>
                      <th>Fechamento</th>
                      <th>Pagto. final</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.length === 0 ? (
                      <tr className="wp-empty-row">
                        <td colSpan={8}>Nenhum fornecedor cadastrado ainda.</td>
                      </tr>
                    ) : (
                      vendors.map((v) => {
                        const remaining = v.contracted_value - v.paid_value;
                        const pct = v.contracted_value > 0 ? Math.round((v.paid_value / v.contracted_value) * 100) : 0;
                        return (
                          <tr key={v.id}>
                            <td>{v.name}</td>
                            <td className="wp-mono">{moneyBR(v.contracted_value)}</td>
                            <td className="wp-mono">{moneyBR(v.paid_value)}</td>
                            <td className="wp-mono">{moneyBR(remaining)}</td>
                            <td>
                              <span className="wp-pct-pill">{pct}%</span>
                            </td>
                            <td className="wp-mono">{formatDateShortBR(v.closing_date)}</td>
                            <td className="wp-mono">{formatDateShortBR(v.final_payment_date)}</td>
                            <td>
                              <button className="wp-row-btn" onClick={() => editVendor(v)} title="Editar">
                                ✎
                              </button>
                              <button className="wp-row-btn wp-danger" onClick={() => void deleteVendor(v.id)} title="Remover">
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <LockOverlay />
            </div>
          </div>
        </div>
      ) : view === "checklist" ? (
        <div className="wp-wrap">
          <button className="wp-back-link" onClick={() => setView("dashboard")}>
            ← Voltar ao dashboard
          </button>
          <div className="wp-page-header">
            <h1 style={{ fontSize: 24 }}>Checklist de planejamento</h1>
          </div>
          <div className="wp-section">
            <div className="wp-section-head">
              <div />
              <div className="wp-section-head-right">
                <button className="wp-btn-ghost" onClick={() => void handleAddPhase()}>
                  + Nova fase
                </button>
              </div>
            </div>
            <div className="wp-card">
              {checklistGroups.map(([phaseName, items]) => (
                <div className="wp-checklist-group" key={phaseName}>
                  <h4>{phaseName}</h4>
                  {items.map((item) => {
                    // vermelho = atraso; amarelo = perto (até 7 dias); verde = ainda de boa
                    const priorityColor = item.done
                      ? ""
                      : (() => {
                          const level = getChecklistItemPriority(item, details?.wedding_date, new Date());
                          return level === "overdue" ? "wp-priority-red" : level === "urgent" ? "wp-priority-yellow" : "wp-priority-green";
                        })();
                    return (
                      <div
                        className={`wp-check-item ${item.done ? "wp-done" : ""} ${priorityColor}`}
                        key={item.id}
                      >
                        <input type="checkbox" checked={item.done} onChange={() => void toggleTask(item)} />
                        <label>{item.title}</label>
                        <button className="wp-mini-x" onClick={() => void handleRemoveTask(item)} title="Remover">
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <button className="wp-add-task-link" onClick={() => void handleAddTask(phaseName)}>
                    + Adicionar tarefa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : view === "budget" ? (
        <div className="wp-wrap">
          <button className="wp-back-link" onClick={() => setView("dashboard")}>
            ← Voltar ao dashboard
          </button>
          <div className="wp-page-header">
            <h1 style={{ fontSize: 24 }}>Orçamento</h1>
          </div>

          <div className="wp-pair-grid" style={{ marginBottom: 20 }}>
            <div className="wp-card">
              <h3>Orçamento total</h3>
              <div className="wp-sub">{budgetPct}% já pago</div>
              <div className="wp-stat">{moneyBR(details?.budget_total)}</div>
              <div className="wp-bar-track" style={{ marginTop: 10 }}>
                <div className="wp-bar-fill" style={{ width: `${budgetPct}%`, background: "linear-gradient(90deg, var(--wp-accent), var(--wp-gold))" }} />
              </div>
            </div>
            <div
              className={`wp-card ${!isPremium ? "wp-locked" : ""}`}
              onClick={() =>
                handleLockedClick("Veja o total em aberto por fornecedor — quanto já foi pago e quanto ainda falta.")
              }
            >
              <div className="wp-locked-content">
                <h3>Falta pagar</h3>
                <div className="wp-sub">Total em aberto com fornecedores</div>
                <div className="wp-stat">{moneyBR(Math.max(0, totalContracted - totalPaid))}</div>
                <div className="wp-stat-label">em aberto</div>
              </div>
              <LockOverlay />
            </div>
          </div>

          <div className="wp-section">
            <div className="wp-section-head">
              <div className="wp-section-head-left">
                <h2>Orçamento por área</h2>
              </div>
            </div>
            <div
              className={`wp-card ${!isPremium ? "wp-locked" : ""}`}
              onClick={() =>
                handleLockedClick("Escolha a categoria de cada fornecedor e veja, num gráfico, quanto do seu orçamento está em cada área.")
              }
            >
              <div className="wp-locked-content">
                <BudgetPie vendors={vendors} />
              </div>
              <LockOverlay />
            </div>
          </div>
        </div>
      ) : view === "vows" ? (
        <div className="wp-wrap">
          <button className="wp-back-link" onClick={() => setView("dashboard")}>
            ← Voltar ao dashboard
          </button>
          <div className="wp-page-header">
            <h1 style={{ fontSize: 24 }}>Seus votos</h1>
          </div>
          <div className="wp-card">
            <div className="wp-sub" style={{ marginBottom: 12 }}>
              Um espaço só seu pra rascunhar e guardar o que você quer dizer no altar.
            </div>
            <textarea
              value={vowsDraft}
              onChange={(e) => setVowsDraft(e.target.value)}
              placeholder="Comece a escrever seus votos aqui..."
            />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button className="wp-btn" onClick={() => void saveVows()}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <GuestsView
          guests={guests}
          confirmed={guestConfirmed}
          pending={guestPending}
          onBack={() => setView("dashboard")}
          onAdd={() => setGuestModalOpen(true)}
          onRemove={(id) => void removeGuest(id)}
        />
      )}

      {/* MODAL: EDITAR INFORMAÇÕES */}
      <EditCoupleModal
        open={editCoupleOpen}
        details={details}
        onClose={() => setEditCoupleOpen(false)}
        onSave={saveEditCouple}
      />

      {/* MODAL: FORNECEDOR */}
      <VendorModal
        open={vendorModal.open}
        vendor={vendorModal.vendor}
        isPremium={isPremium}
        onClose={() => setVendorModal({ open: false, vendor: null })}
        onSave={saveVendor}
        onPremiumFieldClick={() =>
          handleLockedClick(
            "Escolha a categoria, registre as datas de fechamento e pagamento final, e anote como combinou o pagamento com cada fornecedor."
          )
        }
      />

      {/* MODAL: CONVIDADOS EM LOTE */}
      <GuestModal open={guestModalOpen} onClose={() => setGuestModalOpen(false)} onSave={saveGuests} />

      {/* MODAL: UPSELL PREMIUM */}
      <Modal open={premiumModal.open} onClose={() => setPremiumModal({ open: false, text: "" })} extraClass="wp-premium-modal">
        <svg className="wp-upsell-icon" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="var(--wp-accent-deep)" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="var(--wp-accent-deep)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <h3>
          Que tal planejar seu casamento
          <br />
          de um jeito ainda mais organizado?
        </h3>
        <p className="wp-modal-sub">{premiumModal.text}</p>
        <ul className="wp-premium-benefits">
          <li>Controle financeiro completo por fornecedor</li>
          <li>Categorização e gráfico de orçamento por área</li>
          <li>Checklist com fases e tarefas ilimitadas</li>
          <li>Lista de convidados completa</li>
        </ul>
        <div className="wp-modal-actions" style={{ justifyContent: "center" }}>
          <button className="wp-btn-ghost" onClick={() => setPremiumModal({ open: false, text: "" })}>
            Agora não
          </button>
          <button
            className="wp-btn"
            onClick={() => {
              if (premiumLink) {
                window.open(premiumLink, "_blank", "noopener,noreferrer");
              } else {
                window.alert("Em breve. Fale com a equipe pra assinar o Premium do Planejamento.");
              }
            }}
          >
            Desbloquear acesso
          </button>
        </div>
      </Modal>

      {/* GATE DE E-MAIL — convidada, sobre o dashboard (vazio) */}
      {phase === "guest-email" ? <GuestEmailGate onDone={() => void init()} /> : null}

      {/* QUIZ DE ONBOARDING — sobre o dashboard, na 1ª vez */}
      {showOnboarding ? <OnboardingQuiz onFinish={(a) => void finishOnboarding(a)} /> : null}

      <BottomAppNav />
    </div>
  );
}

/* ============================================================ SUBCOMPONENTES ============================================================ */
function LockOverlay() {
  return (
    <div className="wp-lock-overlay">
      <svg className="wp-lock-icon" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="#fff" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <p>
        Recurso Premium
        <br />
        <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 11 }}>Clique para desbloquear</span>
      </p>
    </div>
  );
}

function EditCoupleModal({
  open,
  details,
  onClose,
  onSave,
}: {
  open: boolean;
  details: WeddingDetails | null;
  onClose: () => void;
  onSave: (n1: string, n2: string, date: string, budget: number) => void;
}) {
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (open) {
      setN1(details?.bride_name || "");
      setN2(details?.groom_name || "");
      setDate(details?.wedding_date || "");
      setBudget(details?.budget_total ? String(details.budget_total) : "");
    }
  }, [open, details]);

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Editar informações</h3>
      <p className="wp-modal-sub">Atualize os dados do seu casamento.</p>
      <div className="wp-field">
        <label>Nome da noiva</label>
        <input type="text" value={n1} onChange={(e) => setN1(e.target.value)} />
      </div>
      <div className="wp-field">
        <label>Nome do noivo</label>
        <input type="text" value={n2} onChange={(e) => setN2(e.target.value)} />
      </div>
      <div className="wp-field">
        <label>Data do casamento</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="wp-field">
        <label>Orçamento total (R$)</label>
        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </div>
      <div className="wp-modal-actions">
        <button className="wp-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="wp-btn" onClick={() => onSave(n1.trim(), n2.trim(), date, parseFloat(budget) || 0)}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function VendorModal({
  open,
  vendor,
  isPremium,
  onClose,
  onSave,
  onPremiumFieldClick,
}: {
  open: boolean;
  vendor: Vendor | null;
  isPremium: boolean;
  onClose: () => void;
  onSave: (input: {
    name: string;
    category: string;
    contact: string;
    contracted: number;
    paid: number;
    closingDate: string;
    finalPaymentDate: string;
    paymentTerms: string;
  }) => void;
  onPremiumFieldClick: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [contact, setContact] = useState("");
  const [contracted, setContracted] = useState("");
  const [paid, setPaid] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [finalPaymentDate, setFinalPaymentDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  useEffect(() => {
    if (open) {
      setName(vendor?.name || "");
      setCategory(vendor?.category || "");
      setContact(vendor?.contact || "");
      setContracted(vendor?.contracted_value ? String(vendor.contracted_value) : "");
      setPaid(vendor?.paid_value ? String(vendor.paid_value) : "");
      setClosingDate(vendor?.closing_date || "");
      setFinalPaymentDate(vendor?.final_payment_date || "");
      setPaymentTerms(vendor?.payment_terms || "");
    }
  }, [open, vendor]);

  return (
    <Modal open={open} onClose={onClose}>
      <h3>{vendor ? "Editar fornecedor" : "Adicionar fornecedor"}</h3>
      <div className="wp-field">
        <label>Nome</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Buffet Sabor & Arte" />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>
          Categoria <span className="wp-premium-tag">· usada no gráfico</span>
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!isPremium}>
          <option value="">Selecione...</option>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="wp-field">
        <label>Contato</label>
        <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefone ou e-mail" />
      </div>
      <div className="wp-field">
        <label>Valor contratado (R$)</label>
        <input type="number" value={contracted} onChange={(e) => setContracted(e.target.value)} placeholder="0" />
      </div>
      <div className="wp-field">
        <label>Valor já pago (R$)</label>
        <input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>Data de fechamento</label>
        <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} disabled={!isPremium} />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>Data do pagamento final</label>
        <input
          type="date"
          value={finalPaymentDate}
          onChange={(e) => setFinalPaymentDate(e.target.value)}
          disabled={!isPremium}
        />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>Como foi combinado o pagamento</label>
        <textarea
          rows={3}
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          disabled={!isPremium}
          placeholder="Ex: 30% de sinal na assinatura, restante em 3x até 15 dias antes do evento"
        />
      </div>
      <div className="wp-modal-actions">
        <button className="wp-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="wp-btn"
          onClick={() =>
            onSave({
              name,
              category,
              contact,
              contracted: parseFloat(contracted) || 0,
              paid: parseFloat(paid) || 0,
              closingDate,
              finalPaymentDate,
              paymentTerms,
            })
          }
        >
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function GuestModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (names: string, side: GuestSide, status: GuestStatus) => void;
}) {
  const [names, setNames] = useState("");
  const [side, setSide] = useState<GuestSide>("Noiva");
  const [status, setStatus] = useState<GuestStatus>("pendente");

  useEffect(() => {
    if (open) {
      setNames("");
      setSide("Noiva");
      setStatus("pendente");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <h3>Adicionar convidados</h3>
      <p className="wp-modal-sub">Cole a lista com um nome por linha — o app separa automaticamente.</p>
      <div className="wp-field">
        <label>Nomes</label>
        <textarea
          rows={6}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={"Marina Costa\nRafael Souza\nBeatriz e João"}
        />
      </div>
      <div className="wp-field">
        <label>Lado</label>
        <select value={side} onChange={(e) => setSide(e.target.value as GuestSide)}>
          <option>Noiva</option>
          <option>Noivo</option>
          <option>Ambos</option>
        </select>
      </div>
      <div className="wp-field">
        <label>Status inicial</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as GuestStatus)}>
          <option value="pendente">Aguardando resposta</option>
          <option value="confirmado">Confirmado</option>
          <option value="nao">Não vai</option>
        </select>
      </div>
      <div className="wp-modal-actions">
        <button className="wp-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="wp-btn" onClick={() => onSave(names, side, status)}>
          Adicionar
        </button>
      </div>
    </Modal>
  );
}

function GuestsView({
  guests,
  confirmed,
  pending,
  onBack,
  onAdd,
  onRemove,
}: {
  guests: Guest[];
  confirmed: number;
  pending: number;
  onBack: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="wp-wrap">
      <button className="wp-back-link" onClick={onBack}>
        ← Voltar ao dashboard
      </button>
      <div className="wp-page-header">
        <h1 style={{ fontSize: 24 }}>Lista de convidados</h1>
      </div>
      <div className="wp-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        <div className="wp-card">
          <div className="wp-stat">{guests.length}</div>
          <div className="wp-stat-label">convidados</div>
        </div>
        <div className="wp-card">
          <div className="wp-stat">{confirmed}</div>
          <div className="wp-stat-label">confirmados</div>
        </div>
        <div className="wp-card">
          <div className="wp-stat">{pending}</div>
          <div className="wp-stat-label">aguardando resposta</div>
        </div>
      </div>
      <div className="wp-section-head">
        <div />
        <button className="wp-btn" onClick={onAdd}>
          + Adicionar convidados
        </button>
      </div>
      <div className="wp-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Lado</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr className="wp-empty-row">
                <td colSpan={4}>Nenhum convidado ainda. Cole sua lista em "+ Adicionar convidados".</td>
              </tr>
            ) : (
              guests.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.side}</td>
                  <td>
                    <span className={`wp-status-pill wp-status-${g.status}`}>{GUEST_STATUS_LABEL[g.status]}</span>
                  </td>
                  <td>
                    <button className="wp-row-btn wp-danger" onClick={() => onRemove(g.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================ HOME COMPACTA DO PLANEJAMENTO ============================================================
 * PlanningHome: só 6 blocos (header, resumo, agora, pagamentos, áreas, próximos
 * passos). Nada de cálculo aqui — tudo já vem pronto de useWeddingPlanning. */
function PlanningHome({
  details,
  planning,
  onEditCouple,
  onNavigate,
  onGoToGuests,
  onToggleTask,
}: {
  details: WeddingDetails | null;
  planning: WeddingPlanningSummary;
  onEditCouple: () => void;
  onNavigate: (view: DashView) => void;
  onGoToGuests: () => void;
  onToggleTask: (item: PrioritizedTask) => void;
}) {
  return (
    <div className="wp2-home">
      <WeddingHeader details={details} onEdit={onEditCouple} />
      <PlanningHero planning={planning} />
      <NowSection planning={planning} onToggleTask={onToggleTask} />
      <UpcomingPayments planning={planning} onSeeAll={() => onNavigate("budget")} />
      <PlanningCategories onNavigate={onNavigate} onGoToGuests={onGoToGuests} />
      <UpcomingTasks planning={planning} onSeeAll={() => onNavigate("checklist")} onToggleTask={onToggleTask} />
    </div>
  );
}

/* ---------- Nome do casal — fica fora do hero, em fonte manuscrita, bem coladinho nele ---------- */
function WeddingHeader({
  details,
  onEdit,
}: {
  details: WeddingDetails | null;
  onEdit: () => void;
}) {
  const brideName = details?.bride_name?.trim() || "___";
  const groomName = details?.groom_name?.trim() || "___";

  return (
    <header className="wp2-header">
      <div className="wp2-header-top">
        <div>
          <p className="wp2-eyebrow">Casamento de</p>
          <h1 className="wp2-couple-name">
            {brideName} &amp; {groomName}
          </h1>
          <p className="wp2-header-date">{formatDateBR(details?.wedding_date)}</p>
        </div>
        <button type="button" className="wp2-edit-btn" onClick={onEdit} aria-label="Editar informações">
          <Pencil size={17} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

/* ---------- 1. Hero: "Faltam para o grande dia" + contagem + mini timeline (pontos) + resumo de 3 números ---------- */
function PlanningHero({ planning }: { planning: WeddingPlanningSummary }) {
  const items = planning.timeline.items;
  const monthsRemaining = planning.timeline.monthsRemaining;
  const timelineCaption =
    items.length === 0
      ? ""
      : monthsRemaining <= 0
        ? "É este mês!"
        : monthsRemaining === 1
          ? "Falta 1 mês para o casamento"
          : `Faltam ${monthsRemaining} meses para o casamento`;

  return (
    <div className="wp2-hero">
      <p className="wp2-hero-label">Faltam para o grande dia</p>
      <div className="wp2-hero-countdown">
        <span className="wp2-hero-num">{planning.daysUntilWedding}</span>
        <span className="wp2-hero-unit">dia{planning.daysUntilWedding === 1 ? "" : "s"}</span>
      </div>

      {items.length > 1 && (
        <div className="wp2-hero-timeline">
          <div className="wp2-hero-timeline-row">
            <span className="wp2-hero-timeline-line" aria-hidden />
            {items.map((item) => (
              <span className="wp2-hero-timeline-item" key={`${item.year}-${item.month}`}>
                <span
                  className={`wp2-hero-dot ${item.isCurrent ? "wp2-dot-current" : ""} ${
                    item.isWeddingMonth ? "wp2-dot-wedding" : ""
                  }`}
                >
                  {item.isWeddingMonth && <Star size={9} strokeWidth={0} fill="currentColor" />}
                </span>
                <span
                  className={`wp2-hero-timeline-label ${
                    item.isCurrent || item.isWeddingMonth ? "wp2-active" : ""
                  }`}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </div>
          {timelineCaption && <p className="wp2-hero-timeline-caption">{timelineCaption}</p>}
        </div>
      )}

      <div className="wp2-hero-summary">
        <div className="wp2-hero-summary-item">
          <div className="wp2-hero-summary-value">{planning.completionPercentage}%</div>
          <div className="wp2-hero-summary-label">planejado</div>
        </div>
        <div className="wp2-hero-summary-item">
          <div className="wp2-hero-summary-value">{planning.contractedSuppliers}</div>
          <div className="wp2-hero-summary-label">
            fornecedor{planning.contractedSuppliers === 1 ? "" : "es"}
          </div>
        </div>
        <div className="wp2-hero-summary-item">
          <div className="wp2-hero-summary-value">{formatCurrencyCompact(planning.amountRemaining)}</div>
          <div className="wp2-hero-summary-label">a pagar</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Agora: fase atual + até 3 tarefas prioritárias ---------- */
function NowSection({
  planning,
  onToggleTask,
}: {
  planning: WeddingPlanningSummary;
  onToggleTask: (item: PrioritizedTask) => void;
}) {
  const now = new Date();
  const phrase =
    planning.daysUntilWedding > 0
      ? `Faltam ${planning.daysUntilWedding} dia${planning.daysUntilWedding === 1 ? "" : "s"}. ${planning.planningPhase}`
      : planning.planningPhase;

  return (
    <section>
      <div className="wp2-section-title">
        <h2>Agora</h2>
      </div>
      <p className="wp2-now-phrase">{phrase}</p>
      {planning.priorityTasks.length === 0 ? (
        <p className="wp2-empty-note">Tudo em dia por aqui.</p>
      ) : (
        <div className="wp2-task-list">
          {planning.priorityTasks.map((task) => (
            <div className="wp2-task-row" key={task.id}>
              <input
                type="checkbox"
                className="wp2-task-checkbox"
                checked={task.done}
                onChange={() => onToggleTask(task)}
                aria-label={task.title}
              />
              <div className="wp2-task-main">
                <div className="wp2-task-title">{task.title}</div>
              </div>
              <div
                className={`wp2-task-due ${
                  task.priorityLevel === "overdue"
                    ? "wp2-overdue"
                    : task.priorityLevel === "urgent"
                      ? "wp2-urgent"
                      : ""
                }`}
              >
                {formatTaskDueLabel(task.dueDate, now)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- 4. Próximos pagamentos (até 2) ---------- */
function UpcomingPayments({
  planning,
  onSeeAll,
}: {
  planning: WeddingPlanningSummary;
  onSeeAll: () => void;
}) {
  return (
    <section>
      <div className="wp2-section-title">
        <h2>Próximos pagamentos</h2>
      </div>
      {planning.upcomingPayments.length === 0 ? (
        <div className="wp2-empty-block">
          <p className="wp2-empty-title">Nenhum pagamento próximo</p>
          <p className="wp2-empty-note">Tudo certo por enquanto.</p>
        </div>
      ) : (
        planning.upcomingPayments.map((payment) => (
          <div className="wp2-payment-row" key={payment.vendorId}>
            <div>
              <div className="wp2-payment-name">{payment.vendorName}</div>
              {payment.overdue ? <span className="wp2-payment-tag">ATRASADO</span> : null}
              <span className="wp2-payment-date">{formatDateShortBR(payment.dueDate)}</span>
            </div>
            <div className="wp2-payment-amount">{formatCurrencyCompact(payment.amount)}</div>
          </div>
        ))
      )}
      <div className="wp2-see-all-row">
        <button type="button" className="wp2-see-all" onClick={onSeeAll}>
          Ver orçamento
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}

/* ---------- 5. Planeje por área (grid 2x2) ---------- */
function PlanningCategories({
  onNavigate,
  onGoToGuests,
}: {
  onNavigate: (view: DashView) => void;
  onGoToGuests: () => void;
}) {
  return (
    <section>
      <div className="wp2-section-title">
        <h2>Planeje por área</h2>
      </div>
      <div className="wp2-category-grid">
        <button type="button" className="wp2-category-btn wp2-category-accent" onClick={onGoToGuests}>
          <Users className="wp2-category-icon" size={18} strokeWidth={1.6} />
          <span className="wp2-category-title">Convidados</span>
          <span className="wp2-category-sub">Lista e RSVP</span>
        </button>
        <button type="button" className="wp2-category-btn" onClick={() => onNavigate("vendors")}>
          <Store className="wp2-category-icon" size={18} strokeWidth={1.6} />
          <span className="wp2-category-title">Fornecedores</span>
          <span className="wp2-category-sub">Contratos</span>
        </button>
        <button type="button" className="wp2-category-btn" onClick={() => onNavigate("budget")}>
          <Calculator className="wp2-category-icon" size={18} strokeWidth={1.6} />
          <span className="wp2-category-title">Orçamento</span>
          <span className="wp2-category-sub">Custos</span>
        </button>
        <button type="button" className="wp2-category-btn wp2-category-accent" onClick={() => onNavigate("checklist")}>
          <CheckSquare className="wp2-category-icon" size={18} strokeWidth={1.6} />
          <span className="wp2-category-title">Checklist</span>
          <span className="wp2-category-sub">Tarefas</span>
        </button>
      </div>
      <div className="wp2-see-all-row">
        <button type="button" className="wp2-see-all" onClick={() => onNavigate("vows")}>
          Mais ferramentas
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}

/* ---------- 6. Próximos passos (até 3, sem repetir "Agora") ---------- */
function UpcomingTasks({
  planning,
  onSeeAll,
  onToggleTask,
}: {
  planning: WeddingPlanningSummary;
  onSeeAll: () => void;
  onToggleTask: (item: PrioritizedTask) => void;
}) {
  const now = new Date();
  return (
    <section>
      <div className="wp2-section-title">
        <h2>Próximos passos</h2>
        <button type="button" className="wp2-see-all" onClick={onSeeAll}>
          Ver todas
          <ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
      {planning.upcomingTasks.length === 0 ? (
        <p className="wp2-empty-note">Seu planejamento está em dia.</p>
      ) : (
        <div className="wp2-task-list">
          {planning.upcomingTasks.map((task) => (
            <div className="wp2-task-row" key={task.id}>
              <input
                type="checkbox"
                className="wp2-task-checkbox"
                checked={task.done}
                onChange={() => onToggleTask(task)}
                aria-label={task.title}
              />
              <div className="wp2-task-main">
                <div className="wp2-task-title">{task.title}</div>
              </div>
              <div className="wp2-task-due">{formatDaysFromNowShort(task.dueDate, now)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- skeleton de carregamento, na mesma estrutura compacta ---------- */
function PlanningSkeleton() {
  return (
    <div className="wp2-home" aria-busy="true" aria-label="Carregando planejamento">
      <div>
        <div className="wp2-skel" style={{ width: 90, height: 11 }} />
        <div className="wp2-skel" style={{ width: 200, height: 26, marginTop: 8 }} />
        <div className="wp2-skel" style={{ width: 110, height: 44, marginTop: 18 }} />
        <div className="wp2-skel" style={{ width: 160, height: 13, marginTop: 8 }} />
        <div className="wp2-skel" style={{ width: "70%", height: 13, marginTop: 14 }} />
      </div>
      <div className="wp2-skel" style={{ width: "100%", height: 78 }} />
      <div>
        <div className="wp2-skel" style={{ width: 70, height: 16 }} />
        <div className="wp2-skel" style={{ width: "100%", height: 90, marginTop: 16 }} />
      </div>
      <div>
        <div className="wp2-skel" style={{ width: 160, height: 16 }} />
        <div className="wp2-skel" style={{ width: "100%", height: 70, marginTop: 16 }} />
      </div>
      <div>
        <div className="wp2-skel" style={{ width: 130, height: 16 }} />
        <div className="wp2-skel" style={{ width: "100%", height: 170, marginTop: 16 }} />
      </div>
      <div>
        <div className="wp2-skel" style={{ width: 140, height: 16 }} />
        <div className="wp2-skel" style={{ width: "100%", height: 90, marginTop: 16 }} />
      </div>
    </div>
  );
}
