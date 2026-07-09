import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  EyeOff,
  LayoutGrid,
  LogOut,
  type LucideIcon,
  Package,
  Palette,
  Pencil,
  Plus,
  Rows3,
  Save,
  Send,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AdminRichTextEditor from "@/components/AdminRichTextEditor";
import DashboardSectionsEditor from "@/components/admin/DashboardSectionsEditor";
import ExternalSalesIdField from "@/components/admin/ExternalSalesIdField";
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
  isHeroBannerDesktopUrlsSchemaError,
  isHeroBannerUrlsSchemaError,
  isPageBackgroundOpacityError,
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
  accessLinksEqual,
  accessLinksToFormRows,
  emptyAccessLinkRow,
  formRowsToAccessLinks,
  parseAccessLinks,
  type ProductAccessLinkRow,
} from "@/lib/productAccessLinks";
import { parseDeliveryGalleryUrls } from "@/lib/productDeliveryImages";
import { normalizeWhatsAppUrl } from "@/lib/whatsappUrl";
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
  delivery_gallery_urls?: unknown;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  video?: string | null;
  link_compra?: string | null;
  access_links?: unknown;
  external_sales_id?: string | null;
  is_hidden?: boolean | null;
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
  return m.includes("video_url");
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

/** Banco sem migração da coluna `external_sales_id` — PostgREST / Postgres avisa no erro. */
function isMissingExternalSalesIdColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code ?? "") : "";
  return (
    m.includes("external_sales_id") ||
    (m.includes("column") && (m.includes("does not exist") || m.includes("schema cache"))) ||
    code === "PGRST204"
  );
}

function isMissingIsHiddenColumnError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return m.includes("is_hidden");
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
  const [deliveryGalleryUrls, setDeliveryGalleryUrls] = useState<string[]>([]);
  const [deliveryGalleryPendingFiles, setDeliveryGalleryPendingFiles] = useState<File[]>([]);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionDelivery, setDescriptionDelivery] = useState("");
  const [linkCompra, setLinkCompra] = useState("");
  const [accessLinkRows, setAccessLinkRows] = useState<ProductAccessLinkRow[]>([emptyAccessLinkRow()]);
  const [type, setType] = useState<"PRO" | "BON">("PRO");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deliveryImageFile, setDeliveryImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [clearVideo, setClearVideo] = useState(false);
  const [externalSalesId, setExternalSalesId] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
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

  const logoFileInputRef = useRef<HTMLInputElement>(null);
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
    externalSalesId: string;
    type: "PRO" | "BON";
    isHidden: boolean;
  };

  const emptyFormSnapshot: ProductFormSnapshot = {
    name: "",
    description: "",
    descriptionDelivery: "",
    linkCompra: "",
    accessLinks: [],
    externalSalesId: "",
    type: "PRO",
    isHidden: false,
  };

  const [modalSnapshot, setModalSnapshot] = useState<ProductFormSnapshot>(emptyFormSnapshot);

  const sortedProducts = useMemo(
    () =>
      [...products].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "pt-BR", {
          sensitivity: "base",
        })
      ),
    [products]
  );

  const resetForm = () => {
    setEditingProductId(null);
    setExistingImageUrl(null);
    setExistingDeliveryImageUrl(null);
    setDeliveryGalleryUrls([]);
    setDeliveryGalleryPendingFiles([]);
    setExistingVideoUrl(null);
    setName("");
    setDescription("");
    setDescriptionDelivery("");
    setLinkCompra("");
    setAccessLinkRows([emptyAccessLinkRow()]);
    setType("PRO");
    setImageFile(null);
    setDeliveryImageFile(null);
    setVideoFile(null);
    setClearVideo(false);
    setExternalSalesId("");
    setIsHidden(false);
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
    setExistingImageUrl(product.image_url || product.image || product.thumbnail_url || null);
    setExistingDeliveryImageUrl(product.image_delivery_url?.trim() || null);
    setDeliveryGalleryUrls(parseDeliveryGalleryUrls(product.delivery_gallery_urls));
    setDeliveryGalleryPendingFiles([]);
    setExistingVideoUrl(product.video_url || product.video || null);
    setClearVideo(false);
    setName(product.name || "");
    setDescription(product.description || "");
    setDescriptionDelivery(product.description_delivery || "");
    setLinkCompra(product.link_compra || "");
    const parsedAccessLinks = parseAccessLinks(product.access_links);
    setAccessLinkRows(accessLinksToFormRows(parsedAccessLinks));
    setType(product.type === "BON" ? "BON" : "PRO");
    setImageFile(null);
    setDeliveryImageFile(null);
    setVideoFile(null);
    setExternalSalesId(product.external_sales_id?.trim() || "");
    setIsHidden(product.is_hidden === true);
    setModalSnapshot({
      name: product.name || "",
      description: product.description || "",
      descriptionDelivery: product.description_delivery || "",
      linkCompra: product.link_compra || "",
      accessLinks: parsedAccessLinks,
      externalSalesId: product.external_sales_id?.trim() || "",
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
    setExternalSalesId(emptyFormSnapshot.externalSalesId);
    setType(emptyFormSnapshot.type);
    setIsHidden(emptyFormSnapshot.isHidden);
    setImageFile(null);
    setDeliveryImageFile(null);
    setVideoFile(null);
    setClearVideo(false);
    if (!editingProductId) {
      setExistingImageUrl(null);
      setExistingDeliveryImageUrl(null);
      setDeliveryGalleryUrls([]);
      setDeliveryGalleryPendingFiles([]);
      setExistingVideoUrl(null);
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
      externalSalesId.trim() !== modalSnapshot.externalSalesId.trim() ||
      type !== modalSnapshot.type ||
      isHidden !== modalSnapshot.isHidden ||
      imageFile != null ||
      deliveryImageFile != null ||
      deliveryGalleryPendingFiles.length > 0 ||
      videoFile != null ||
      clearVideo
    );
  }, [
    isModalOpen,
    name,
    description,
    descriptionDelivery,
    linkCompra,
    accessLinkRows,
    externalSalesId,
    type,
    isHidden,
    imageFile,
    deliveryImageFile,
    deliveryGalleryPendingFiles,
    videoFile,
    clearVideo,
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
        setSiteLoginBgUrl(row.page_background_login_url ?? legacy);
        setSiteAppBgUrl(row.page_background_app_url ?? legacy);
        setSiteBgOpacityPercent(row.page_background_opacity_percent);
        setSiteHeroUrls(row.hero_banner_urls);
        setSiteHeroDesktopUrls(row.hero_banner_desktop_urls);
        setSiteColors(row.colors);
        setSiteWhatsappUrl(row.whatsapp_url ?? "");
        setDashboardSectionsConfig(row.dashboard_sections_config);
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

  const uploadFileToStorage = async (
    file: File,
    bucket: string,
    folder: "images" | "videos",
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

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const extId = externalSalesId.trim();

    const saveProductRow = async (
      imageUrl: string | null,
      videoUrl: string | null,
      deliveryImageUrl: string | null,
      galleryUrls: string[],
      opts: {
        includeExternalSalesId: boolean;
        includeDescriptionDelivery: boolean;
        includeVideoUrl: boolean;
        includeAccessLinks: boolean;
        includeImageDeliveryUrl: boolean;
        includeDeliveryGalleryUrls: boolean;
        includeIsHidden: boolean;
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
      if (opts.includeAccessLinks) {
        payload.access_links = formRowsToAccessLinks(accessLinkRows);
      }
      if (opts.includeExternalSalesId) {
        payload.external_sales_id = extId.length ? extId : null;
      }
      if (opts.includeImageDeliveryUrl) {
        payload.image_delivery_url = deliveryImageUrl;
      }
      if (opts.includeDeliveryGalleryUrls) {
        payload.delivery_gallery_urls = galleryUrls;
      }
      if (opts.includeIsHidden) {
        payload.is_hidden = isHidden;
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
      galleryUrls: string[]
    ) => {
      const flags = {
        includeExternalSalesId: true,
        includeDescriptionDelivery: true,
        includeVideoUrl: true,
        includeAccessLinks: true,
        includeImageDeliveryUrl: true,
        includeDeliveryGalleryUrls: true,
        includeIsHidden: true,
      };
      let dbError: unknown = null;
      let insertedId: string | null = editingProductId;

      for (let attempt = 0; attempt < 13; attempt++) {
        const result = await saveProductRow(imageUrl, videoUrl, deliveryImageUrl, galleryUrls, flags);
        dbError = result.error;
        if (!dbError) {
          if (!editingProductId && result.data && "id" in result.data) {
            insertedId = String((result.data as { id: string }).id);
          }
          break;
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
        if (isMissingExternalSalesIdColumnError(dbError) && flags.includeExternalSalesId) {
          flags.includeExternalSalesId = false;
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
        if (isMissingIsHiddenColumnError(dbError) && flags.includeIsHidden) {
          flags.includeIsHidden = false;
          continue;
        }
        break;
      }

      return { dbError, insertedId, flags };
    };

    try {
      let imageUrl = existingImageUrl;
      let deliveryImageUrl = existingDeliveryImageUrl;
      let videoUrl = clearVideo ? null : existingVideoUrl;
      let pendingVideoFile: File | null = null;

      if (imageFile) {
        imageUrl = await uploadFileToStorage(imageFile, IMAGE_BUCKET, "images");
      }

      if (deliveryImageFile) {
        deliveryImageUrl = await uploadFileToStorage(deliveryImageFile, IMAGE_BUCKET, "images");
      }

      const uploadedGalleryUrls: string[] = [];
      for (const file of deliveryGalleryPendingFiles) {
        uploadedGalleryUrls.push(await uploadFileToStorage(file, IMAGE_BUCKET, "images"));
      }
      const galleryUrls = [...deliveryGalleryUrls, ...uploadedGalleryUrls];

      if (videoFile && !clearVideo) {
        if (editingProductId) {
          videoUrl = await uploadFileToStorage(
            videoFile,
            VIDEO_BUCKET,
            "videos",
            editingProductId
          );
        } else {
          pendingVideoFile = videoFile;
          videoUrl = null;
        }
      }

      const { dbError, insertedId, flags } = await persistWithSchemaFallback(
        imageUrl,
        videoUrl,
        deliveryImageUrl,
        galleryUrls
      );

      if (!dbError && pendingVideoFile && insertedId) {
        const uploadedUrl = await uploadFileToStorage(
          pendingVideoFile,
          VIDEO_BUCKET,
          "videos",
          insertedId
        );
        const { error: videoUpdateError } = await supabase
          .from("products")
          .update({ video_url: uploadedUrl })
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

      if (
        !dbError &&
        (!flags.includeDescriptionDelivery ||
          !flags.includeExternalSalesId ||
          !flags.includeVideoUrl ||
          !flags.includeAccessLinks ||
          !flags.includeImageDeliveryUrl ||
          !flags.includeDeliveryGalleryUrls ||
          !flags.includeIsHidden)
      ) {
        await fetchProducts();
        closeModal();
        const parts: string[] = [];
        if (!flags.includeVideoUrl) {
          parts.push("vídeo do produto (migração video_url)");
        }
        if (!flags.includeAccessLinks) {
          parts.push("links de acesso (migração access_links)");
        }
        if (!flags.includeDescriptionDelivery) {
          parts.push("descrição de entrega (migração description_delivery)");
        }
        if (!flags.includeExternalSalesId) {
          parts.push("ID da loja (Cakto / Hotmart — migração external_sales_id)");
        }
        if (!flags.includeImageDeliveryUrl) {
          parts.push("imagem de entrega (migração image_delivery_url)");
        }
        if (!flags.includeDeliveryGalleryUrls) {
          parts.push("galeria de modelos (migração delivery_gallery_urls)");
        }
        if (!flags.includeIsHidden) {
          parts.push("visibilidade no catálogo (migração is_hidden)");
        }
        toast.success(`Produto salvo. Ainda não foi possível guardar: ${parts.join("; ")}.`);
        return;
      }

      if (dbError) {
        throw dbError;
      }

      await fetchProducts();
      closeModal();
      toast.success("Produto salvo com sucesso.");
    } catch (error) {
      console.log("Erro detalhado:", error);
      console.error("Erro ao salvar produto no Supabase:", error);
      const message = getErrorMessage(error);

      if (message.toLowerCase().includes("auth session missing")) {
        try {
          const fallbackVideoUrl = clearVideo ? null : existingVideoUrl;
          const { dbError: fallbackError, flags } = await persistWithSchemaFallback(
            existingImageUrl,
            fallbackVideoUrl,
            existingDeliveryImageUrl,
            deliveryGalleryUrls
          );
          if (!fallbackError) {
            await fetchProducts();
            closeModal();
            const parts: string[] = [];
            if (!flags.includeVideoUrl) parts.push("vídeo do produto");
            if (!flags.includeAccessLinks) parts.push("links de acesso");
            if (!flags.includeDescriptionDelivery) parts.push("descrição de entrega");
            if (!flags.includeExternalSalesId) parts.push("ID da loja");
            if (!flags.includeImageDeliveryUrl) parts.push("imagem de entrega");
            if (!flags.includeDeliveryGalleryUrls) parts.push("galeria de modelos");
            if (!flags.includeIsHidden) parts.push("visibilidade no catálogo");
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
      let loginBgUrl = siteLoginBgUrl?.trim() || null;
      let appBgUrl = siteAppBgUrl?.trim() || null;
      if (logoFile) {
        logoUrl = await uploadFileToStorage(logoFile, IMAGE_BUCKET, "images", "site");
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
      if (error) throw error;
      setSiteLogoUrl(logoUrl ?? null);
      setSiteLoginBgUrl(loginBgUrl);
      setSiteAppBgUrl(appBgUrl);
      setSiteHeroUrls(bannerUrls);
      setSiteHeroDesktopUrls(bannerDesktopUrls);
      setHeroPendingFiles([]);
      setHeroDesktopPendingFiles([]);
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
      if (heroDesktopFileInputRef.current) heroDesktopFileInputRef.current.value = "";
      setLogoFile(null);
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

  const removeDeliveryGalleryUrlAt = (index: number) => {
    setDeliveryGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDeliveryGalleryPendingAt = (index: number) => {
    setDeliveryGalleryPendingFiles((prev) => prev.filter((_, i) => i !== index));
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
              saving={sectionOrderSaving}
              onSave={() => void handleSaveSectionsConfig()}
            />
          )}
        </AdminSection>

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
                        {p.external_sales_id ? ` (loja: ${p.external_sales_id})` : ""}
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
              ponto-e-vírgula ou tab). O <code className="rounded bg-white px-1">product_id</code> é o UUID do produto
              no catálogo ou o ID externo da Cakto/Hotmart (campo no cadastro do produto).
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm"
                  >
                    <Skeleton className="aspect-[3/4] w-full rounded-none bg-zinc-200/90" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-4 w-4/5 bg-zinc-200/80" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1 rounded-lg bg-zinc-200/70" />
                        <Skeleton className="h-9 flex-1 rounded-lg bg-zinc-200/70" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedProducts.map((product) => {
              const imageSrc =
                product.image_url ||
                product.image ||
                product.thumbnail_url ||
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";
              return (
                <article
                  key={product.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md ${
                    product.is_hidden ? "border-amber-200/90" : "border-zinc-200/95"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={imageSrc}
                      alt={product.name || "Produto"}
                      className={`aspect-[3/4] w-full object-cover ${product.is_hidden ? "opacity-75" : ""}`}
                    />
                    {product.is_hidden ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-600/95 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                        <EyeOff className="h-3 w-3" />
                        Oculto
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-zinc-900">
                      {product.name || product.title || "Sem nome"}
                    </p>
                    <div className="mt-auto flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleProductHidden(product)}
                        className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium ${
                          product.is_hidden
                            ? "border-amber-300 text-amber-800 hover:bg-amber-50"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        {product.is_hidden ? "Mostrar no catálogo" : "Ocultar antes da compra"}
                      </button>
                      <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-[#6B705C]/45 px-2 text-xs font-medium text-[#6B705C] hover:bg-[#6B705C]/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingId === product.id}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === product.id ? (
                          <Spinner className="size-3.5 text-red-700" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        {deletingId === product.id ? "Excluindo..." : "Excluir"}
                      </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </AdminSection>
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

            <form
              onSubmit={handleSave}
              className={`space-y-4 ${saving ? "pointer-events-none opacity-80" : ""}`}
              aria-busy={saving}
            >
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
                <label className="text-sm text-zinc-700">Descrição na compra (editor)</label>
                <p className="text-xs text-zinc-500">
                  Exibida para quem ainda não comprou o conteúdo (página com CTA de compra).
                </p>
                <AdminRichTextEditor value={description} onChange={setDescription} disabled={saving} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Descrição na entrega (editor)</label>
                <p className="text-xs text-zinc-500">
                  Exibida após a compra, quando vídeo e link de acesso estão liberados.
                </p>
                <AdminRichTextEditor
                  value={descriptionDelivery}
                  onChange={setDescriptionDelivery}
                  disabled={saving}
                />
              </div>

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
                  <img
                    src={existingDeliveryImageUrl}
                    alt="Imagem de entrega atual"
                    className="max-h-48 w-full rounded-md border border-zinc-200 bg-zinc-100 object-contain"
                  />
                )}
                {existingDeliveryImageUrl && !deliveryImageFile && (
                  <p className="text-[11px] text-zinc-500">
                    Imagem de entrega salva; envie outro arquivo só se quiser trocar.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-3">
                <div>
                  <label className="text-sm text-zinc-700">Galeria de modelos (entrega)</label>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Imagens extras exibidas na entrega para mostrar os modelos que a cliente recebe. Pode enviar várias de uma vez.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const next = Array.from(e.target.files ?? []);
                    if (next.length) setDeliveryGalleryPendingFiles((prev) => [...prev, ...next]);
                    e.target.value = "";
                  }}
                  className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                  disabled={saving}
                />
                {deliveryGalleryUrls.length > 0 && (
                  <ul className="space-y-1.5 text-xs">
                    {deliveryGalleryUrls.map((url, i) => (
                      <li
                        key={`dg-${url}-${i}`}
                        className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5"
                      >
                        <img src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                        <span className="min-w-0 flex-1 truncate text-zinc-600" title={url}>
                          {url.slice(0, 72)}
                          {url.length > 72 ? "…" : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDeliveryGalleryUrlAt(i)}
                          disabled={saving}
                          className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {deliveryGalleryPendingFiles.length > 0 && (
                  <ul className="space-y-1.5 text-xs">
                    <li className="text-zinc-500">A enviar ao salvar:</li>
                    {deliveryGalleryPendingFiles.map((file, i) => (
                      <li
                        key={`dgp-${file.name}-${i}`}
                        className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50/80 px-2 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDeliveryGalleryPendingAt(i)}
                          disabled={saving}
                          className="shrink-0 text-red-700 hover:underline disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Vídeo deste produto</label>
                <p className="text-xs text-zinc-500">
                  Cada conteúdo tem seu próprio arquivo. O vídeo é exibido na página do produto após a compra.
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    setVideoFile(e.target.files?.[0] ?? null);
                    if (e.target.files?.[0]) setClearVideo(false);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                />
                {existingVideoUrl && !videoFile && !clearVideo && (
                  <p className="text-[11px] text-zinc-500">
                    Vídeo atual deste produto salvo; envie outro arquivo só se quiser trocar.
                  </p>
                )}
                {existingVideoUrl && !clearVideo && (
                  <video
                    src={existingVideoUrl}
                    controls
                    preload="metadata"
                    className="max-h-40 w-full rounded-md border border-zinc-200 bg-zinc-100"
                  />
                )}
                {existingVideoUrl && !videoFile && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      checked={clearVideo}
                      onChange={(e) => setClearVideo(e.target.checked)}
                      disabled={saving}
                      className="rounded border-zinc-300"
                    />
                    Remover vídeo deste produto
                  </label>
                )}
              </div>

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

              <ExternalSalesIdField
                value={externalSalesId}
                onChange={setExternalSalesId}
                disabled={saving}
              />

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Imagem de capa do catálogo</label>
                <p className="text-xs text-zinc-500">
                  Usada no dashboard e na página de compra (antes do acesso). Proporção retrato, com recorte.
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

              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]">
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
          </section>
        </div>
      )}
    </div>
  );
}
