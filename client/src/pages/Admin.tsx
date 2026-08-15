import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarHeart,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  Crop,
  Eye,
  EyeOff,
  Image,
  ImagePlus,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  Package,
  Palette,
  Pencil,
  Plus,
  Quote,
  Rows3,
  Save,
  Send,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AdminRichTextEditor from "@/components/AdminRichTextEditor";
import CollapsedRichTextField from "@/components/admin/CollapsedRichTextField";
import DashboardSectionsEditor from "@/components/admin/DashboardSectionsEditor";
import ExternalSalesIdField from "@/components/admin/ExternalSalesIdField";
import ImageCropModal from "@/components/admin/ImageCropModal";
import MediaGalleryEditor from "@/components/admin/MediaGalleryEditor";
import PageBackgroundsEditor from "@/components/admin/PageBackgroundsEditor";
import ProductCategoriesEditor from "@/components/admin/ProductCategoriesEditor";
import TestimonialsEditor from "@/components/admin/TestimonialsEditor";
import BrandLogo from "@/components/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT,
  useSiteSettings,
} from "@/contexts/SiteSettingsContext";
import {
  DEFAULT_SITE_COLORS,
  normalizeHexColor,
  type SiteColors,
} from "@/lib/siteColors";
import {
  fetchSiteSettingsRow,
  isDashboardSectionsConfigSchemaError,
  isFaviconUrlSchemaError,
  isHeroBannerDesktopUrlsSchemaError,
  isHeroBannerUrlsSchemaError,
  isPageBackgroundOpacityError,
  isPageBackgroundsPerPageError,
  isPageBackgroundSplitError,
  isSiteColorsSchemaError,
  isWhatsappUrlSchemaError,
} from "@/lib/siteSettingsRemote";
import {
  dashboardSectionsConfigToOrder,
  DEFAULT_DASHBOARD_SECTIONS_CONFIG,
  type DashboardSectionConfig,
} from "@/lib/dashboardSections";
import {
  assignProductToCategory,
  createProductCategory,
  findCategoryIdForProduct,
  isProductCategoriesConfigSchemaError,
  type ProductCategoryConfig,
} from "@/lib/productCategories";
import {
  isTestimonialsBannerUrlSchemaError,
  isTestimonialsConfigSchemaError,
  parseTestimonialsConfig,
  type TestimonialConfig,
} from "@/lib/testimonials";
import {
  isMissingFaqConfigColumnError,
  isMissingProductTestimonialsConfigColumnError,
  parseProductFaq,
  type ProductFaqItem,
} from "@/lib/productFaq";
import {
  isMissingModulesConfigColumnError,
  parseProductModules,
  type ProductModule,
} from "@/lib/productModules";
import {
  createCustomFont,
  isCustomFontsConfigSchemaError,
  type CustomFont,
} from "@/lib/customFonts";
import ProductFaqEditor from "@/components/admin/ProductFaqEditor";
import ProductModulesEditor from "@/components/admin/ProductModulesEditor";
import ProductTestimonialsEditor from "@/components/admin/ProductTestimonialsEditor";
import {
  accessLinksEqual,
  accessLinksToFormRows,
  emptyAccessLinkRow,
  formRowsToAccessLinks,
  parseAccessLinks,
  type ProductAccessLinkRow,
} from "@/lib/productAccessLinks";
import { parseGalleryUrls, resolveVideoGallery } from "@/lib/productDeliveryImages";
import { normalizeWhatsAppUrl } from "@/lib/whatsappUrl";
import { ProductCsvImport } from "@/components/ProductCsvImport";
import { grantLegacyPurchases, grantSingleLegacyPurchase } from "@/lib/adminGrantPurchase";
import { parseLegacyPurchaseLines } from "@/lib/legacyPurchaseImport";
import { safeStorageObjectName } from "@/lib/safeStorageKey";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string | null;
  title?: string | null;
  description?: string | null;
  description_delivery?: string | null;
  type?: "PRO" | "BON" | string | null;
  image_url?: string | null;
  image_delivery_url?: string | null;
  image_sales_url?: string | null;
  delivery_gallery_urls?: unknown;
  sales_gallery_urls?: unknown;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  video_sales_url?: string | null;
  video?: string | null;
  delivery_video_urls?: unknown;
  sales_video_urls?: unknown;
  link_compra?: string | null;
  access_links?: unknown;
  external_sales_id?: string | null;
  cakto_sales_id?: string | null;
  hotmart_sales_id?: string | null;
  is_hidden?: boolean | null;
  is_wedding_planning_premium?: boolean | null;
  price?: number | null;
  promo_price?: number | null;
  faq_config?: unknown;
  product_testimonials_config?: unknown;
  modules_config?: unknown;
};

/** Texto visível do HTML; vazio se for só markup vazio (ex. `<p></p>` do TipTap ao abrir). */
function richTextPlain(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>\s*<p>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Banco sem migração da coluna `description_delivery`. */
function isMissingDescriptionDeliveryColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("description_delivery");
}

/** Banco sem migração da coluna `video_url`. */
function isMissingVideoUrlColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("video_url") && !m.includes("video_sales_url");
}

/** Banco sem migração da coluna `video_sales_url`. */
function isMissingVideoSalesUrlColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("video_sales_url");
}

/** Banco sem migração da coluna `access_links`. */
function isMissingAccessLinksColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("access_links");
}

/** Banco sem migração das colunas de imagens de entrega. */
function isMissingImageDeliveryUrlColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("image_delivery_url");
}

function isMissingDeliveryGalleryUrlsColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("delivery_gallery_urls");
}

/** Banco sem migração das colunas de imagens de venda. */
function isMissingImageSalesUrlColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("image_sales_url");
}

function isMissingSalesGalleryUrlsColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("sales_gallery_urls");
}

function isMissingDeliveryVideoUrlsColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("delivery_video_urls");
}

function isMissingSalesVideoUrlsColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("sales_video_urls");
}

function isMissingCaktoSalesIdColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("cakto_sales_id");
}

function isMissingHotmartSalesIdColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("hotmart_sales_id");
}

function isMissingIsHiddenColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("is_hidden");
}

function isMissingPriceColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("'price'") || m.includes(".price") || m.includes("promo_price");
}

function isMissingWeddingPlanningPremiumColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("is_wedding_planning_premium");
}

function productStoreIdsLabel(p: Product): string {
  const parts: string[] = [];
  if (p.hotmart_sales_id?.trim()) parts.push(`Hotmart: ${p.hotmart_sales_id.trim()}`);
  if (p.cakto_sales_id?.trim()) parts.push(`Cakto: ${p.cakto_sales_id.trim()}`);
  if (parts.length === 0 && p.external_sales_id?.trim()) {
    parts.push(`loja: ${p.external_sales_id.trim()}`);
  }
  return parts.length ? ` (${parts.join(" · ")})` : "";
}

function looksLikeStorageError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return (
    m.includes("bucket") ||
    m.includes("storage api") ||
    (m.includes("upload") && (m.includes("policy") || m.includes("denied") || m.includes("jwt"))) ||
    m.includes("new row violates row-level security policy") && m.includes("objects")
  );
}

/** RLS em `products` sem política de escrita para admin autenticado. */
function isProductsRlsError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return (
    m.includes("row-level security") ||
    m.includes("row level security") ||
    (m.includes("permission denied") && m.includes("products"))
  );
}

function productsRlsHint(): string {
  return " Execute no Supabase (SQL Editor) a migração 20260522180000_products_grants_and_rls.sql.";
}

const sectionShell =
  "rounded-2xl border border-[#6B705C]/20 bg-white p-4 shadow-[0_1px_3px_rgba(80,88,60,0.06)] md:p-6";
const sectionH2 =
  "font-serif text-lg font-semibold tracking-tight text-[#4e563f] md:text-xl";
const sectionDesc = "mb-4 max-w-3xl text-sm leading-relaxed text-zinc-600";

const ADMIN_APP_VERSION = "v26.7.14";

type AdminSectionProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

function AdminSection({
  id,
  icon: Icon,
  title,
  description,
  headerExtra,
  children,
  defaultOpen = false,
}: AdminSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={sectionShell}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="-mx-1 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-[#6B705C]/5"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        id={`${id}-heading`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6B705C]/10">
          <Icon className="h-4 w-4 text-[#6B705C]" aria-hidden />
        </span>
        <h2 className={`${sectionH2} min-w-0 flex-1`}>{title}</h2>
        {headerExtra}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#6B705C] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={`${id}-content`}
          role="region"
          aria-labelledby={`${id}-heading`}
          className="mt-4 border-t border-[#6B705C]/10 pt-4"
        >
          {description ? <p className={sectionDesc}>{description}</p> : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

const wpInputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60";

/** Divisor visual entre grupos de campos do formulário de produto — apenas
 * organização, não altera nenhum estado ou lógica dos campos. */
function FormFieldGroup({ title, first = false }: { title: string; first?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${first ? "" : "pt-3"}`}>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B705C]/80">
        {title}
      </span>
      <span className="h-px flex-1 bg-zinc-200" aria-hidden />
    </div>
  );
}

/** Configura, num só lugar, qual produto (link de compra + IDs Hotmart/Cakto)
 * libera o Premium da seção Planejamento — é sempre no máximo 1 produto,
 * marcado via products.is_wedding_planning_premium. */
function WeddingPlanningPremiumSection({
  products,
  onSaved,
}: {
  products: Product[];
  onSaved: () => void;
}) {
  const existing = products.find((p) => p.is_wedding_planning_premium === true) || null;
  const duplicates = products.filter((p) => p.is_wedding_planning_premium === true);

  const [name, setName] = useState(existing?.name || "Planejamento Premium");
  const [linkCompra, setLinkCompra] = useState(existing?.link_compra || "");
  const [hotmartSalesId, setHotmartSalesId] = useState(existing?.hotmart_sales_id || "");
  const [caktoSalesId, setCaktoSalesId] = useState(existing?.cakto_sales_id || "");
  const [saving, setSaving] = useState(false);
  const [syncedFor, setSyncedFor] = useState<string>("__init__");

  const [usage, setUsage] = useState<{
    started: number;
    with_vendor: number;
    with_checklist_done: number;
    with_guests: number;
  } | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    const loadUsage = async () => {
      setUsageLoading(true);
      const { data, error } = await supabase.rpc("wedding_planning_usage_stats");
      if (error) {
        const msg = getErrorMessage(error).toLowerCase();
        setUsageError(
          msg.includes("wedding_planning_usage_stats") || msg.includes("does not exist")
            ? "Execute a migração 20260803000000_wedding_planning_usage_stats.sql no Supabase pra ver o uso."
            : `Não foi possível carregar o uso: ${getErrorMessage(error).slice(0, 160)}`
        );
        setUsage(null);
      } else {
        setUsageError(null);
        setUsage(data as typeof usage);
      }
      setUsageLoading(false);
    };
    void loadUsage();
  }, []);

  const existingKey = existing?.id || "none";
  if (syncedFor !== existingKey) {
    setSyncedFor(existingKey);
    setName(existing?.name || "Planejamento Premium");
    setLinkCompra(existing?.link_compra || "");
    setHotmartSalesId(existing?.hotmart_sales_id || "");
    setCaktoSalesId(existing?.cakto_sales_id || "");
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome pro produto (ex: Planejamento Premium).");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      link_compra: linkCompra.trim(),
      hotmart_sales_id: hotmartSalesId.trim() || null,
      cakto_sales_id: caktoSalesId.trim() || null,
      is_wedding_planning_premium: true,
      is_hidden: true,
      type: "PRO",
    };

    const result = existing
      ? await supabase.from("products").update(payload).eq("id", existing.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);

    if (result.error) {
      if (isMissingWeddingPlanningPremiumColumnError(result.error)) {
        toast.error(
          "Coluna is_wedding_planning_premium ausente. Execute a migração 20260801120000_wedding_planning.sql no Supabase."
        );
        return;
      }
      toast.error(`Não foi possível salvar: ${getErrorMessage(result.error).slice(0, 200)}`);
      return;
    }

    toast.success("Configuração do Planejamento Premium salva.");
    onSaved();
  };

  return (
    <AdminSection
      id="wedding-planning"
      icon={CalendarHeart}
      title="Planejamento de Casamento"
      description="Configure o produto que libera o Premium da seção Planejamento no app: link de compra e os IDs usados pelos webhooks da Hotmart/Cakto para identificar a compra automaticamente. Esse produto fica oculto do catálogo — ele só existe pra controlar o acesso."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-800">Quem está usando</p>
          {usageLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                <p className="text-xl font-semibold text-zinc-800">{usage?.started ?? "—"}</p>
                <p className="text-[11px] text-zinc-500">Iniciaram o planejamento</p>
              </div>
              <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                <p className="text-xl font-semibold text-zinc-800">{usage?.with_vendor ?? "—"}</p>
                <p className="text-[11px] text-zinc-500">Cadastraram fornecedor</p>
              </div>
              <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                <p className="text-xl font-semibold text-zinc-800">{usage?.with_checklist_done ?? "—"}</p>
                <p className="text-[11px] text-zinc-500">Concluíram alguma tarefa</p>
              </div>
              <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                <p className="text-xl font-semibold text-zinc-800">{usage?.with_guests ?? "—"}</p>
                <p className="text-[11px] text-zinc-500">Adicionaram convidados</p>
              </div>
            </div>
          )}
          {usageError ? (
            <p className="rounded-md border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900/90">
              {usageError}
            </p>
          ) : null}
        </div>

        {duplicates.length > 1 ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-800">
            Atenção: {duplicates.length} produtos estão marcados como Premium do Planejamento
            ({duplicates.map((p) => p.name || p.id).join(", ")}). Deveria haver só um — corrija direto no
            banco (deixe <code className="rounded bg-white px-1">is_wedding_planning_premium = true</code>{" "}
            em apenas um deles).
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm text-zinc-700">Nome do produto</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Planejamento Premium"
            disabled={saving}
            className={wpInputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-zinc-700">Link de compra (checkout)</label>
          <input
            type="url"
            value={linkCompra}
            onChange={(e) => setLinkCompra(e.target.value)}
            placeholder="https://pay.hotmart.com/... ou https://pay.cakto.com.br/..."
            disabled={saving}
            className={wpInputClass}
          />
          <p className="text-[11px] text-zinc-500">
            É pra onde o botão "Desbloquear acesso" leva quem ainda não é Premium.
          </p>
        </div>

        <ExternalSalesIdField
          hotmartValue={hotmartSalesId}
          caktoValue={caktoSalesId}
          onHotmartChange={setHotmartSalesId}
          onCaktoChange={setCaktoSalesId}
          disabled={saving}
        />

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#6B705C" }}
        >
          {saving ? (
            <>
              <Spinner className="size-4 text-white" />
              Salvando…
            </>
          ) : existing ? (
            "Atualizar configuração"
          ) : (
            "Salvar configuração"
          )}
        </button>
      </div>
    </AdminSection>
  );
}

const ADMIN_SHORTCUTS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "catalog", icon: LayoutGrid, label: "Catálogo de produtos" },
  { id: "dashboard-layout", icon: Rows3, label: "Seções do dashboard" },
  { id: "product-categories", icon: Compass, label: "Atalhos Explore" },
  { id: "testimonials", icon: Quote, label: "Depoimentos" },
  { id: "appearance", icon: Palette, label: "Aparência do app" },
  { id: "page-backgrounds", icon: Image, label: "Fundo por página" },
  { id: "registered-users", icon: Users, label: "Usuárias cadastradas" },
  { id: "wedding-planning", icon: CalendarHeart, label: "Planejamento Premium" },
  { id: "kit-bonus", icon: Package, label: "Bônus por kit" },
  { id: "notifications", icon: Bell, label: "Notificações" },
  { id: "legacy-access", icon: UserCheck, label: "Compradores antigos" },
];

/** Abre (se estiver fechada) e rola até a seção correspondente do accordion. */
function scrollToAdminSection(id: string) {
  const heading = document.getElementById(`${id}-heading`);
  if (!heading) return;
  if (heading.getAttribute("aria-expanded") === "false") {
    heading.click();
  }
  requestAnimationFrame(() => {
    heading.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** Visão geral no topo do Admin: números principais do app + atalhos pra cada seção,
 * pra não depender de rolar por uma lista longa de blocos pra achar o que precisa. */
function AdminOverview({
  productsCount,
  categoriesCount,
  testimonialsCount,
}: {
  productsCount: number;
  categoriesCount: number;
  testimonialsCount: number;
}) {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeCustomers, setActiveCustomers] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const [totalRes, purchasesRes] = await Promise.all([
        supabase.rpc("count_registered_users"),
        supabase.from("purchases").select("user_id").eq("status", "active"),
      ]);
      setTotalUsers(!totalRes.error && typeof totalRes.data === "number" ? totalRes.data : null);
      if (!purchasesRes.error && purchasesRes.data) {
        setActiveCustomers(new Set(purchasesRes.data.map((p) => String(p.user_id))).size);
      }
    };
    void load();
  }, []);

  const stats: { label: string; value: number | null }[] = [
    { label: "Usuárias cadastradas", value: totalUsers },
    { label: "Clientes ativas", value: activeCustomers },
    { label: "Produtos no catálogo", value: productsCount },
    { label: "Atalhos Explore", value: categoriesCount },
    { label: "Depoimentos", value: testimonialsCount },
  ];

  return (
    <section className="rounded-2xl border border-[#6B705C]/15 bg-white/90 p-4 shadow-sm md:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-[#faf9f6] p-3">
            <p className="font-mono text-xl text-[#6B705C]">{stat.value ?? "—"}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 mb-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-400">
        Ir direto para
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {ADMIN_SHORTCUTS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToAdminSection(id)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-[#6B705C]/10 bg-white p-3 text-center transition-colors hover:border-[#6B705C]/30 hover:bg-[#6B705C]/5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6B705C]/10">
              <Icon className="h-4 w-4 text-[#6B705C]" aria-hidden />
            </span>
            <span className="text-[11px] leading-tight text-zinc-700">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Contagem de contas no app: total (auth.users, via RPC restrita a admin)
 * e quantas têm ao menos 1 compra ativa (purchases, já legível pelo admin). */
function RegisteredUsersSection() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeCustomers, setActiveCustomers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [totalRes, purchasesRes] = await Promise.all([
      supabase.rpc("count_registered_users"),
      supabase.from("purchases").select("user_id").eq("status", "active"),
    ]);

    if (totalRes.error) {
      const msg = getErrorMessage(totalRes.error).toLowerCase();
      setError(
        msg.includes("count_registered_users") || msg.includes("does not exist")
          ? "Execute a migração 20260802130000_count_registered_users.sql no Supabase pra ver o total de contas."
          : `Não foi possível contar as contas: ${getErrorMessage(totalRes.error).slice(0, 160)}`
      );
      setTotalUsers(null);
    } else {
      setTotalUsers(typeof totalRes.data === "number" ? totalRes.data : null);
    }

    if (!purchasesRes.error && purchasesRes.data) {
      setActiveCustomers(new Set(purchasesRes.data.map((p) => String(p.user_id))).size);
    } else {
      setActiveCustomers(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminSection
      id="registered-users"
      icon={Users}
      title="Usuárias cadastradas"
      description="Quantas contas existem no app hoje e quantas têm pelo menos uma compra ativa."
    >
      {loading ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-4">
              <p className="text-2xl font-semibold text-zinc-800">{totalUsers ?? "—"}</p>
              <p className="text-xs text-zinc-500">Contas cadastradas no total</p>
            </div>
            <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-4">
              <p className="text-2xl font-semibold text-zinc-800">{activeCustomers ?? "—"}</p>
              <p className="text-xs text-zinc-500">Com pelo menos 1 compra ativa</p>
            </div>
          </div>
          {error ? (
            <p className="rounded-md border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900/90">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-medium text-[#6B705C] hover:underline"
          >
            Atualizar
          </button>
        </div>
      )}
    </AdminSection>
  );
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { refresh: refreshSiteSettings } = useSiteSettings();

  const IMAGE_BUCKET = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || "product-images";
  const VIDEO_BUCKET = import.meta.env.VITE_SUPABASE_VIDEO_BUCKET || "product-videos";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingDeliveryImageUrl, setExistingDeliveryImageUrl] = useState<string | null>(null);
  const [existingSalesImageUrl, setExistingSalesImageUrl] = useState<string | null>(null);
  const [deliveryGalleryUrls, setDeliveryGalleryUrls] = useState<string[]>([]);
  const [deliveryGalleryPendingFiles, setDeliveryGalleryPendingFiles] = useState<File[]>([]);
  const [salesGalleryUrls, setSalesGalleryUrls] = useState<string[]>([]);
  const [salesGalleryPendingFiles, setSalesGalleryPendingFiles] = useState<File[]>([]);
  const [deliveryVideoUrls, setDeliveryVideoUrls] = useState<string[]>([]);
  const [deliveryVideoPendingFiles, setDeliveryVideoPendingFiles] = useState<File[]>([]);
  const [salesVideoUrls, setSalesVideoUrls] = useState<string[]>([]);
  const [salesVideoPendingFiles, setSalesVideoPendingFiles] = useState<File[]>([]);
  const [cropModal, setCropModal] = useState<{ url: string; onDone: (blob: Blob) => void } | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionDelivery, setDescriptionDelivery] = useState("");
  const [linkCompra, setLinkCompra] = useState("");
  const [accessLinkRows, setAccessLinkRows] = useState<ProductAccessLinkRow[]>([emptyAccessLinkRow()]);
  const [uploadingAccessLinkCoverId, setUploadingAccessLinkCoverId] = useState<string | null>(null);
  const [type, setType] = useState<"PRO" | "BON">("PRO");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deliveryImageFile, setDeliveryImageFile] = useState<File | null>(null);
  const [salesImageFile, setSalesImageFile] = useState<File | null>(null);
  const [hotmartSalesId, setHotmartSalesId] = useState("");
  const [caktoSalesId, setCaktoSalesId] = useState("");
  const [legacyExternalSalesId, setLegacyExternalSalesId] = useState<string | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [faqRows, setFaqRows] = useState<ProductFaqItem[]>([]);
  const [productTestimonials, setProductTestimonials] = useState<TestimonialConfig[]>([]);
  const [modulesConfig, setModulesConfig] = useState<ProductModule[]>([]);
  /** Aba ativa no formulário completo de personalização do produto. */
  const [productFormTab, setProductFormTab] = useState<
    "geral" | "antes" | "depois" | "aulas" | "faq" | "depoimentos"
  >("geral");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  /** Cadastro de produto em 2 etapas: "basic" = só o essencial; "full" = personalização completa. */
  const [createStep, setCreateStep] = useState<"basic" | "full">("basic");

  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [siteFaviconUrl, setSiteFaviconUrl] = useState<string | null>(null);
  const [siteLoginBgUrl, setSiteLoginBgUrl] = useState<string | null>(null);
  const [siteAppBgUrl, setSiteAppBgUrl] = useState<string | null>(null);
  const [siteBgOpacityPercent, setSiteBgOpacityPercent] = useState(
    DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT
  );
  const [siteHeroUrls, setSiteHeroUrls] = useState<string[]>([]);
  const [siteHeroDesktopUrls, setSiteHeroDesktopUrls] = useState<string[]>([]);
  const [heroPendingFiles, setHeroPendingFiles] = useState<File[]>([]);
  const [heroDesktopPendingFiles, setHeroDesktopPendingFiles] = useState<File[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [bgLoginFile, setBgLoginFile] = useState<File | null>(null);
  const [bgAppFile, setBgAppFile] = useState<File | null>(null);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteColors, setSiteColors] = useState<SiteColors>({ ...DEFAULT_SITE_COLORS });
  const [siteWhatsappUrl, setSiteWhatsappUrl] = useState("");
  const [dashboardSectionsConfig, setDashboardSectionsConfig] = useState<DashboardSectionConfig[]>([
    ...DEFAULT_DASHBOARD_SECTIONS_CONFIG,
  ]);
  const [sectionOrderSaving, setSectionOrderSaving] = useState(false);
  const [productCategoriesConfig, setProductCategoriesConfig] = useState<ProductCategoryConfig[]>([]);
  const [categoriesSaving, setCategoriesSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [testimonialsConfig, setTestimonialsConfig] = useState<TestimonialConfig[]>([]);
  const [testimonialsBannerUrl, setTestimonialsBannerUrl] = useState<string | null>(null);
  const [testimonialsSaving, setTestimonialsSaving] = useState(false);
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [pageBgDashboardUrl, setPageBgDashboardUrl] = useState<string | null>(null);
  const [pageBgProfileUrl, setPageBgProfileUrl] = useState<string | null>(null);
  const [pageBgCommunityUrl, setPageBgCommunityUrl] = useState<string | null>(null);
  const [pageBgPlanejamentoUrl, setPageBgPlanejamentoUrl] = useState<string | null>(null);
  const [pageBackgroundsSaving, setPageBackgroundsSaving] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  const bgLoginFileInputRef = useRef<HTMLInputElement>(null);
  const bgAppFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const heroDesktopFileInputRef = useRef<HTMLInputElement>(null);

  const [kitProductId, setKitProductId] = useState("");
  const [kitBonusIds, setKitBonusIds] = useState<Record<string, boolean>>({});
  const [kitSaving, setKitSaving] = useState(false);
  const [kitListInitialized, setKitListInitialized] = useState(false);

  const NOTIF_TABLE = "app_notifications";
  type AppNotif = { id: string; title: string; body: string; created_at: string };
  const [notifications, setNotifications] = useState<AppNotif[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSaving, setNotifSaving] = useState(false);
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);

  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyProductId, setLegacyProductId] = useState("");
  const [legacyBulkText, setLegacyBulkText] = useState("");
  const [legacyGranting, setLegacyGranting] = useState(false);

  type ProductFormSnapshot = {
    name: string;
    description: string;
    descriptionDelivery: string;
    linkCompra: string;
    accessLinks: ReturnType<typeof formRowsToAccessLinks>;
    hotmartSalesId: string;
    caktoSalesId: string;
    type: "PRO" | "BON";
    isHidden: boolean;
  };

  const emptyFormSnapshot: ProductFormSnapshot = {
    name: "",
    description: "",
    descriptionDelivery: "",
    linkCompra: "",
    accessLinks: [],
    hotmartSalesId: "",
    caktoSalesId: "",
    type: "PRO",
    isHidden: false,
  };

  const [modalSnapshot, setModalSnapshot] = useState<ProductFormSnapshot>(emptyFormSnapshot);

  const sortedProducts = useMemo(
    () =>
      products
        .filter((product) => product.is_wedding_planning_premium !== true)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" })),
    [products]
  );

  const resetForm = () => {
    setEditingProductId(null);
    setExistingImageUrl(null);
    setExistingDeliveryImageUrl(null);
    setExistingSalesImageUrl(null);
    setDeliveryGalleryUrls([]);
    setDeliveryGalleryPendingFiles([]);
    setSalesGalleryUrls([]);
    setSalesGalleryPendingFiles([]);
    setDeliveryVideoUrls([]);
    setDeliveryVideoPendingFiles([]);
    setSalesVideoUrls([]);
    setSalesVideoPendingFiles([]);
    setName("");
    setDescription("");
    setDescriptionDelivery("");
    setLinkCompra("");
    setAccessLinkRows([emptyAccessLinkRow()]);
    setType("PRO");
    setImageFile(null);
    setDeliveryImageFile(null);
    setSalesImageFile(null);
    setHotmartSalesId("");
    setCaktoSalesId("");
    setLegacyExternalSalesId(null);
    setIsHidden(false);
    setSelectedCategoryId("");
    setPrice("");
    setPromoPrice("");
    setFaqRows([]);
    setProductTestimonials([]);
    setModulesConfig([]);
    setProductFormTab("geral");
    setCreateStep("basic");
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setIsModalOpen(false);
      resetForm();
    }, 180);
  };

  const openCreateModal = () => {
    resetForm();
    setModalSnapshot(emptyFormSnapshot);
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

  const openEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setCreateStep("full");
    setExistingImageUrl(product.image_url || product.image || product.thumbnail_url || null);
    setExistingDeliveryImageUrl(product.image_delivery_url?.trim() || null);
    setExistingSalesImageUrl(product.image_sales_url?.trim() || null);
    setDeliveryGalleryUrls(parseGalleryUrls(product.delivery_gallery_urls));
    setDeliveryGalleryPendingFiles([]);
    setSalesGalleryUrls(parseGalleryUrls(product.sales_gallery_urls));
    setSalesGalleryPendingFiles([]);
    setDeliveryVideoUrls(resolveVideoGallery(product.delivery_video_urls, product.video_url || product.video));
    setDeliveryVideoPendingFiles([]);
    setSalesVideoUrls(resolveVideoGallery(product.sales_video_urls, product.video_sales_url));
    setSalesVideoPendingFiles([]);
    setName(product.name || "");
    setDescription(product.description || "");
    setDescriptionDelivery(product.description_delivery || "");
    setLinkCompra(product.link_compra || "");
    const parsedAccessLinks = parseAccessLinks(product.access_links);
    setAccessLinkRows(accessLinksToFormRows(parsedAccessLinks));
    setType(product.type === "BON" ? "BON" : "PRO");
    setImageFile(null);
    setDeliveryImageFile(null);
    setSalesImageFile(null);
    const hotmartId = product.hotmart_sales_id?.trim() || "";
    const caktoId = product.cakto_sales_id?.trim() || "";
    setHotmartSalesId(hotmartId);
    setCaktoSalesId(caktoId);
    setLegacyExternalSalesId(product.external_sales_id?.trim() || null);
    setIsHidden(product.is_hidden === true);
    setSelectedCategoryId(findCategoryIdForProduct(productCategoriesConfig, product.id));
    setPrice(product.price != null ? String(product.price) : "");
    setPromoPrice(product.promo_price != null ? String(product.promo_price) : "");
    setFaqRows(parseProductFaq(product.faq_config));
    setProductTestimonials(parseTestimonialsConfig(product.product_testimonials_config));
    setModulesConfig(parseProductModules(product.modules_config));
    setProductFormTab("geral");
    setModalSnapshot({
      name: product.name || "",
      description: product.description || "",
      descriptionDelivery: product.description_delivery || "",
      linkCompra: product.link_compra || "",
      accessLinks: parsedAccessLinks,
      hotmartSalesId: hotmartId,
      caktoSalesId: caktoId,
      type: product.type === "BON" ? "BON" : "PRO",
      isHidden: product.is_hidden === true,
    });
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

  const clearFormFields = () => {
    setName(emptyFormSnapshot.name);
    setDescription(emptyFormSnapshot.description);
    setDescriptionDelivery(emptyFormSnapshot.descriptionDelivery);
    setLinkCompra(emptyFormSnapshot.linkCompra);
    setAccessLinkRows(accessLinksToFormRows(emptyFormSnapshot.accessLinks));
    setHotmartSalesId(emptyFormSnapshot.hotmartSalesId);
    setCaktoSalesId(emptyFormSnapshot.caktoSalesId);
    setType(emptyFormSnapshot.type);
    setIsHidden(emptyFormSnapshot.isHidden);
    setSelectedCategoryId("");
    setPrice("");
    setPromoPrice("");
    setImageFile(null);
    setDeliveryImageFile(null);
    setSalesImageFile(null);
    if (!editingProductId) {
      setExistingImageUrl(null);
      setExistingDeliveryImageUrl(null);
      setExistingSalesImageUrl(null);
      setDeliveryGalleryUrls([]);
      setDeliveryGalleryPendingFiles([]);
      setSalesGalleryUrls([]);
      setSalesGalleryPendingFiles([]);
      setDeliveryVideoUrls([]);
      setDeliveryVideoPendingFiles([]);
      setSalesVideoUrls([]);
      setSalesVideoPendingFiles([]);
      setLegacyExternalSalesId(null);
      setFaqRows([]);
      setProductTestimonials([]);
      setModulesConfig([]);
    }
    setModalSnapshot(emptyFormSnapshot);
  };

  const modalFormIsDirty = useMemo(() => {
    if (!isModalOpen) return false;
    const descChanged =
      richTextPlain(description) !== richTextPlain(modalSnapshot.description);
    const descDeliveryChanged =
      richTextPlain(descriptionDelivery) !== richTextPlain(modalSnapshot.descriptionDelivery);
    const accessLinksChanged = !accessLinksEqual(
      formRowsToAccessLinks(accessLinkRows),
      modalSnapshot.accessLinks
    );
    return (
      name.trim() !== modalSnapshot.name.trim() ||
      descChanged ||
      descDeliveryChanged ||
      linkCompra.trim() !== modalSnapshot.linkCompra.trim() ||
      accessLinksChanged ||
      hotmartSalesId.trim() !== modalSnapshot.hotmartSalesId.trim() ||
      caktoSalesId.trim() !== modalSnapshot.caktoSalesId.trim() ||
      type !== modalSnapshot.type ||
      isHidden !== modalSnapshot.isHidden ||
      imageFile != null ||
      deliveryImageFile != null ||
      salesImageFile != null ||
      deliveryGalleryPendingFiles.length > 0 ||
      salesGalleryPendingFiles.length > 0 ||
      deliveryVideoPendingFiles.length > 0 ||
      salesVideoPendingFiles.length > 0
    );
  }, [
    isModalOpen,
    name,
    description,
    descriptionDelivery,
    linkCompra,
    accessLinkRows,
    hotmartSalesId,
    caktoSalesId,
    type,
    isHidden,
    imageFile,
    deliveryImageFile,
    salesImageFile,
    deliveryGalleryPendingFiles,
    salesGalleryPendingFiles,
    deliveryVideoPendingFiles,
    salesVideoPendingFiles,
    modalSnapshot,
  ]);

  const fetchProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*");

    if (error) {
      console.error("Erro ao carregar produtos:", error);
    } else {
      setProducts(data ?? []);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel("admin-products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchProducts(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    const { data, error } = await supabase
      .from(NOTIF_TABLE)
      .select("id, title, body, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) setNotifications(data as AppNotif[]);
    setNotifLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel("admin-app-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: NOTIF_TABLE },
        fetchNotifications
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    const loadSite = async () => {
      setSiteLoading(true);
      const row = await fetchSiteSettingsRow();
      if (row) {
        const legacy = row.page_background_image_url;
        setSiteLogoUrl(row.logo_url);
        setSiteFaviconUrl(row.favicon_url);
        setSiteLoginBgUrl(row.page_background_login_url ?? legacy);
        setSiteAppBgUrl(row.page_background_app_url ?? legacy);
        setSiteBgOpacityPercent(row.page_background_opacity_percent);
        setSiteHeroUrls(row.hero_banner_urls);
        setSiteHeroDesktopUrls(row.hero_banner_desktop_urls);
        setSiteColors(row.colors);
        setSiteWhatsappUrl(row.whatsapp_url ?? "");
        setDashboardSectionsConfig(row.dashboard_sections_config);
        setProductCategoriesConfig(row.product_categories_config);
        setTestimonialsConfig(row.testimonials_config);
        setTestimonialsBannerUrl(row.testimonials_banner_url);
        setPageBgDashboardUrl(row.page_background_dashboard_url);
        setPageBgProfileUrl(row.page_background_profile_url);
        setPageBgCommunityUrl(row.page_background_community_url);
        setPageBgPlanejamentoUrl(row.page_background_planejamento_url);
        setCustomFonts(row.custom_fonts_config);
        setHeroPendingFiles([]);
        setHeroDesktopPendingFiles([]);
      }
      setSiteLoading(false);
    };
    void loadSite();
  }, []);

  useEffect(() => {
    if (!kitProductId) {
      setKitBonusIds({});
      return;
    }
    const loadKit = async () => {
      const { data } = await supabase
        .from("kit_bonus_products")
        .select("bonus_product_id")
        .eq("kit_product_id", kitProductId);
      const next: Record<string, boolean> = {};
      for (const row of data ?? []) {
        next[row.bonus_product_id] = true;
      }
      setKitBonusIds(next);
    };
    void loadKit();
  }, [kitProductId]);

  useEffect(() => {
    if (kitListInitialized || products.length === 0) return;
    const firstKit = products.find((p) => (p.type || "PRO").toUpperCase() !== "BON");
    if (firstKit) {
      setKitProductId(firstKit.id);
    }
    setKitListInitialized(true);
  }, [products, kitListInitialized]);

  const kitCandidates = useMemo(
    () => sortedProducts.filter((p) => (p.type || "PRO").toUpperCase() !== "BON"),
    [sortedProducts]
  );
  const bonusOnlyProducts = useMemo(
    () => sortedProducts.filter((p) => (p.type || "").toUpperCase() === "BON"),
    [sortedProducts]
  );

  const handlePublishNotification = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;

    setNotifSaving(true);
    try {
      const { error } = await supabase.from(NOTIF_TABLE).insert({
        title: notifTitle.trim(),
        body: notifBody.trim(),
      });
      if (error) throw error;
      setNotifTitle("");
      setNotifBody("");
      toast.success("Notificação enviada aos usuários.");
      await fetchNotifications();
    } catch (err: unknown) {
      console.error(err);
      const e = err as { code?: string; message?: string; details?: string };
      const code = e?.code || "";
      const msg = (e?.message || "Erro desconhecido").trim();
      if (code === "PGRST205" || msg.includes("schema cache")) {
        toast.error(
          "Tabela app_notifications ausente. No Supabase → SQL Editor, execute o arquivo supabase/migrations/20260421150000_app_notifications_grants_and_rls.sql"
        );
      } else {
        toast.error(
          `Não foi possível salvar: ${msg}${code ? ` [${code}]` : ""}. Se for "permission denied", execute a migração 20260421150000 no Supabase.`
        );
      }
    } finally {
      setNotifSaving(false);
    }
  };

  const handleDeleteNotification = async (row: AppNotif) => {
    if (!window.confirm(`Remover o aviso "${row.title}"?`)) return;
    setDeletingNotifId(row.id);
    try {
      const { error } = await supabase.from(NOTIF_TABLE).delete().eq("id", row.id);
      if (error) throw error;
      toast.success("Notificação removida.");
      await fetchNotifications();
    } catch (err: unknown) {
      console.error(err);
      const e = err as { code?: string; message?: string };
      toast.error(e?.message || "Não foi possível excluir.");
    } finally {
      setDeletingNotifId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/admin/login");
  };

  const handleDeleteProduct = async (product: Product) => {
    const label = product.name || product.title || "este produto";
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;

      if (editingProductId === product.id) {
        closeModal();
      }
      await fetchProducts(true);
      toast.success("Produto excluído.");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Não foi possível excluir o produto. Verifique permissões no Supabase.");
    } finally {
      setDeletingId(null);
    }
  };

  /** Duplica um produto (todos os campos), incluindo nas mesmas categorias/atalhos e na
   * seção manual "Pensados para você" se o original estiver lá — pra já aparecer no app. */
  const handleDuplicateProduct = async (product: Product) => {
    setDuplicatingId(product.id);
    try {
      const source = product as Record<string, unknown>;
      const payload: Record<string, unknown> = { ...source };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      payload.name = `${product.name || product.title || "Produto"} (cópia)`;
      // IDs de plataforma de venda e o flag do Planejamento Premium têm índice único no banco —
      // a cópia não pode herdá-los, senão o insert quebra por violar a constraint.
      payload.external_sales_id = null;
      payload.cakto_sales_id = null;
      payload.hotmart_sales_id = null;
      payload.is_wedding_planning_premium = false;

      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) throw error;
      const newId = data?.id as string | undefined;

      if (newId) {
        const inCategories = productCategoriesConfig.filter((category) =>
          category.product_ids.includes(product.id)
        );
        if (inCategories.length > 0) {
          const nextCategories = productCategoriesConfig.map((category) =>
            category.product_ids.includes(product.id)
              ? { ...category, product_ids: [...category.product_ids, newId] }
              : category
          );
          const { error: catError } = await supabase.from("site_settings").upsert({
            id: 1,
            product_categories_config: nextCategories,
            updated_at: new Date().toISOString(),
          });
          if (!catError) setProductCategoriesConfig(nextCategories);
        }

        const nextSections = dashboardSectionsConfig.map((section) =>
          section.kind === "products" &&
          section.mode === "manual" &&
          section.product_ids?.includes(product.id)
            ? { ...section, product_ids: [...(section.product_ids ?? []), newId] }
            : section
        );
        if (JSON.stringify(nextSections) !== JSON.stringify(dashboardSectionsConfig)) {
          const { error: secError } = await supabase.from("site_settings").upsert({
            id: 1,
            dashboard_sections_config: nextSections,
            dashboard_section_order: dashboardSectionsConfigToOrder(nextSections),
            updated_at: new Date().toISOString(),
          });
          if (!secError) setDashboardSectionsConfig(nextSections);
        }
      }

      await fetchProducts(true);
      await refreshSiteSettings();
      toast.success("Produto duplicado.");
    } catch (error) {
      console.error("Erro ao duplicar produto:", error);
      toast.error("Não foi possível duplicar o produto.");
    } finally {
      setDuplicatingId(null);
    }
  };

  const uploadFileToStorage = async (
    file: File,
    bucket: string,
    folder: "images" | "videos" | "fonts",
    /** ex.: site → images/site/arquivo.png */
    nestedFolder?: string
  ) => {
    const fileName = safeStorageObjectName(file);
    const filePath = nestedFolder ? `${folder}/${nestedFolder}/${fileName}` : `${folder}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    if (!data?.path) {
      throw new Error("Upload concluido sem path retornado pelo Supabase Storage.");
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  const openCropForSavedUrl = (url: string, onReplace: (newUrl: string) => void) => {
    setCropModal({
      url,
      onDone: async (blob) => {
        try {
          const file = new File([blob], "corte.jpg", { type: "image/jpeg" });
          const newUrl = await uploadFileToStorage(file, IMAGE_BUCKET, "images");
          onReplace(newUrl);
          setCropModal(null);
        } catch {
          toast.error("Não foi possível salvar o corte da imagem.");
        }
      },
    });
  };

  const openCropForPendingFile = (file: File, onReplace: (newFile: File) => void) => {
    const objectUrl = URL.createObjectURL(file);
    setCropModal({
      url: objectUrl,
      onDone: (blob) => {
        const newFile = new File([blob], file.name, { type: "image/jpeg" });
        onReplace(newFile);
        URL.revokeObjectURL(objectUrl);
        setCropModal(null);
      },
    });
  };

  const handleUploadCustomFont = async (file: File): Promise<CustomFont> => {
    const url = await uploadFileToStorage(file, IMAGE_BUCKET, "fonts");
    const name =
      file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Fonte personalizada";
    const font = createCustomFont(name, url);
    const next = [...customFonts, font];

    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      custom_fonts_config: next,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      if (isCustomFontsConfigSchemaError(error.message)) {
        toast.error(
          "Coluna custom_fonts_config ausente. Execute a migração 20260807140000_custom_fonts.sql no Supabase."
        );
      } else {
        toast.error("Não foi possível salvar a fonte.");
      }
      throw error;
    }

    setCustomFonts(next);
    await refreshSiteSettings();
    toast.success("Fonte enviada!");
    return font;
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const hotmartId = hotmartSalesId.trim();
    const caktoId = caktoSalesId.trim();
    const wasNewProductBasicCreate = !editingProductId && createStep === "basic";

    const continueToFullStep = (newId: string, uploadedImageUrl: string | null) => {
      setEditingProductId(newId);
      setExistingImageUrl(uploadedImageUrl);
      setImageFile(null);
      setCreateStep("full");
      setModalSnapshot({
        name,
        description,
        descriptionDelivery,
        linkCompra,
        accessLinks: formRowsToAccessLinks(accessLinkRows),
        hotmartSalesId,
        caktoSalesId,
        type,
        isHidden,
      });
    };

    const saveProductRow = async (
      imageUrl: string | null,
      videoUrl: string | null,
      deliveryImageUrl: string | null,
      galleryUrls: string[],
      salesImageUrl: string | null,
      salesGallery: string[],
      salesVideoUrl: string | null,
      deliveryVideoGallery: string[],
      salesVideoGallery: string[],
      opts: {
        includeCaktoSalesId: boolean;
        includeHotmartSalesId: boolean;
        includeDescriptionDelivery: boolean;
        includeVideoUrl: boolean;
        includeVideoSalesUrl: boolean;
        includeAccessLinks: boolean;
        includeImageDeliveryUrl: boolean;
        includeDeliveryGalleryUrls: boolean;
        includeImageSalesUrl: boolean;
        includeSalesGalleryUrls: boolean;
        includeIsHidden: boolean;
        includePrice: boolean;
        includeFaqConfig: boolean;
        includeProductTestimonialsConfig: boolean;
        includeModulesConfig: boolean;
        includeDeliveryVideoUrls: boolean;
        includeSalesVideoUrls: boolean;
      }
    ) => {
      const payload: Record<string, unknown> = {
        name,
        description,
        link_compra: linkCompra,
        type,
        image_url: imageUrl,
      };
      if (opts.includeDescriptionDelivery) {
        payload.description_delivery = descriptionDelivery;
      }
      if (opts.includeVideoUrl) {
        payload.video_url = videoUrl;
      }
      if (opts.includeVideoSalesUrl) {
        payload.video_sales_url = salesVideoUrl;
      }
      if (opts.includeAccessLinks) {
        payload.access_links = formRowsToAccessLinks(accessLinkRows);
      }
      if (opts.includeHotmartSalesId) {
        payload.hotmart_sales_id = hotmartId.length ? hotmartId : null;
      }
      if (opts.includeCaktoSalesId) {
        payload.cakto_sales_id = caktoId.length ? caktoId : null;
      }
      if (opts.includeImageDeliveryUrl) {
        payload.image_delivery_url = deliveryImageUrl;
      }
      if (opts.includeDeliveryGalleryUrls) {
        payload.delivery_gallery_urls = galleryUrls;
      }
      if (opts.includeImageSalesUrl) {
        payload.image_sales_url = salesImageUrl;
      }
      if (opts.includeSalesGalleryUrls) {
        payload.sales_gallery_urls = salesGallery;
      }
      if (opts.includeIsHidden) {
        payload.is_hidden = isHidden;
      }
      if (opts.includePrice) {
        payload.price = price.trim() ? parseFloat(price) : null;
        payload.promo_price = promoPrice.trim() ? parseFloat(promoPrice) : null;
      }
      if (opts.includeFaqConfig) {
        payload.faq_config = faqRows;
      }
      if (opts.includeProductTestimonialsConfig) {
        payload.product_testimonials_config = productTestimonials;
      }
      if (opts.includeModulesConfig) {
        payload.modules_config = modulesConfig;
      }
      if (opts.includeDeliveryVideoUrls) {
        payload.delivery_video_urls = deliveryVideoGallery;
      }
      if (opts.includeSalesVideoUrls) {
        payload.sales_video_urls = salesVideoGallery;
      }
      if (editingProductId) {
        return supabase.from("products").update(payload).eq("id", editingProductId);
      }
      return supabase.from("products").insert(payload).select("id").single();
    };

    const persistWithSchemaFallback = async (
      imageUrl: string | null,
      videoUrl: string | null,
      deliveryImageUrl: string | null,
      galleryUrls: string[],
      salesImageUrl: string | null,
      salesGallery: string[],
      salesVideoUrl: string | null,
      deliveryVideoGallery: string[],
      salesVideoGallery: string[]
    ) => {
      const flags = {
        includeCaktoSalesId: true,
        includeHotmartSalesId: true,
        includeDescriptionDelivery: true,
        includeVideoUrl: true,
        includeVideoSalesUrl: true,
        includeAccessLinks: true,
        includeImageDeliveryUrl: true,
        includeDeliveryGalleryUrls: true,
        includeImageSalesUrl: true,
        includeSalesGalleryUrls: true,
        includeIsHidden: true,
        includePrice: true,
        includeFaqConfig: true,
        includeProductTestimonialsConfig: true,
        includeModulesConfig: true,
        includeDeliveryVideoUrls: true,
        includeSalesVideoUrls: true,
      };
      let dbError: unknown = null;
      let insertedId: string | null = editingProductId;

      for (let attempt = 0; attempt < 16; attempt++) {
        const result = await saveProductRow(
          imageUrl,
          videoUrl,
          deliveryImageUrl,
          galleryUrls,
          salesImageUrl,
          salesGallery,
          salesVideoUrl,
          deliveryVideoGallery,
          salesVideoGallery,
          flags
        );
        dbError = result.error;
        if (!dbError) {
          if (!editingProductId && result.data && "id" in result.data) {
            insertedId = String((result.data as { id: string }).id);
          }
          break;
        }
        if (isMissingVideoSalesUrlColumnError(dbError) && flags.includeVideoSalesUrl) {
          flags.includeVideoSalesUrl = false;
          continue;
        }
        if (isMissingVideoUrlColumnError(dbError) && flags.includeVideoUrl) {
          flags.includeVideoUrl = false;
          continue;
        }
        if (isMissingAccessLinksColumnError(dbError) && flags.includeAccessLinks) {
          flags.includeAccessLinks = false;
          continue;
        }
        if (isMissingDescriptionDeliveryColumnError(dbError) && flags.includeDescriptionDelivery) {
          flags.includeDescriptionDelivery = false;
          continue;
        }
        if (isMissingHotmartSalesIdColumnError(dbError) && flags.includeHotmartSalesId) {
          flags.includeHotmartSalesId = false;
          continue;
        }
        if (isMissingCaktoSalesIdColumnError(dbError) && flags.includeCaktoSalesId) {
          flags.includeCaktoSalesId = false;
          continue;
        }
        if (isMissingImageDeliveryUrlColumnError(dbError) && flags.includeImageDeliveryUrl) {
          flags.includeImageDeliveryUrl = false;
          continue;
        }
        if (isMissingDeliveryGalleryUrlsColumnError(dbError) && flags.includeDeliveryGalleryUrls) {
          flags.includeDeliveryGalleryUrls = false;
          continue;
        }
        if (isMissingImageSalesUrlColumnError(dbError) && flags.includeImageSalesUrl) {
          flags.includeImageSalesUrl = false;
          continue;
        }
        if (isMissingSalesGalleryUrlsColumnError(dbError) && flags.includeSalesGalleryUrls) {
          flags.includeSalesGalleryUrls = false;
          continue;
        }
        if (isMissingIsHiddenColumnError(dbError) && flags.includeIsHidden) {
          flags.includeIsHidden = false;
          continue;
        }
        if (isMissingPriceColumnError(dbError) && flags.includePrice) {
          flags.includePrice = false;
          continue;
        }
        if (isMissingFaqConfigColumnError(getErrorMessage(dbError)) && flags.includeFaqConfig) {
          flags.includeFaqConfig = false;
          continue;
        }
        if (
          isMissingProductTestimonialsConfigColumnError(getErrorMessage(dbError)) &&
          flags.includeProductTestimonialsConfig
        ) {
          flags.includeProductTestimonialsConfig = false;
          continue;
        }
        if (isMissingModulesConfigColumnError(getErrorMessage(dbError)) && flags.includeModulesConfig) {
          flags.includeModulesConfig = false;
          continue;
        }
        if (isMissingDeliveryVideoUrlsColumnError(dbError) && flags.includeDeliveryVideoUrls) {
          flags.includeDeliveryVideoUrls = false;
          continue;
        }
        if (isMissingSalesVideoUrlsColumnError(dbError) && flags.includeSalesVideoUrls) {
          flags.includeSalesVideoUrls = false;
          continue;
        }
        break;
      }

      return { dbError, insertedId, flags };
    };

    try {
      let imageUrl = existingImageUrl;
      let deliveryImageUrl = existingDeliveryImageUrl;
      let salesImageUrl = existingSalesImageUrl;
      let pendingDeliveryVideoFiles: File[] = [];
      let pendingSalesVideoFiles: File[] = [];

      if (imageFile) {
        imageUrl = await uploadFileToStorage(imageFile, IMAGE_BUCKET, "images");
      }

      if (deliveryImageFile) {
        deliveryImageUrl = await uploadFileToStorage(deliveryImageFile, IMAGE_BUCKET, "images");
      }

      if (salesImageFile) {
        salesImageUrl = await uploadFileToStorage(salesImageFile, IMAGE_BUCKET, "images");
      }

      const uploadedGalleryUrls: string[] = [];
      for (const file of deliveryGalleryPendingFiles) {
        uploadedGalleryUrls.push(await uploadFileToStorage(file, IMAGE_BUCKET, "images"));
      }
      const galleryUrls = [...deliveryGalleryUrls, ...uploadedGalleryUrls];

      const uploadedSalesGalleryUrls: string[] = [];
      for (const file of salesGalleryPendingFiles) {
        uploadedSalesGalleryUrls.push(await uploadFileToStorage(file, IMAGE_BUCKET, "images"));
      }
      const salesGallery = [...salesGalleryUrls, ...uploadedSalesGalleryUrls];

      let deliveryVideoGallery = [...deliveryVideoUrls];
      let salesVideoGallery = [...salesVideoUrls];

      if (editingProductId) {
        for (const file of deliveryVideoPendingFiles) {
          deliveryVideoGallery.push(
            await uploadFileToStorage(file, VIDEO_BUCKET, "videos", editingProductId)
          );
        }
        for (const file of salesVideoPendingFiles) {
          salesVideoGallery.push(
            await uploadFileToStorage(file, VIDEO_BUCKET, "videos", editingProductId)
          );
        }
      } else {
        pendingDeliveryVideoFiles = deliveryVideoPendingFiles;
        pendingSalesVideoFiles = salesVideoPendingFiles;
      }

      const videoUrl = deliveryVideoGallery[0] ?? null;
      const salesVideoUrl = salesVideoGallery[0] ?? null;

      const { dbError, insertedId, flags } = await persistWithSchemaFallback(
        imageUrl,
        videoUrl,
        deliveryImageUrl,
        galleryUrls,
        salesImageUrl,
        salesGallery,
        salesVideoUrl,
        deliveryVideoGallery,
        salesVideoGallery
      );

      if (!dbError && insertedId) {
        await syncProductCategoryAssignment(insertedId);
      }

      if (!dbError && pendingDeliveryVideoFiles.length > 0 && insertedId) {
        for (const file of pendingDeliveryVideoFiles) {
          deliveryVideoGallery.push(await uploadFileToStorage(file, VIDEO_BUCKET, "videos", insertedId));
        }
        const { error: videoUpdateError } = await supabase
          .from("products")
          .update({ delivery_video_urls: deliveryVideoGallery, video_url: deliveryVideoGallery[0] ?? null })
          .eq("id", insertedId);
        if (videoUpdateError && isMissingVideoUrlColumnError(videoUpdateError)) {
          toast.success(
            "Produto salvo, mas o vídeo não foi guardado — execute a migração SQL que adiciona a coluna video_url em products."
          );
          await fetchProducts();
          closeModal();
          return;
        }
        if (videoUpdateError) {
          throw videoUpdateError;
        }
      }

      if (!dbError && pendingSalesVideoFiles.length > 0 && insertedId) {
        for (const file of pendingSalesVideoFiles) {
          salesVideoGallery.push(await uploadFileToStorage(file, VIDEO_BUCKET, "videos", insertedId));
        }
        const { error: salesVideoUpdateError } = await supabase
          .from("products")
          .update({ sales_video_urls: salesVideoGallery, video_sales_url: salesVideoGallery[0] ?? null })
          .eq("id", insertedId);
        if (salesVideoUpdateError && isMissingVideoSalesUrlColumnError(salesVideoUpdateError)) {
          toast.success(
            "Produto salvo, mas o vídeo de vendas não foi guardado — execute a migração SQL que adiciona a coluna video_sales_url em products."
          );
          await fetchProducts();
          closeModal();
          return;
        }
        if (salesVideoUpdateError) {
          throw salesVideoUpdateError;
        }
      }

      if (
        !dbError &&
        (!flags.includeDescriptionDelivery ||
          !flags.includeCaktoSalesId ||
          !flags.includeHotmartSalesId ||
          !flags.includeVideoUrl ||
          !flags.includeVideoSalesUrl ||
          !flags.includeAccessLinks ||
          !flags.includeImageDeliveryUrl ||
          !flags.includeDeliveryGalleryUrls ||
          !flags.includeImageSalesUrl ||
          !flags.includeSalesGalleryUrls ||
          !flags.includeIsHidden ||
          !flags.includePrice ||
          !flags.includeFaqConfig ||
          !flags.includeProductTestimonialsConfig ||
          !flags.includeModulesConfig ||
          !flags.includeDeliveryVideoUrls ||
          !flags.includeSalesVideoUrls)
      ) {
        await fetchProducts();
        if (wasNewProductBasicCreate && insertedId) {
          continueToFullStep(insertedId, imageUrl);
          toast.success("Produto criado! Agora personalize o restante (descrições, imagens, vídeo, links...).");
          return;
        }
        closeModal();
        const parts: string[] = [];
        if (!flags.includeVideoUrl) {
          parts.push("vídeo do produto (migração video_url)");
        }
        if (!flags.includeVideoSalesUrl) {
          parts.push("vídeo de vendas (migração video_sales_url)");
        }
        if (!flags.includeDeliveryVideoUrls) {
          parts.push("galeria de vídeos de entrega (migração delivery_video_urls)");
        }
        if (!flags.includeSalesVideoUrls) {
          parts.push("galeria de vídeos de venda (migração sales_video_urls)");
        }
        if (!flags.includeAccessLinks) {
          parts.push("links de acesso (migração access_links)");
        }
        if (!flags.includeDescriptionDelivery) {
          parts.push("descrição de entrega (migração description_delivery)");
        }
        if (!flags.includeHotmartSalesId) {
          parts.push("ID Hotmart (migração hotmart_sales_id)");
        }
        if (!flags.includeCaktoSalesId) {
          parts.push("ID Cakto (migração cakto_sales_id)");
        }
        if (!flags.includeImageDeliveryUrl) {
          parts.push("imagem de entrega (migração image_delivery_url)");
        }
        if (!flags.includeDeliveryGalleryUrls) {
          parts.push("galeria de modelos (migração delivery_gallery_urls)");
        }
        if (!flags.includeImageSalesUrl) {
          parts.push("imagem de venda (migração image_sales_url)");
        }
        if (!flags.includeSalesGalleryUrls) {
          parts.push("galeria de venda (migração sales_gallery_urls)");
        }
        if (!flags.includeIsHidden) {
          parts.push("visibilidade no catálogo (migração is_hidden)");
        }
        if (!flags.includePrice) {
          parts.push("preço (migração product_price)");
        }
        if (!flags.includeFaqConfig) {
          parts.push("FAQ (migração faq_config)");
        }
        if (!flags.includeProductTestimonialsConfig) {
          parts.push("depoimentos do produto (migração product_testimonials_config)");
        }
        if (!flags.includeModulesConfig) {
          parts.push("módulos/aulas (migração modules_config)");
        }
        toast.success(`Produto salvo. Ainda não foi possível guardar: ${parts.join("; ")}.`);
        return;
      }

      if (dbError) {
        throw dbError;
      }

      await fetchProducts();
      if (wasNewProductBasicCreate && insertedId) {
        continueToFullStep(insertedId, imageUrl);
        toast.success("Produto criado! Agora personalize o restante (descrições, imagens, vídeo, links...).");
        return;
      }
      closeModal();
      toast.success("Produto salvo com sucesso.");
    } catch (error) {
      console.log("Erro detalhado:", error);
      console.error("Erro ao salvar produto no Supabase:", error);
      const message = getErrorMessage(error);

      if (message.toLowerCase().includes("auth session missing")) {
        try {
          const fallbackVideoUrl = deliveryVideoUrls[0] ?? null;
          const fallbackSalesVideoUrl = salesVideoUrls[0] ?? null;
          const { dbError: fallbackError, flags } = await persistWithSchemaFallback(
            existingImageUrl,
            fallbackVideoUrl,
            existingDeliveryImageUrl,
            deliveryGalleryUrls,
            existingSalesImageUrl,
            salesGalleryUrls,
            fallbackSalesVideoUrl,
            deliveryVideoUrls,
            salesVideoUrls
          );
          if (!fallbackError) {
            await fetchProducts();
            closeModal();
            const parts: string[] = [];
            if (!flags.includeVideoUrl) parts.push("vídeo do produto");
            if (!flags.includeVideoSalesUrl) parts.push("vídeo de vendas");
            if (!flags.includeDeliveryVideoUrls) parts.push("galeria de vídeos de entrega");
            if (!flags.includeSalesVideoUrls) parts.push("galeria de vídeos de venda");
            if (!flags.includeAccessLinks) parts.push("links de acesso");
            if (!flags.includeDescriptionDelivery) parts.push("descrição de entrega");
            if (!flags.includeHotmartSalesId) parts.push("ID Hotmart");
            if (!flags.includeCaktoSalesId) parts.push("ID Cakto");
            if (!flags.includeImageDeliveryUrl) parts.push("imagem de entrega");
            if (!flags.includeDeliveryGalleryUrls) parts.push("galeria de modelos");
            if (!flags.includeImageSalesUrl) parts.push("imagem de venda");
            if (!flags.includeSalesGalleryUrls) parts.push("galeria de venda");
            if (!flags.includeIsHidden) parts.push("visibilidade no catálogo");
            if (!flags.includePrice) parts.push("preço");
            if (!flags.includeFaqConfig) parts.push("FAQ");
            if (!flags.includeProductTestimonialsConfig) parts.push("depoimentos do produto");
            if (!flags.includeModulesConfig) parts.push("módulos/aulas");
            toast.success(
              `Produto salvo (sem upload de arquivo).${parts.length ? ` Não guardado: ${parts.join("; ")}.` : ""}`
            );
            return;
          }
          if (fallbackError) {
            throw fallbackError;
          }

          await fetchProducts();
          closeModal();
          toast.success("Produto salvo (sem envio de arquivos — faça login no Supabase para testar upload).");
        } catch (fallbackError) {
          console.log("Erro detalhado:", fallbackError);
          console.error("Falha no fallback de salvamento:", fallbackError);
          const fbMsg = getErrorMessage(fallbackError);
          const extra = looksLikeStorageError(fallbackError)
            ? " Se o problema for upload, confira Storage no Supabase."
            : "";
          const rlsHint = isProductsRlsError(fallbackError) ? productsRlsHint() : "";
          toast.error(`Não foi possível salvar: ${fbMsg.slice(0, 220)}${extra}${rlsHint}`);
        }
      } else {
        const short = message.length > 220 ? `${message.slice(0, 220)}…` : message;
        const storageHint = looksLikeStorageError(error)
          ? " Confira o bucket no Supabase Storage (nome no .env) e as políticas de upload."
          : "";
        const rlsHint = isProductsRlsError(error) ? productsRlsHint() : "";
        toast.error(`Não foi possível salvar: ${short}${storageHint}${rlsHint}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProductHidden = async (product: Product) => {
    const nextHidden = !(product.is_hidden === true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_hidden: nextHidden })
        .eq("id", product.id);
      if (error && isMissingIsHiddenColumnError(error)) {
        toast.error(
          "Coluna is_hidden ausente. Execute a migração 20260707200000_product_hidden_dashboard_sections.sql no Supabase."
        );
        return;
      }
      if (error) throw error;
      await fetchProducts(true);
      toast.success(
        nextHidden
          ? "Produto oculto no catálogo (antes da compra)."
          : "Produto visível no catálogo."
      );
    } catch (error) {
      console.error("Erro ao alterar visibilidade:", error);
      toast.error("Não foi possível alterar a visibilidade do produto.");
    }
  };

  /** Move o produto salvo para a categoria escolhida no formulário (best-effort: não bloqueia o salvamento do produto). */
  const syncProductCategoryAssignment = async (productId: string) => {
    const currentCategoryId = findCategoryIdForProduct(productCategoriesConfig, productId);
    if (currentCategoryId === selectedCategoryId) return;

    const nextCategories = assignProductToCategory(productCategoriesConfig, productId, selectedCategoryId);
    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      product_categories_config: nextCategories,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Erro ao atualizar categoria do produto:", error);
      if (!isProductCategoriesConfigSchemaError(error.message)) {
        toast.error("Produto salvo, mas não foi possível atualizar a categoria/atalho.");
      }
      return;
    }
    setProductCategoriesConfig(nextCategories);
  };

  /** Cria e já salva uma categoria nova, sem sair da edição de seções do dashboard. */
  const handleQuickCreateCategory = async (name: string): Promise<string> => {
    const category = { ...createProductCategory(null), name: name.trim() || "Nova categoria" };
    const next = [...productCategoriesConfig, category];

    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      product_categories_config: next,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Não foi possível criar a categoria.");
      throw error;
    }

    setProductCategoriesConfig(next);
    await refreshSiteSettings();
    toast.success("Categoria criada.");
    return category.id;
  };

  const handleSaveProductCategories = async () => {
    setCategoriesSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        product_categories_config: productCategoriesConfig,
        updated_at: new Date().toISOString(),
      });
      if (error && isProductCategoriesConfigSchemaError(error.message)) {
        toast.error(
          "Coluna product_categories_config ausente. Execute a migração 20260804120000_product_categories_config.sql no Supabase."
        );
        return;
      }
      if (error) throw error;
      await refreshSiteSettings();
      toast.success("Atalhos salvos.");
    } catch (error) {
      console.error("Erro ao salvar atalhos de produtos:", error);
      toast.error("Não foi possível salvar os atalhos.");
    } finally {
      setCategoriesSaving(false);
    }
  };

  const handleSaveTestimonials = async () => {
    setTestimonialsSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        testimonials_config: testimonialsConfig,
        testimonials_banner_url: testimonialsBannerUrl,
        updated_at: new Date().toISOString(),
      });
      if (
        error &&
        (isTestimonialsConfigSchemaError(error.message) ||
          isTestimonialsBannerUrlSchemaError(error.message))
      ) {
        toast.error(
          "Colunas de depoimentos ausentes. Execute a migração 20260804130000_testimonials.sql no Supabase."
        );
        return;
      }
      if (error) throw error;
      await refreshSiteSettings();
      toast.success("Depoimentos salvos.");
    } catch (error) {
      console.error("Erro ao salvar depoimentos:", error);
      toast.error("Não foi possível salvar os depoimentos.");
    } finally {
      setTestimonialsSaving(false);
    }
  };

  const handleSavePageBackgrounds = async () => {
    setPageBackgroundsSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        page_background_dashboard_url: pageBgDashboardUrl,
        page_background_profile_url: pageBgProfileUrl,
        page_background_community_url: pageBgCommunityUrl,
        page_background_planejamento_url: pageBgPlanejamentoUrl,
        updated_at: new Date().toISOString(),
      });
      if (error && isPageBackgroundsPerPageError(error.message)) {
        toast.error(
          "Colunas de fundo por página ausentes. Execute a migração 20260804150000_page_backgrounds_per_page.sql no Supabase."
        );
        return;
      }
      if (error) throw error;
      await refreshSiteSettings();
      toast.success("Fundos das páginas salvos.");
    } catch (error) {
      console.error("Erro ao salvar fundos das páginas:", error);
      toast.error("Não foi possível salvar os fundos das páginas.");
    } finally {
      setPageBackgroundsSaving(false);
    }
  };

  const handleSaveSectionsConfig = async () => {
    setSectionOrderSaving(true);
    try {
      const dashboard_section_order = dashboardSectionsConfigToOrder(dashboardSectionsConfig);
      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        dashboard_sections_config: dashboardSectionsConfig,
        dashboard_section_order,
        updated_at: new Date().toISOString(),
      });
      if (error && isDashboardSectionsConfigSchemaError(error.message)) {
        toast.error(
          "Coluna dashboard_sections_config ausente. Execute a migração 20260709120000_dashboard_sections_config.sql no Supabase."
        );
        return;
      }
      if (error) throw error;
      await refreshSiteSettings();
      toast.success("Seções do dashboard salvas.");
    } catch (error) {
      console.error("Erro ao salvar seções do dashboard:", error);
      toast.error("Não foi possível salvar as seções do dashboard.");
    } finally {
      setSectionOrderSaving(false);
    }
  };

  const handleSaveSiteBranding = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSiteSaving(true);
    try {
      let logoUrl = siteLogoUrl;
      let faviconUrl = siteFaviconUrl;
      let loginBgUrl = siteLoginBgUrl?.trim() || null;
      let appBgUrl = siteAppBgUrl?.trim() || null;
      if (logoFile) {
        logoUrl = await uploadFileToStorage(logoFile, IMAGE_BUCKET, "images", "site");
      }
      if (faviconFile) {
        faviconUrl = await uploadFileToStorage(faviconFile, IMAGE_BUCKET, "images", "site");
      }
      if (bgLoginFile) {
        loginBgUrl = await uploadFileToStorage(bgLoginFile, IMAGE_BUCKET, "images", "site");
      }
      if (bgAppFile) {
        appBgUrl = await uploadFileToStorage(bgAppFile, IMAGE_BUCKET, "images", "site");
      }

      const uploadedHeroUrls: string[] = [];
      for (const file of heroPendingFiles) {
        uploadedHeroUrls.push(await uploadFileToStorage(file, IMAGE_BUCKET, "images", "site"));
      }
      const uploadedHeroDesktopUrls: string[] = [];
      for (const file of heroDesktopPendingFiles) {
        uploadedHeroDesktopUrls.push(
          await uploadFileToStorage(file, IMAGE_BUCKET, "images", "site")
        );
      }
      const bannerUrls = [...siteHeroUrls, ...uploadedHeroUrls];
      const bannerDesktopUrls = [...siteHeroDesktopUrls, ...uploadedHeroDesktopUrls];

      const legacyBgMirror = appBgUrl ?? loginBgUrl ?? null;

      const colorsPayload = {
        color_primary: normalizeHexColor(siteColors.primary) ?? DEFAULT_SITE_COLORS.primary,
        color_banner: normalizeHexColor(siteColors.banner) ?? DEFAULT_SITE_COLORS.banner,
        color_banner_light:
          normalizeHexColor(siteColors.bannerLight) ?? DEFAULT_SITE_COLORS.bannerLight,
        color_page_bg: normalizeHexColor(siteColors.pageBg) ?? DEFAULT_SITE_COLORS.pageBg,
      };

      const baseRow = {
        id: 1 as const,
        hero_headline: null as string | null,
        logo_url: logoUrl ?? null,
        favicon_url: faviconUrl ?? null,
        whatsapp_url: siteWhatsappUrl.trim() || null,
        page_background_image_url: legacyBgMirror,
        page_background_login_url: loginBgUrl,
        page_background_app_url: appBgUrl,
        page_background_opacity_percent: Math.min(
          100,
          Math.max(0, Math.round(siteBgOpacityPercent))
        ),
        hero_image_url: bannerUrls[0] ?? null,
        updated_at: new Date().toISOString(),
        ...colorsPayload,
      };

      let heroBannerUrlsDropped = false;
      let heroBannerDesktopUrlsDropped = false;

      const upsertSiteSettings = async (row: Record<string, unknown>) => {
        const withHero = {
          ...row,
          hero_banner_urls: bannerUrls,
          hero_banner_desktop_urls: bannerDesktopUrls,
        };
        let { error: upsertError } = await supabase.from("site_settings").upsert(withHero);
        if (upsertError && isHeroBannerDesktopUrlsSchemaError(upsertError.message)) {
          heroBannerDesktopUrlsDropped = bannerDesktopUrls.length > 0;
          const { hero_banner_desktop_urls: _d, ...withoutDesktop } = withHero;
          const retry = await supabase.from("site_settings").upsert(withoutDesktop);
          upsertError = retry.error;
        }
        if (upsertError && isHeroBannerUrlsSchemaError(upsertError.message)) {
          heroBannerUrlsDropped = bannerUrls.length > 1;
          const retry = await supabase.from("site_settings").upsert(row);
          upsertError = retry.error;
        }
        return upsertError;
      };

      let siteColorsDropped = false;
      let whatsappUrlDropped = false;
      let faviconUrlDropped = false;

      let error = await upsertSiteSettings(baseRow);
      if (error && isSiteColorsSchemaError(error.message)) {
        siteColorsDropped = true;
        const {
          color_primary: _cp,
          color_banner: _cb,
          color_banner_light: _cbl,
          color_page_bg: _cpb,
          ...withoutColors
        } = baseRow;
        error = await upsertSiteSettings(withoutColors);
      }
      if (error && isPageBackgroundOpacityError(error.message)) {
        const { page_background_opacity_percent, ...withoutOpacity } = baseRow;
        error = await upsertSiteSettings(withoutOpacity);
      }
      if (error && isPageBackgroundSplitError(error.message)) {
        const { page_background_login_url, page_background_app_url, ...rest } = baseRow;
        const legacyOnly = { ...rest, page_background_image_url: legacyBgMirror };
        error = await upsertSiteSettings(legacyOnly);
        if (error && isPageBackgroundOpacityError(error.message)) {
          const { page_background_opacity_percent, ...legacyNoOpacity } = legacyOnly;
          error = await upsertSiteSettings(legacyNoOpacity);
        }
      }
      if (error && isWhatsappUrlSchemaError(error.message)) {
        whatsappUrlDropped = true;
        const { whatsapp_url: _wa, ...withoutWhatsapp } = baseRow;
        error = await upsertSiteSettings(withoutWhatsapp);
      }
      if (error && isFaviconUrlSchemaError(error.message)) {
        faviconUrlDropped = true;
        const { favicon_url: _fv, ...withoutFavicon } = baseRow;
        error = await upsertSiteSettings(withoutFavicon);
      }
      if (error) throw error;
      setSiteLogoUrl(logoUrl ?? null);
      setSiteFaviconUrl(faviconUrl ?? null);
      setSiteLoginBgUrl(loginBgUrl);
      setSiteAppBgUrl(appBgUrl);
      setSiteHeroUrls(bannerUrls);
      setSiteHeroDesktopUrls(bannerDesktopUrls);
      setHeroPendingFiles([]);
      setHeroDesktopPendingFiles([]);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
      if (heroDesktopFileInputRef.current) heroDesktopFileInputRef.current.value = "";
      setLogoFile(null);
      setFaviconFile(null);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
      setBgLoginFile(null);
      setBgAppFile(null);
      if (bgLoginFileInputRef.current) bgLoginFileInputRef.current.value = "";
      if (bgAppFileInputRef.current) bgAppFileInputRef.current.value = "";
      await refreshSiteSettings();
      if (heroBannerUrlsDropped) {
        toast.warning(
          "Salvo só o primeiro banner. Execute as migrações hero_banner_urls no Supabase para o carrossel com várias imagens."
        );
      } else if (heroBannerDesktopUrlsDropped) {
        toast.warning(
          "Banners de desktop não foram gravados. Execute a migração hero_banner_desktop_urls no Supabase."
        );
      } else if (siteColorsDropped) {
        toast.warning(
          "Imagens salvas, mas as cores não foram gravadas. Execute a migração site_colors no Supabase."
        );
      } else if (whatsappUrlDropped) {
        toast.warning(
          "Salvo, mas o link do WhatsApp não foi gravado. Execute a migração site_settings_whatsapp no Supabase."
        );
      } else if (faviconUrlDropped) {
        toast.warning(
          "Salvo, mas o ícone não foi gravado. Execute a migração site_favicon no Supabase."
        );
      } else {
        toast.success("Aparência atualizada.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar a aparência (execute a migração site_settings no Supabase se necessário).");
    } finally {
      setSiteSaving(false);
    }
  };

  const clearSiteLogo = () => {
    setSiteLogoUrl(null);
    setLogoFile(null);
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  };

  const clearSiteFavicon = () => {
    setSiteFaviconUrl(null);
    setFaviconFile(null);
    if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
  };

  const clearSiteLoginBackground = () => {
    setSiteLoginBgUrl(null);
    setBgLoginFile(null);
    if (bgLoginFileInputRef.current) bgLoginFileInputRef.current.value = "";
  };

  const clearSiteAppBackground = () => {
    setSiteAppBgUrl(null);
    setBgAppFile(null);
    if (bgAppFileInputRef.current) bgAppFileInputRef.current.value = "";
  };

  const removeHeroUrlAt = (index: number) => {
    setSiteHeroUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeHeroPendingAt = (index: number) => {
    setHeroPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeHeroDesktopUrlAt = (index: number) => {
    setSiteHeroDesktopUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeHeroDesktopPendingAt = (index: number) => {
    setHeroDesktopPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllHeroBanners = () => {
    setSiteHeroUrls([]);
    setSiteHeroDesktopUrls([]);
    setHeroPendingFiles([]);
    setHeroDesktopPendingFiles([]);
    if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    if (heroDesktopFileInputRef.current) heroDesktopFileInputRef.current.value = "";
  };

  const summarizeLegacyGrant = (payload: {
    granted: number;
    alreadyActive: number;
    createdUsers: number;
    errors: { message: string }[];
  }) => {
    const parts: string[] = [];
    if (payload.granted > 0) parts.push(`${payload.granted} liberada(s)`);
    if (payload.alreadyActive > 0) parts.push(`${payload.alreadyActive} já ativa(s)`);
    if (payload.createdUsers > 0) parts.push(`${payload.createdUsers} conta(s) criada(s)`);
    if (payload.errors.length > 0) parts.push(`${payload.errors.length} erro(s)`);
    return parts.length > 0 ? parts.join(" · ") : "Nenhuma alteração";
  };

  const handleGrantSingleLegacy = async () => {
    const email = legacyEmail.trim();
    if (!email || !legacyProductId) {
      toast.error("Informe o e-mail da compra e o produto.");
      return;
    }
    setLegacyGranting(true);
    try {
      const result = await grantSingleLegacyPurchase(email, [legacyProductId], "admin");
      toast.success(summarizeLegacyGrant(result));
      if (result.errors.length > 0) {
        console.warn("legacy grant errors", result.errors);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao liberar acesso.");
    } finally {
      setLegacyGranting(false);
    }
  };

  const handleGrantBulkLegacy = async () => {
    const { lines, errors: parseErrors } = parseLegacyPurchaseLines(legacyBulkText);
    if (parseErrors.length > 0) {
      toast.error(parseErrors.slice(0, 3).join(" — "));
      return;
    }
    if (lines.length === 0) {
      toast.error("Cole ao menos uma linha no formato email,product_id");
      return;
    }
    setLegacyGranting(true);
    try {
      const result = await grantLegacyPurchases(lines, "legacy");
      toast.success(summarizeLegacyGrant(result));
      if (result.errors.length > 0) {
        toast.message(
          result.errors
            .slice(0, 2)
            .map((e) => `${e.email}: ${e.message}`)
            .join(" · ")
        );
      } else {
        setLegacyBulkText("");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro na importação.");
    } finally {
      setLegacyGranting(false);
    }
  };

  const handleSaveKitBonuses = async () => {
    if (!kitProductId) {
      toast.error("Selecione o produto kit.");
      return;
    }
    setKitSaving(true);
    try {
      const { error: delErr } = await supabase
        .from("kit_bonus_products")
        .delete()
        .eq("kit_product_id", kitProductId);
      if (delErr) throw delErr;
      const selected = Object.entries(kitBonusIds)
        .filter(([, v]) => v)
        .map(([id]) => id);
      if (selected.length > 0) {
        const rows = selected.map((bonusId) => ({
          kit_product_id: kitProductId,
          bonus_product_id: bonusId,
        }));
        const { error: insErr } = await supabase.from("kit_bonus_products").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Bônus do kit salvos.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar vínculos de bônus.");
    } finally {
      setKitSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#ebe8df] px-3 py-5 pb-14 md:px-5 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
        <header className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#6B705C]/15 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ee] md:h-12 md:w-12">
              <BrandLogo className="max-h-10 max-w-10 object-contain md:max-h-11 md:max-w-11" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Administração</p>
              <h1 className="truncate font-serif text-xl text-[#6B705C] md:text-2xl">Bridal Creative</h1>
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#6B705C]/40 px-4 text-xs font-medium text-[#6B705C] transition-colors hover:bg-[#6B705C]/8 sm:w-auto"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: "#6B705C" }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Novo produto
            </button>
          </div>
        </header>

        <AdminOverview
          productsCount={products.length}
          categoriesCount={productCategoriesConfig.length}
          testimonialsCount={testimonialsConfig.length}
        />

        <AdminSection
          id="appearance"
          icon={Palette}
          title="Aparência do app"
          description="Logo, cores do site, WhatsApp de suporte, texturas de fundo (login e áreas internas), opacidade do padrão e banners do topo (celular e desktop). No carrossel pode usar várias imagens por dispositivo. Remova os arquivos e salve para voltar ao padrão."
        >
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <form onSubmit={handleSaveSiteBranding} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Logo</label>
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
                  {siteLogoUrl && (
                    <p className="truncate text-[10px] text-zinc-400" title={siteLogoUrl}>
                      Atual: {siteLogoUrl.slice(0, 48)}…
                    </p>
                  )}
                  {(siteLogoUrl || logoFile) && (
                    <button
                      type="button"
                      onClick={clearSiteLogo}
                      disabled={siteSaving}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remover logo
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Ícone do app (favicon)</label>
                  <input
                    ref={faviconFileInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                    onChange={(e) => setFaviconFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
                  <p className="text-[11px] text-zinc-500">
                    Aparece na aba do navegador e como ícone ao adicionar o app à tela inicial. Use uma
                    imagem quadrada (ex: 512×512px).
                  </p>
                  {siteFaviconUrl && (
                    <p className="truncate text-[10px] text-zinc-400" title={siteFaviconUrl}>
                      Atual: {siteFaviconUrl.slice(0, 48)}…
                    </p>
                  )}
                  {(siteFaviconUrl || faviconFile) && (
                    <button
                      type="button"
                      onClick={clearSiteFavicon}
                      disabled={siteSaving}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remover ícone
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Fundo — página de login</label>
                  <input
                    ref={bgLoginFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBgLoginFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
                  {siteLoginBgUrl && (
                    <p className="truncate text-[10px] text-zinc-400" title={siteLoginBgUrl}>
                      Atual: {siteLoginBgUrl.slice(0, 48)}…
                    </p>
                  )}
                  {(siteLoginBgUrl || bgLoginFile) && (
                    <button
                      type="button"
                      onClick={clearSiteLoginBackground}
                      disabled={siteSaving}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remover
                    </button>
                  )}
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-sm text-zinc-700">
                    Fundo — app (dashboard, chat, produto e notificações)
                  </label>
                  <input
                    ref={bgAppFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBgAppFile(e.target.files?.[0] ?? null)}
                    className="w-full max-w-xl text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
                  {siteAppBgUrl && (
                    <p className="truncate text-[10px] text-zinc-400" title={siteAppBgUrl}>
                      Atual: {siteAppBgUrl.slice(0, 48)}…
                    </p>
                  )}
                  {(siteAppBgUrl || bgAppFile) && (
                    <button
                      type="button"
                      onClick={clearSiteAppBackground}
                      disabled={siteSaving}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remover
                    </button>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <label htmlFor="site-bg-opacity" className="text-sm text-zinc-700">
                    Opacidade do fundo ({siteBgOpacityPercent}%)
                  </label>
                  <p className="text-xs text-zinc-500">
                    Controla o quanto a textura aparece nas páginas. Valores maiores deixam o padrão mais
                    visível (padrão {DEFAULT_PAGE_BACKGROUND_OPACITY_PERCENT}%).
                  </p>
                  <input
                    id="site-bg-opacity"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={siteBgOpacityPercent}
                    onChange={(e) => setSiteBgOpacityPercent(Number(e.target.value))}
                    disabled={siteSaving}
                    className="h-2 w-full max-w-md cursor-pointer accent-[#6B705C]"
                  />
                  <div className="flex max-w-md items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={siteBgOpacityPercent}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) {
                          setSiteBgOpacityPercent(Math.min(100, Math.max(0, Math.round(v))));
                        }
                      }}
                      disabled={siteSaving}
                      className="h-9 w-20 rounded-md border border-zinc-200 px-2 text-sm"
                      aria-label="Opacidade do fundo em porcentagem"
                    />
                    <span className="text-sm text-zinc-600">%</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-4 md:p-5">
                <label className="text-sm font-medium text-zinc-800">WhatsApp (suporte)</label>
                <p className="text-xs text-zinc-500">
                  Usado no botão flutuante e no CTA &quot;Quer algo mais personalizado?&quot; do dashboard. Informe o
                  link completo (<code className="rounded bg-zinc-100 px-1">https://wa.me/5511…</code>) ou só o número
                  com DDI.
                </p>
                <input
                  type="text"
                  value={siteWhatsappUrl}
                  onChange={(e) => setSiteWhatsappUrl(e.target.value)}
                  placeholder="5511999998888 ou https://wa.me/5511999998888"
                  className="h-11 w-full max-w-xl rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                  disabled={siteSaving}
                  spellCheck={false}
                />
                {normalizeWhatsAppUrl(siteWhatsappUrl) ? (
                  <p className="text-[11px] text-[#5a6349]">
                    Link ativo:{" "}
                    <span className="break-all font-mono">{normalizeWhatsAppUrl(siteWhatsappUrl)}</span>
                  </p>
                ) : siteWhatsappUrl.trim() ? (
                  <p className="text-[11px] text-amber-800">Número ou link inválido — use DDI + DDD + número.</p>
                ) : null}
              </div>
              <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-zinc-800">Cores do site</label>
                  <button
                    type="button"
                    onClick={() => setSiteColors({ ...DEFAULT_SITE_COLORS })}
                    disabled={siteSaving}
                    className="text-xs text-[#6B705C] hover:underline disabled:opacity-50"
                  >
                    Restaurar padrão
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Unifique o verde do banner, dos cards e das páginas. Use o seletor ou digite o código hex
                  (ex.: #6B705C).
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: "primary" as const,
                        label: "Verde principal",
                        hint: "Botões, textos, bordas e barra inferior",
                      },
                      {
                        key: "banner" as const,
                        label: "Verde dos cards",
                        hint: "Moldura dos produtos no dashboard",
                      },
                      {
                        key: "bannerLight" as const,
                        label: "Verde claro dos cards",
                        hint: "Área da foto nos cards",
                      },
                      {
                        key: "pageBg" as const,
                        label: "Fundo das páginas",
                        hint: "Dashboard, chat, perfil e notificações",
                      },
                    ] as const
                  ).map(({ key, label, hint }) => (
                    <div key={key} className="space-y-1.5 rounded-lg border border-zinc-200/80 bg-white/90 p-3">
                      <label className="text-sm font-medium text-zinc-800">{label}</label>
                      <p className="text-[11px] text-zinc-500">{hint}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={siteColors[key]}
                          onChange={(e) =>
                            setSiteColors((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          disabled={siteSaving}
                          className="h-10 w-14 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
                          aria-label={`${label} — seletor`}
                        />
                        <input
                          type="text"
                          value={siteColors[key]}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSiteColors((prev) => ({ ...prev, [key]: v }));
                          }}
                          onBlur={(e) => {
                            const n = normalizeHexColor(e.target.value);
                            if (n) {
                              setSiteColors((prev) => ({ ...prev, [key]: n }));
                            }
                          }}
                          disabled={siteSaving}
                          className="h-10 min-w-0 flex-1 rounded-md border border-zinc-200 px-2 font-mono text-sm uppercase"
                          placeholder="#6B705C"
                          spellCheck={false}
                        />
                      </div>
                      <div
                        className="h-8 rounded-md border border-zinc-200/80"
                        style={{ backgroundColor: siteColors[key] }}
                        aria-hidden
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-medium text-zinc-800">Banners do topo (carrossel)</label>
                  {(siteHeroUrls.length > 0 ||
                    siteHeroDesktopUrls.length > 0 ||
                    heroPendingFiles.length > 0 ||
                    heroDesktopPendingFiles.length > 0) && (
                    <button
                      type="button"
                      onClick={clearAllHeroBanners}
                      disabled={siteSaving}
                      className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Limpar todos
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  No celular use imagens em retrato ou quadradas; no desktop, faixas largas (ex. 1920×480 px).
                  Se só enviar mobile, o mesmo carrossel aparece em todos os tamanhos de tela.
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 p-3">
                    <p className="text-sm font-medium text-zinc-800">Celular</p>
                    <input
                      ref={heroFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const next = Array.from(e.target.files ?? []);
                        if (next.length) setHeroPendingFiles((p) => [...p, ...next]);
                        e.target.value = "";
                      }}
                      className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                      disabled={siteSaving}
                    />
                    {siteHeroUrls.length > 0 && (
                      <ul className="space-y-1.5 text-xs">
                        {siteHeroUrls.map((url, i) => (
                          <li
                            key={`m-${url}-${i}`}
                            className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-zinc-600" title={url}>
                              {url.slice(0, 72)}
                              {url.length > 72 ? "…" : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeHeroUrlAt(i)}
                              disabled={siteSaving}
                              className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {heroPendingFiles.length > 0 && (
                      <ul className="space-y-1.5 text-xs">
                        <li className="text-zinc-500">A enviar ao salvar:</li>
                        {heroPendingFiles.map((file, i) => (
                          <li
                            key={`mp-${file.name}-${i}`}
                            className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50/80 px-2 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-zinc-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeHeroPendingAt(i)}
                              disabled={siteSaving}
                              className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 p-3">
                    <p className="text-sm font-medium text-zinc-800">Desktop (opcional)</p>
                    <p className="text-xs text-zinc-500">
                      Deixe vazio para reutilizar as imagens do celular no computador.
                    </p>
                    <input
                      ref={heroDesktopFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const next = Array.from(e.target.files ?? []);
                        if (next.length) setHeroDesktopPendingFiles((p) => [...p, ...next]);
                        e.target.value = "";
                      }}
                      className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                      disabled={siteSaving}
                    />
                    {siteHeroDesktopUrls.length > 0 && (
                      <ul className="space-y-1.5 text-xs">
                        {siteHeroDesktopUrls.map((url, i) => (
                          <li
                            key={`d-${url}-${i}`}
                            className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-zinc-600" title={url}>
                              {url.slice(0, 72)}
                              {url.length > 72 ? "…" : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeHeroDesktopUrlAt(i)}
                              disabled={siteSaving}
                              className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {heroDesktopPendingFiles.length > 0 && (
                      <ul className="space-y-1.5 text-xs">
                        <li className="text-zinc-500">A enviar ao salvar:</li>
                        {heroDesktopPendingFiles.map((file, i) => (
                          <li
                            key={`dp-${file.name}-${i}`}
                            className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50/80 px-2 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-zinc-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeHeroDesktopPendingAt(i)}
                              disabled={siteSaving}
                              className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={siteSaving}
                className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "#6B705C" }}
              >
                {siteSaving ? (
                  <>
                    <Spinner className="size-4 text-white" />
                    Salvando…
                  </>
                ) : (
                  "Salvar aparência"
                )}
              </button>
            </form>
          )}
        </AdminSection>

        <AdminSection
          id="dashboard-layout"
          icon={Rows3}
          title="Seções do dashboard"
          description="Monte a home do app: renomeie blocos, escolha produtos, reordene ou remova seções. O carrossel do topo permanece fixo."
        >
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <DashboardSectionsEditor
              sections={dashboardSectionsConfig}
              onChange={setDashboardSectionsConfig}
              products={sortedProducts.map((product) => ({
                id: product.id,
                name: product.name,
                type: product.type,
              }))}
              categories={productCategoriesConfig
                .filter((category) => !category.parent_id)
                .map((category) => ({ id: category.id, name: category.name }))}
              onCreateCategory={handleQuickCreateCategory}
              saving={sectionOrderSaving}
              onSave={() => void handleSaveSectionsConfig()}
            />
          )}
        </AdminSection>

        <AdminSection
          id="product-categories"
          icon={Compass}
          title="Atalhos da Início (Explore)"
          description="Ícones circulares logo abaixo de Meus produtos: nome, foto e quais produtos aparecem ao tocar."
        >
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <ProductCategoriesEditor
              categories={productCategoriesConfig}
              onChange={setProductCategoriesConfig}
              products={sortedProducts.map((product) => ({
                id: product.id,
                name: product.name,
                type: product.type,
              }))}
              saving={categoriesSaving}
              onSave={() => void handleSaveProductCategories()}
              onUploadPhoto={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images", "categories")}
            />
          )}
        </AdminSection>

        <AdminSection
          id="testimonials"
          icon={Quote}
          title="Depoimentos (O que as noivas dizem)"
          description="Foto de topo e depoimentos com foto, nota e texto, numa fileira arrastável abaixo do Explore."
        >
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <TestimonialsEditor
              testimonials={testimonialsConfig}
              onChange={setTestimonialsConfig}
              bannerUrl={testimonialsBannerUrl}
              onBannerChange={setTestimonialsBannerUrl}
              saving={testimonialsSaving}
              onSave={() => void handleSaveTestimonials()}
              onUploadPhoto={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images", "testimonials")}
            />
          )}
        </AdminSection>

        <AdminSection
          id="page-backgrounds"
          icon={Image}
          title="Fundo por página"
          description="Defina uma imagem de fundo própria para Início, Perfil, Chat e Planejamento — opcional, sem substituir o fundo padrão do app."
        >
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <PageBackgroundsEditor
              dashboardUrl={pageBgDashboardUrl}
              onDashboardChange={setPageBgDashboardUrl}
              profileUrl={pageBgProfileUrl}
              onProfileChange={setPageBgProfileUrl}
              communityUrl={pageBgCommunityUrl}
              onCommunityChange={setPageBgCommunityUrl}
              planejamentoUrl={pageBgPlanejamentoUrl}
              onPlanejamentoChange={setPageBgPlanejamentoUrl}
              saving={pageBackgroundsSaving}
              onSave={() => void handleSavePageBackgrounds()}
              onUploadPhoto={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images", "page-backgrounds")}
            />
          )}
        </AdminSection>

        <RegisteredUsersSection />

        <WeddingPlanningPremiumSection products={products} onSaved={() => fetchProducts()} />

        <AdminSection
          id="legacy-access"
          icon={UserCheck}
          title="Compradores antigos"
          description="Libera o acesso na plataforma nova para quem já tinha comprado antes. Use o mesmo e-mail informado na compra original. A cliente entra em /login com esse e-mail e vê o conteúdo liberado."
        >
          <div className="mb-6 space-y-3 rounded-xl border border-zinc-100 bg-[#fafaf8] p-4 md:p-5">
            <p className="text-sm font-medium text-zinc-800">Uma cliente</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-zinc-700">E-mail da compra</label>
                <input
                  type="email"
                  value={legacyEmail}
                  onChange={(e) => setLegacyEmail(e.target.value)}
                  placeholder="ex.: cliente@email.com"
                  className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                  disabled={legacyGranting}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm text-zinc-700">Produto</label>
                {sortedProducts.length === 0 ? (
                  <p className="text-sm text-amber-800">Cadastre produtos no catálogo antes de liberar acesso.</p>
                ) : (
                  <select
                    value={legacyProductId}
                    onChange={(e) => setLegacyProductId(e.target.value)}
                    className="h-11 w-full max-w-xl rounded-md border border-zinc-200 bg-white px-3 text-sm"
                    disabled={legacyGranting}
                  >
                    <option value="">Selecione o produto</option>
                    {sortedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.title || p.id}
                        {productStoreIdsLabel(p)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGrantSingleLegacy()}
              disabled={legacyGranting || !legacyEmail.trim() || !legacyProductId}
              className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#6B705C" }}
            >
              {legacyGranting ? (
                <>
                  <Spinner className="size-4 text-white" />
                  Liberando…
                </>
              ) : (
                "Liberar acesso"
              )}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-100 bg-[#fafaf8] p-4 md:p-5">
            <p className="text-sm font-medium text-zinc-800">Importação em lote</p>
            <p className="text-xs leading-relaxed text-zinc-600">
              Uma linha por compra: <code className="rounded bg-white px-1">email,product_id</code> (também aceita
              ponto-e-vírgula ou tab).               O <code className="rounded bg-white px-1">product_id</code> é o UUID do produto
              no catálogo ou o ID Hotmart/Cakto (campos no cadastro do produto).
            </p>
            <textarea
              value={legacyBulkText}
              onChange={(e) => setLegacyBulkText(e.target.value)}
              placeholder={`# Exemplo\nmaria@email.com,uuid-do-produto\njoana@email.com,12345`}
              rows={8}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
              disabled={legacyGranting}
            />
            <button
              type="button"
              onClick={() => void handleGrantBulkLegacy()}
              disabled={legacyGranting || !legacyBulkText.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#6B705C" }}
            >
              {legacyGranting ? (
                <>
                  <Spinner className="size-4 text-white" />
                  Importando…
                </>
              ) : (
                "Importar compradores"
              )}
            </button>
          </div>
        </AdminSection>

        <AdminSection
          id="kit-bonus"
          icon={Package}
          title="Bônus por kit"
          description="Escolha o produto principal (kit). Os bônus marcados liberam automaticamente quando a cliente comprar esse kit."
        >
          <div className="mb-4 space-y-2">
            <label className="text-sm text-zinc-700">Produto kit</label>
            {kitCandidates.length === 0 ? (
              <p className="text-sm text-amber-800">Cadastre pelo menos um produto que não seja só BON para usar como kit.</p>
            ) : (
              <select
                value={kitProductId}
                onChange={(e) => setKitProductId(e.target.value)}
                className="h-11 w-full max-w-xl rounded-md border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">Selecione o kit</option>
                {kitCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.title || p.id}
                  </option>
                ))}
              </select>
            )}
          </div>
          {bonusOnlyProducts.length === 0 ? (
            <p className="text-sm text-zinc-500">Cadastre produtos tipo BON para aparecerem aqui.</p>
          ) : (
            <ul className="mb-4 grid max-h-[min(16rem,50vh)] gap-2 overflow-y-auto rounded-xl border border-zinc-100 bg-[#fafaf8] p-3 sm:grid-cols-2">
              {bonusOnlyProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg border border-transparent bg-white px-2 py-1.5 shadow-sm">
                  <input
                    type="checkbox"
                    id={`bonus-${p.id}`}
                    checked={!!kitBonusIds[p.id]}
                    onChange={(e) =>
                      setKitBonusIds((prev) => ({ ...prev, [p.id]: e.target.checked }))
                    }
                    className="rounded border-zinc-300"
                  />
                  <label htmlFor={`bonus-${p.id}`} className="text-sm text-zinc-800">
                    {p.name || p.title || p.id}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => void handleSaveKitBonuses()}
            disabled={kitSaving || !kitProductId}
            className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: "#6B705C" }}
          >
            {kitSaving ? (
              <>
                <Spinner className="size-4 text-white" />
                Salvando…
              </>
            ) : (
              "Salvar bônus deste kit"
            )}
          </button>
        </AdminSection>

        <AdminSection
          id="notifications"
          icon={Bell}
          title="Notificações do app"
          description="Os avisos aparecem na lista aberta pelo ícone de sino (dashboard e comunidade)."
        >
          <form onSubmit={handlePublishNotification} className="mb-6 space-y-3 rounded-xl border border-zinc-100 bg-[#fafaf8] p-4 md:p-5">
            <div className="space-y-1">
              <label className="text-sm text-zinc-700">Título</label>
              <input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Ex.: Novidade na Bridal Creative"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                disabled={notifSaving}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-700">Mensagem</label>
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder="Texto que o usuário verá na lista de notificações."
                rows={4}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                disabled={notifSaving}
              />
            </div>
            <button
              type="submit"
              disabled={notifSaving || !notifTitle.trim() || !notifBody.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#6B705C" }}
            >
              {notifSaving ? (
                <>
                  <Spinner className="size-4 text-white" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Publicar aviso
                </>
              )}
            </button>
          </form>

          <div className="border-t border-zinc-200/90 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Histórico</p>
            {notifLoading ? (
              <p className="text-sm text-zinc-500">Carregando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma notificação enviada ainda.</p>
            ) : (
              <ul className="max-h-60 space-y-2 overflow-y-auto md:max-h-72">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-zinc-600">{n.body}</p>
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {new Date(n.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(n)}
                      disabled={deletingNotifId === n.id}
                      className="shrink-0 self-start rounded-md border border-red-200/90 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:self-auto"
                    >
                      {deletingNotifId === n.id ? "..." : "Excluir"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminSection>

        <AdminSection
          id="catalog"
          icon={LayoutGrid}
          title="Catálogo de produtos"
          description='Edite, oculte ou exclua itens pelos botões em cada cartão. Produtos ocultos não aparecem no catálogo antes da compra, mas continuam visíveis para quem já tem acesso.'
          headerExtra={
            !loading ? (
              <span className="mr-1 inline-flex w-fit items-center rounded-full bg-[#6B705C]/10 px-3 py-1 text-xs font-medium text-[#4e563f]">
                {sortedProducts.length} {sortedProducts.length === 1 ? "item" : "itens"}
              </span>
            ) : null
          }
        >
          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-[#6B705C]">
                <Spinner className="size-5 shrink-0" />
                Carregando catálogo…
              </div>
              <div className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`sk-${i}`} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="h-11 w-11 shrink-0 rounded bg-zinc-200/90" />
                    <Skeleton className="h-4 w-2/5 bg-zinc-200/80" />
                  </div>
                ))}
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
              <p className="text-sm text-zinc-600">Nenhum produto no catálogo.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6B705C] px-4 py-2.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro produto
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
              {sortedProducts.map((product) => {
                const imageSrc =
                  product.image_url ||
                  product.image ||
                  product.thumbnail_url ||
                  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-zinc-50/80"
                  >
                    <img
                      src={imageSrc}
                      alt={product.name || "Produto"}
                      className={`h-11 w-11 shrink-0 rounded object-cover ${product.is_hidden ? "opacity-60" : ""}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {product.name || product.title || "Sem nome"}
                      </p>
                      {product.is_hidden ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                          <EyeOff className="h-3 w-3" />
                          Oculto
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleProductHidden(product)}
                        title={product.is_hidden ? "Mostrar no catálogo" : "Ocultar antes da compra"}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded ${
                          product.is_hidden
                            ? "text-amber-700 hover:bg-amber-50"
                            : "text-zinc-500 hover:bg-zinc-100"
                        }`}
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        title="Editar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-[#6B705C] hover:bg-[#6B705C]/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDuplicateProduct(product)}
                        disabled={duplicatingId === product.id}
                        title="Duplicar"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-60"
                      >
                        {duplicatingId === product.id ? (
                          <Spinner className="size-3.5 text-zinc-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingId === product.id}
                        title="Excluir"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === product.id ? (
                          <Spinner className="size-3.5 text-red-700" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && (
            <div className="mt-4">
              <ProductCsvImport onImported={() => void fetchProducts()} />
            </div>
          )}
        </AdminSection>

        <p
          className="select-none pt-2 text-center text-[11px] tracking-wide text-zinc-400/45"
          aria-label={`Versão ${ADMIN_APP_VERSION}`}
        >
          {ADMIN_APP_VERSION}
        </p>
      </div>

      {isModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/55 px-4 py-8 transition-opacity duration-200 ${
            isModalVisible ? "opacity-100" : "opacity-0"
          }`}
          role="presentation"
        >
          <section
            className={`relative mx-auto w-full max-w-3xl rounded-2xl border border-zinc-200/95 bg-white p-4 shadow-xl transition-all duration-200 sm:rounded-3xl sm:p-6 md:p-8 ${
              isModalVisible ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-modal-title"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="mb-4 pr-10 sm:mb-5">
              <h2
                id="admin-product-modal-title"
                className="font-serif text-xl leading-tight text-[#6B705C] sm:text-2xl md:text-3xl"
              >
                {editingProductId ? "Editar conteúdo" : "Cadastrar conteúdo"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {editingProductId
                  ? "Ajuste os campos e salve para atualizar o catálogo."
                  : "Preencha os dados abaixo para cadastrar um novo conteúdo no catálogo."}
              </p>
              {editingProductId && (
                <a
                  href={`/dashboard/product/${editingProductId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex h-8 items-center gap-1.5 text-xs font-medium text-[#6B705C] underline decoration-[#6B705C]/40 underline-offset-2 hover:decoration-[#6B705C]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visualizar como cliente
                </a>
              )}
              {!editingProductId && createStep === "full" && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Produto criado — personalize o restante abaixo quando quiser.
                </p>
              )}
              {modalFormIsDirty && (
                <button
                  type="button"
                  onClick={clearFormFields}
                  disabled={saving}
                  className="mt-4 inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-xs font-medium tracking-wide text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                >
                  Limpar campos
                </button>
              )}
            </header>

            {!editingProductId && createStep === "basic" ? (
              <form
                onSubmit={handleSave}
                className={`space-y-4 ${saving ? "pointer-events-none opacity-80" : ""}`}
                aria-busy={saving}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B705C]/70">
                  Passo 1 de 2 — o essencial
                </p>

                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-700">Título do Conteúdo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do produto"
                    className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-zinc-700">Imagem de capa do catálogo</label>
                  <p className="text-xs text-zinc-500">Pode trocar depois. Proporção retrato, com recorte.</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-zinc-700">
                      Preço <span className="text-xs text-zinc-400">(opcional, dá pra ajustar depois)</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Ex: 97.00"
                      className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-zinc-700">Tipo</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as "PRO" | "BON")}
                      className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                    >
                      <option value="PRO">PRO</option>
                      <option value="BON">BON</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-8 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-70 sm:w-auto"
                  style={{ backgroundColor: "#6B705C" }}
                >
                  {saving ? (
                    <>
                      <Spinner className="size-4 text-white" />
                      CRIANDO...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      CRIAR E CONTINUAR
                    </>
                  )}
                </button>
              </form>
            ) : (
            <form
              onSubmit={handleSave}
              className={`flex flex-col ${saving ? "pointer-events-none opacity-80" : ""}`}
              aria-busy={saving}
            >
              <div className="mb-4 flex flex-wrap gap-1.5 border-b border-zinc-200 pb-3">
                {(
                  [
                    { id: "geral", label: "Geral" },
                    { id: "antes", label: "Antes da compra" },
                    { id: "depois", label: "Depois da compra" },
                    { id: "aulas", label: "Aulas" },
                    { id: "faq", label: "FAQ" },
                    { id: "depoimentos", label: "Depoimentos" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProductFormTab(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      productFormTab === tab.id
                        ? "bg-[#6B705C] text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {productFormTab === "geral" && (
                  <>
                    <FormFieldGroup title="Informações gerais" first />

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Título do Conteúdo</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nome do produto"
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                        required
                      />
                    </div>

                    <FormFieldGroup title="Capa do catálogo" />

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Imagem de capa do catálogo</label>
                      <p className="text-xs text-zinc-500">
                        Usada no dashboard/catálogo. Na página de compra só quando não houver imagem de venda.
                        Proporção retrato, com recorte.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                      />
                      {existingImageUrl && !imageFile && (
                        <p className="text-[11px] text-zinc-500">Imagem atual salva; envie outro arquivo só se quiser trocar.</p>
                      )}
                    </div>

                    <FormFieldGroup title="Preço, categoria e visibilidade" />

                    <div className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isHidden}
                          onChange={(e) => setIsHidden(e.target.checked)}
                          disabled={saving}
                          className="mt-0.5 rounded border-zinc-300"
                        />
                        <span>
                          <span className="text-sm font-medium text-zinc-800">
                            Ocultar no catálogo antes da compra
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            O produto não aparece para quem ainda não tem acesso. Quem já comprou continua vendo em &quot;Seus produtos&quot;.
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Categoria (atalho &quot;Explore&quot;)</label>
                      <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                      >
                        <option value="">Nenhuma</option>
                        {productCategoriesConfig.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.parent_id ? `— ${category.name || "Sem nome"}` : category.name || "Sem nome"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm text-zinc-700">
                          Preço <span className="text-xs text-zinc-400">(exibido nos cards não comprados)</span>
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="Ex: 97.00"
                          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-zinc-700">
                          Preço promocional <span className="text-xs text-zinc-400">(opcional · de/por)</span>
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={promoPrice}
                          onChange={(e) => setPromoPrice(e.target.value)}
                          placeholder="Ex: 67.00"
                          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Tipo de Conteúdo</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as "PRO" | "BON")}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                      >
                        <option value="PRO">PRO</option>
                        <option value="BON">BON</option>
                      </select>
                    </div>

                    <FormFieldGroup title="Integrações de venda" />

                    <ExternalSalesIdField
                      hotmartValue={hotmartSalesId}
                      caktoValue={caktoSalesId}
                      onHotmartChange={setHotmartSalesId}
                      onCaktoChange={setCaktoSalesId}
                      legacyExternalSalesId={legacyExternalSalesId}
                      disabled={saving}
                    />
                  </>
                )}

                {productFormTab === "antes" && (
                  <>
                    <FormFieldGroup title="Descrição na compra" first />

                    <CollapsedRichTextField
                      label="Descrição na compra"
                      description="Exibida para quem ainda não comprou o conteúdo (página com CTA de compra)."
                      value={description}
                      onChange={setDescription}
                      disabled={saving}
                      onUploadImage={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images")}
                      customFonts={customFonts}
                      onUploadFont={handleUploadCustomFont}
                    />

                    <FormFieldGroup title="Mídia de venda" />

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Imagem da página de venda</label>
                      <p className="text-xs text-zinc-500">
                        Exibida antes da compra, em proporção completa (sem o recorte da capa do catálogo). Se
                        vazio, usa a capa.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSalesImageFile(e.target.files?.[0] ?? null)}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                      />
                      {existingSalesImageUrl && !salesImageFile && (
                        <div className="space-y-1.5">
                          <img
                            src={existingSalesImageUrl}
                            alt="Imagem de venda atual"
                            className="max-h-48 w-full rounded-md border border-zinc-200 bg-zinc-100 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              openCropForSavedUrl(existingSalesImageUrl, (newUrl) =>
                                setExistingSalesImageUrl(newUrl)
                              )
                            }
                            disabled={saving}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            <Crop className="h-3.5 w-3.5" />
                            Cortar
                          </button>
                          <p className="text-[11px] text-zinc-500">
                            Imagem de venda salva; envie outro arquivo só se quiser trocar.
                          </p>
                        </div>
                      )}
                      {salesImageFile && (
                        <button
                          type="button"
                          onClick={() => openCropForPendingFile(salesImageFile, (newFile) => setSalesImageFile(newFile))}
                          disabled={saving}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          <Crop className="h-3.5 w-3.5" />
                          Cortar antes de enviar
                        </button>
                      )}
                    </div>

                    <MediaGalleryEditor
                      label="Galeria de modelos (venda)"
                      description="Imagens extras exibidas na página de compra para mostrar prévia dos modelos. Pode enviar várias de uma vez."
                      accept="image/*"
                      kind="image"
                      savedUrls={salesGalleryUrls}
                      onSavedUrlsChange={setSalesGalleryUrls}
                      pendingFiles={salesGalleryPendingFiles}
                      onPendingFilesChange={setSalesGalleryPendingFiles}
                      disabled={saving}
                      onCropSaved={(i) =>
                        openCropForSavedUrl(salesGalleryUrls[i], (newUrl) =>
                          setSalesGalleryUrls((prev) => prev.map((u, idx) => (idx === i ? newUrl : u)))
                        )
                      }
                      onCropPending={(i) =>
                        openCropForPendingFile(salesGalleryPendingFiles[i], (newFile) =>
                          setSalesGalleryPendingFiles((prev) => prev.map((f, idx) => (idx === i ? newFile : f)))
                        )
                      }
                    />

                    <FormFieldGroup title="Vídeos de vendas" />

                    <MediaGalleryEditor
                      label="Vídeos da página de vendas"
                      description="Exibidos no carrossel antes da compra (ficam bloqueados com cadeado se o item ainda não foi liberado). Pode enviar vários."
                      accept="video/*"
                      kind="video"
                      savedUrls={salesVideoUrls}
                      onSavedUrlsChange={setSalesVideoUrls}
                      pendingFiles={salesVideoPendingFiles}
                      onPendingFilesChange={setSalesVideoPendingFiles}
                      disabled={saving}
                    />

                    <FormFieldGroup title="Checkout" />

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Link de compra (checkout)</label>
                      <p className="text-xs text-zinc-500">
                        URL da página de vendas. Usada no botão &quot;Quero ter acesso agora&quot; antes da compra.
                      </p>
                      <input
                        type="url"
                        value={linkCompra}
                        onChange={(e) => setLinkCompra(e.target.value)}
                        placeholder="https://..."
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                      />
                    </div>
                  </>
                )}

                {productFormTab === "depois" && (
                  <>
                    <FormFieldGroup title="Descrição na entrega" first />

                    <CollapsedRichTextField
                      label="Descrição na entrega"
                      description="Exibida após a compra, quando vídeo e link de acesso estão liberados."
                      value={descriptionDelivery}
                      onChange={setDescriptionDelivery}
                      disabled={saving}
                      onUploadImage={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images")}
                      customFonts={customFonts}
                      onUploadFont={handleUploadCustomFont}
                    />

                    <FormFieldGroup title="Mídia de entrega" />

                    <div className="space-y-1.5">
                      <label className="text-sm text-zinc-700">Imagem da página de entrega</label>
                      <p className="text-xs text-zinc-500">
                        Exibida após a compra, em proporção completa (sem o recorte da capa do catálogo). Se vazio, usa a capa.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setDeliveryImageFile(e.target.files?.[0] ?? null)}
                        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                      />
                      {existingDeliveryImageUrl && !deliveryImageFile && (
                        <div className="space-y-1.5">
                          <img
                            src={existingDeliveryImageUrl}
                            alt="Imagem de entrega atual"
                            className="max-h-48 w-full rounded-md border border-zinc-200 bg-zinc-100 object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              openCropForSavedUrl(existingDeliveryImageUrl, (newUrl) =>
                                setExistingDeliveryImageUrl(newUrl)
                              )
                            }
                            disabled={saving}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            <Crop className="h-3.5 w-3.5" />
                            Cortar
                          </button>
                          <p className="text-[11px] text-zinc-500">
                            Imagem de entrega salva; envie outro arquivo só se quiser trocar.
                          </p>
                        </div>
                      )}
                      {deliveryImageFile && (
                        <button
                          type="button"
                          onClick={() =>
                            openCropForPendingFile(deliveryImageFile, (newFile) => setDeliveryImageFile(newFile))
                          }
                          disabled={saving}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          <Crop className="h-3.5 w-3.5" />
                          Cortar antes de enviar
                        </button>
                      )}
                    </div>

                    <MediaGalleryEditor
                      label="Galeria de modelos (entrega)"
                      description="Imagens extras exibidas na entrega para mostrar os modelos que a cliente recebe. Pode enviar várias de uma vez."
                      accept="image/*"
                      kind="image"
                      savedUrls={deliveryGalleryUrls}
                      onSavedUrlsChange={setDeliveryGalleryUrls}
                      pendingFiles={deliveryGalleryPendingFiles}
                      onPendingFilesChange={setDeliveryGalleryPendingFiles}
                      disabled={saving}
                      onCropSaved={(i) =>
                        openCropForSavedUrl(deliveryGalleryUrls[i], (newUrl) =>
                          setDeliveryGalleryUrls((prev) => prev.map((u, idx) => (idx === i ? newUrl : u)))
                        )
                      }
                      onCropPending={(i) =>
                        openCropForPendingFile(deliveryGalleryPendingFiles[i], (newFile) =>
                          setDeliveryGalleryPendingFiles((prev) => prev.map((f, idx) => (idx === i ? newFile : f)))
                        )
                      }
                    />

                    <FormFieldGroup title="Vídeos de entrega" />

                    <MediaGalleryEditor
                      label="Vídeos da página de entrega"
                      description="Exibidos no carrossel após a compra. Pode enviar vários."
                      accept="video/*"
                      kind="video"
                      savedUrls={deliveryVideoUrls}
                      onSavedUrlsChange={setDeliveryVideoUrls}
                      pendingFiles={deliveryVideoPendingFiles}
                      onPendingFilesChange={setDeliveryVideoPendingFiles}
                      disabled={saving}
                    />

                    <FormFieldGroup title="Links de acesso" />

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-zinc-700">Links de acesso (após a compra)</label>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Cadastre quantos links precisar (Drive, Notion, aulas, etc.). Cada um vira um botão na página do
                          produto.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {accessLinkRows.map((row, index) => (
                          <div
                            key={row.id}
                            className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-zinc-600">Link {index + 1}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setAccessLinkRows((prev) =>
                                    prev.length <= 1 ? prev : prev.filter((item) => item.id !== row.id)
                                  )
                                }
                                disabled={saving || accessLinkRows.length <= 1}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200 disabled:opacity-40"
                                aria-label={`Remover link ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={row.label}
                              onChange={(e) =>
                                setAccessLinkRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, label: e.target.value } : item
                                  )
                                )
                              }
                              placeholder="Nome do link (ex: Google Drive)"
                              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                            />
                            <input
                              type="url"
                              value={row.url}
                              onChange={(e) =>
                                setAccessLinkRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, url: e.target.value } : item
                                  )
                                )
                              }
                              placeholder="https://..."
                              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                            />
                            <div className="flex items-center gap-2">
                              <label className="group relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
                                {row.cover_url ? (
                                  <img src={row.cover_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <ImagePlus className="h-4 w-4 text-zinc-400" />
                                )}
                                {uploadingAccessLinkCoverId === row.id ? (
                                  <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                                    <Spinner className="size-3.5 text-[#6B705C]" />
                                  </span>
                                ) : null}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={saving || uploadingAccessLinkCoverId === row.id}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file) return;
                                    setUploadingAccessLinkCoverId(row.id);
                                    try {
                                      const url = await uploadFileToStorage(file, IMAGE_BUCKET, "images", "access-links");
                                      setAccessLinkRows((prev) =>
                                        prev.map((item) => (item.id === row.id ? { ...item, cover_url: url } : item))
                                      );
                                    } finally {
                                      setUploadingAccessLinkCoverId(null);
                                    }
                                  }}
                                />
                              </label>
                              <span className="text-xs text-zinc-500">
                                Capa opcional pra ilustrar este link na entrega
                              </span>
                              {row.cover_url && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAccessLinkRows((prev) =>
                                      prev.map((item) => (item.id === row.id ? { ...item, cover_url: null } : item))
                                    )
                                  }
                                  disabled={saving}
                                  className="text-xs text-red-700 hover:underline disabled:opacity-50"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAccessLinkRows((prev) => [...prev, emptyAccessLinkRow()])}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar link
                      </button>
                    </div>
                  </>
                )}

                {productFormTab === "aulas" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Aulas gravadas organizadas em módulos, exibidas como trilhas (estilo Netflix, com capa)
                      na página do produto depois da compra.
                    </p>
                    <ProductModulesEditor
                      modules={modulesConfig}
                      onChange={setModulesConfig}
                      disabled={saving}
                      onUploadImage={(file) => uploadFileToStorage(file, IMAGE_BUCKET, "images", "modules")}
                      onUploadVideo={(file) => uploadFileToStorage(file, VIDEO_BUCKET, "videos", "modules")}
                    />
                  </div>
                )}

                {productFormTab === "faq" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Perguntas frequentes exibidas como accordion (abre/fecha ao clicar) na página do produto.
                    </p>
                    <ProductFaqEditor items={faqRows} onChange={setFaqRows} disabled={saving} />
                  </div>
                )}

                {productFormTab === "depoimentos" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Depoimentos exclusivos deste produto — diferentes dos depoimentos globais da Início.
                    </p>
                    <ProductTestimonialsEditor
                      testimonials={productTestimonials}
                      onChange={setProductTestimonials}
                      disabled={saving}
                      onUploadPhoto={(file) =>
                        uploadFileToStorage(file, IMAGE_BUCKET, "images", "product-testimonials")
                      }
                    />
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-4 mt-6 flex justify-end border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-md px-8 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  style={{ backgroundColor: "#6B705C" }}
                >
                  {saving ? (
                    <>
                      <Spinner className="size-4 text-white" />
                      SALVANDO...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      SALVAR
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </section>
        </div>
      )}

      <ImageCropModal
        imageUrl={cropModal?.url ?? null}
        onCancel={() => setCropModal(null)}
        onConfirm={(blob) => cropModal?.onDone(blob)}
      />
    </div>
  );
}
