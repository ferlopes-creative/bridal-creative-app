import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Calculator, CheckSquare, ChevronRight, Heart, Store, Users } from "lucide-react";
import BottomAppNav from "@/components/BottomAppNav";
import { PageLoading } from "@/components/PageLoading";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { resolvePlanejamentoBackground, useSiteSettings } from "@/contexts/SiteSettingsContext";
import { LOGIN_PATH } from "@/lib/authGuard";
import { loginOrRegisterWithEmail } from "@/lib/authEmailLogin";
import { clearGuestMode, isGuestMode } from "@/lib/guestMode";
import { readLocalCache, writeLocalCache } from "@/lib/localCache";
import { supabase } from "@/lib/supabase";
import {
  VENDOR_CATEGORIES,
  daysUntil,
  formatDateBR,
  formatDateShortBR,
  GUEST_STATUS_LABEL,
  hasWeddingPremiumAccess,
  moneyBR,
  type ChecklistItem,
  type Guest,
  type GuestSide,
  type GuestStatus,
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
    const isPremiumValue = hasWeddingPremiumAccess(purchasedIds, premiumProductId);
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
    await supabase.from("checklist_items").update({ done: !item.done }).eq("id", item.id);
    setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)));
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
  const days = daysUntil(details?.wedding_date);
  const checklistPct = checklist.length ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100) : 0;
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
  const upcomingTasks = useMemo(() => checklist.filter((c) => !c.done).slice(0, 5), [checklist]);

  /* ============================================================ RENDER ============================================================ */
  if (phase === "loading") {
    return <PageLoading label="Carregando seu planejamento..." className="min-h-screen" />;
  }

  return (
    <div className="wp-page">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      {view === "dashboard" ? (
        <div className="wp-wrap">
          <div className="wp-page-header">
            <h1>
              Casamento de {details?.bride_name || "___"} e {details?.groom_name || "___"}
            </h1>
            <button className="wp-icon-btn-light" onClick={() => setEditCoupleOpen(true)} aria-label="Editar informações">
              ✎
            </button>
          </div>

          <div className="wp-hero">
            <div>
              <div className="wp-hero-label">Faltam para o grande dia</div>
              <div className="wp-hero-date">{formatDateBR(details?.wedding_date)}</div>
              <div className="wp-countdown">
                <span className="wp-num">{days}</span>
                <span className="wp-unit">dias</span>
              </div>
            </div>
            <div className="wp-hero-budget">
              <div className="wp-label">Orçamento total</div>
              <div className="wp-value">{moneyBR(details?.budget_total)}</div>
              <div className="wp-bar-track">
                <div className="wp-bar-fill" style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="wp-pct">
                {budgetPct}% do orçamento já pago ({moneyBR(totalPaid)})
              </div>
            </div>
          </div>

          <div className="wp-pair-grid">
            <div className="wp-card wp-stat-card">
              <div className="wp-stat-card-head">
                <span className="wp-stat-card-icon">
                  <Store size={16} strokeWidth={1.8} />
                </span>
                <div>
                  <h3>Fornecedores</h3>
                  <div className="wp-sub">Contratados até agora</div>
                </div>
              </div>
              <div className="wp-stat">{vendors.length}</div>
              <div className="wp-stat-label">fornecedor{vendors.length === 1 ? "" : "es"}</div>
              <button className="wp-card-footer" onClick={() => setView("vendors")}>
                Ver todos
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="wp-card wp-stat-card">
              <div className="wp-stat-card-head">
                <span className="wp-stat-card-icon">
                  <CheckSquare size={16} strokeWidth={1.8} />
                </span>
                <div>
                  <h3>Checklist</h3>
                  <div className="wp-sub">Progresso geral das tarefas</div>
                </div>
              </div>
              <div className="wp-stat">{checklistPct}%</div>
              <div className="wp-stat-label">concluído</div>
              <button className="wp-card-footer" onClick={() => setView("checklist")}>
                Ver checklist
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          <p className="wp-quick-access-label">Acesso rápido</p>
          <div className="wp-shortcut-row">
            <button className="wp-shortcut-btn" onClick={() => setView("budget")}>
              <span className="wp-shortcut-icon">
                <Calculator size={18} strokeWidth={1.8} />
              </span>
              Orçamento
            </button>
            <button className="wp-shortcut-btn" onClick={() => setView("vows")}>
              <span className="wp-shortcut-icon">
                <Heart size={18} strokeWidth={1.8} />
              </span>
              Votos
            </button>
            <button className="wp-shortcut-btn" onClick={goToGuestPage}>
              <span className="wp-shortcut-icon">
                <Users size={18} strokeWidth={1.8} />
              </span>
              Convidados
            </button>
          </div>

          <div className="wp-section">
            <div className="wp-section-head">
              <div className="wp-section-head-left">
                <h2>Próximas tarefas</h2>
              </div>
              <div className="wp-section-head-right">
                <button className="wp-btn-ghost" onClick={() => setView("checklist")}>
                  Ver tudo
                </button>
              </div>
            </div>
            <div className="wp-card">
              {upcomingTasks.length === 0 ? (
                <p className="wp-sub" style={{ marginBottom: 0 }}>
                  Tudo em dia por aqui — nenhuma tarefa pendente 🎉
                </p>
              ) : (
                upcomingTasks.map((item) => (
                  <div className="wp-check-item" key={item.id}>
                    <input type="checkbox" checked={item.done} onChange={() => void toggleTask(item)} />
                    <label>{item.title}</label>
                    <span className="wp-task-phase">{item.phase}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
              <div className="wp-section-head-left">
                <span className="wp-badge-free">Grátis</span>
              </div>
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
                <span className="wp-badge-premium">Premium</span>
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
              <div className="wp-section-head-left">
                <span className="wp-badge-free">Itens padrão grátis</span>
              </div>
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
                  {items.map((item) => (
                    <div className={`wp-check-item ${item.done ? "wp-done" : ""}`} key={item.id}>
                      <input type="checkbox" checked={item.done} onChange={() => void toggleTask(item)} />
                      <label>{item.title}</label>
                      <button className="wp-mini-x" onClick={() => void handleRemoveTask(item)} title="Remover">
                        ✕
                      </button>
                    </div>
                  ))}
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
                <span className="wp-badge-premium">Premium</span>
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
          Categoria <span className="wp-premium-tag">· Premium (usada no gráfico)</span>
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
        <label>
          Data de fechamento <span className="wp-premium-tag">· Premium</span>
        </label>
        <input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} disabled={!isPremium} />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>
          Data do pagamento final <span className="wp-premium-tag">· Premium</span>
        </label>
        <input
          type="date"
          value={finalPaymentDate}
          onChange={(e) => setFinalPaymentDate(e.target.value)}
          disabled={!isPremium}
        />
      </div>
      <div className="wp-field" onClick={() => !isPremium && onPremiumFieldClick()}>
        <label>
          Como foi combinado o pagamento <span className="wp-premium-tag">· Premium</span>
        </label>
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
