import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, ImageIcon, LogOut, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AdminRichTextEditor from "@/components/AdminRichTextEditor";
import BrandLogo from "@/components/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { safeStorageObjectName } from "@/lib/safeStorageKey";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string | null;
  title?: string | null;
  description?: string | null;
  type?: "PRO" | "BON" | string | null;
  image_url?: string | null;
  image?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  link_compra?: string | null;
  external_sales_id?: string | null;
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

function looksLikeStorageError(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  return (
    m.includes("bucket") ||
    m.includes("storage api") ||
    (m.includes("upload") && (m.includes("policy") || m.includes("denied") || m.includes("jwt"))) ||
    m.includes("new row violates row-level security policy") && m.includes("objects")
  );
}

export default function AdminPage() {
  const [, setLocation] = useLocation();

  const IMAGE_BUCKET = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || "product-images";
  const VIDEO_BUCKET = import.meta.env.VITE_SUPABASE_VIDEO_BUCKET || "product-videos";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkCompra, setLinkCompra] = useState("");
  const [type, setType] = useState<"PRO" | "BON">("PRO");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [externalSalesId, setExternalSalesId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [siteHeroHeadline, setSiteHeroHeadline] = useState("");
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [siteBgUrl, setSiteBgUrl] = useState<string | null>(null);
  const [siteHeroUrl, setSiteHeroUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteLoading, setSiteLoading] = useState(true);

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

  type ProductFormSnapshot = {
    name: string;
    description: string;
    linkCompra: string;
    externalSalesId: string;
    type: "PRO" | "BON";
  };

  const emptyFormSnapshot: ProductFormSnapshot = {
    name: "",
    description: "",
    linkCompra: "",
    externalSalesId: "",
    type: "PRO",
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
    setExistingVideoUrl(null);
    setName("");
    setDescription("");
    setLinkCompra("");
    setType("PRO");
    setImageFile(null);
    setVideoFile(null);
    setExternalSalesId("");
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
    setExistingVideoUrl(product.video_url || null);
    setName(product.name || "");
    setDescription(product.description || "");
    setLinkCompra(product.link_compra || "");
    setType(product.type === "BON" ? "BON" : "PRO");
    setImageFile(null);
    setVideoFile(null);
    setExternalSalesId(product.external_sales_id?.trim() || "");
    setModalSnapshot({
      name: product.name || "",
      description: product.description || "",
      linkCompra: product.link_compra || "",
      externalSalesId: product.external_sales_id?.trim() || "",
      type: product.type === "BON" ? "BON" : "PRO",
    });
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

  const clearFormFields = () => {
    setName(emptyFormSnapshot.name);
    setDescription(emptyFormSnapshot.description);
    setLinkCompra(emptyFormSnapshot.linkCompra);
    setExternalSalesId(emptyFormSnapshot.externalSalesId);
    setType(emptyFormSnapshot.type);
    setImageFile(null);
    setVideoFile(null);
    if (!editingProductId) {
      setExistingImageUrl(null);
      setExistingVideoUrl(null);
    }
    setModalSnapshot(emptyFormSnapshot);
  };

  const modalFormIsDirty = useMemo(() => {
    if (!isModalOpen) return false;
    const descChanged =
      richTextPlain(description) !== richTextPlain(modalSnapshot.description);
    return (
      name.trim() !== modalSnapshot.name.trim() ||
      descChanged ||
      linkCompra.trim() !== modalSnapshot.linkCompra.trim() ||
      externalSalesId.trim() !== modalSnapshot.externalSalesId.trim() ||
      type !== modalSnapshot.type ||
      imageFile != null ||
      videoFile != null
    );
  }, [
    isModalOpen,
    name,
    description,
    linkCompra,
    externalSalesId,
    type,
    imageFile,
    videoFile,
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
      const { data, error } = await supabase
        .from("site_settings")
        .select("hero_headline, logo_url, page_background_image_url, hero_image_url")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data) {
        setSiteHeroHeadline(data.hero_headline ?? "");
        setSiteLogoUrl(data.logo_url ?? null);
        setSiteBgUrl(data.page_background_image_url ?? null);
        setSiteHeroUrl(data.hero_image_url ?? null);
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
    setLocation("/");
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
      includeExternalSalesId: boolean
    ) => {
      const payload: Record<string, unknown> = {
        name,
        description,
        link_compra: linkCompra,
        type,
        image_url: imageUrl,
        video_url: videoUrl,
      };
      if (includeExternalSalesId) {
        payload.external_sales_id = extId.length ? extId : null;
      }
      if (editingProductId) {
        return supabase.from("products").update(payload).eq("id", editingProductId);
      }
      return supabase.from("products").insert(payload);
    };

    try {
      let imageUrl = existingImageUrl;
      let videoUrl = existingVideoUrl;

      if (imageFile) {
        imageUrl = await uploadFileToStorage(imageFile, IMAGE_BUCKET, "images");
      }

      if (videoFile) {
        videoUrl = await uploadFileToStorage(videoFile, VIDEO_BUCKET, "videos");
      }

      let { error: dbError } = await saveProductRow(imageUrl, videoUrl, true);
      if (dbError && isMissingExternalSalesIdColumnError(dbError)) {
        const second = await saveProductRow(imageUrl, videoUrl, false);
        dbError = second.error;
        if (!dbError) {
          await fetchProducts();
          closeModal();
          toast.success(
            "Produto salvo. O ID da loja (Cakto) ainda não foi guardado — execute a migração SQL que adiciona a coluna external_sales_id em products."
          );
          return;
        }
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
          let { error: fallbackError } = await saveProductRow(existingImageUrl, existingVideoUrl, true);
          if (fallbackError && isMissingExternalSalesIdColumnError(fallbackError)) {
            const second = await saveProductRow(existingImageUrl, existingVideoUrl, false);
            fallbackError = second.error;
            if (!fallbackError) {
              await fetchProducts();
              closeModal();
              toast.success(
                "Produto salvo (sem upload de arquivo). Adicione a coluna external_sales_id no banco para guardar o ID da loja."
              );
              return;
            }
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
          toast.error(`Não foi possível salvar: ${fbMsg.slice(0, 220)}${extra}`);
        }
      } else {
        const short = message.length > 220 ? `${message.slice(0, 220)}…` : message;
        const storageHint = looksLikeStorageError(error)
          ? " Confira o bucket no Supabase Storage (nome no .env) e as políticas de upload."
          : "";
        toast.error(`Não foi possível salvar: ${short}${storageHint}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSiteBranding = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSiteSaving(true);
    try {
      let logoUrl = siteLogoUrl;
      let bgUrl = siteBgUrl;
      let heroImgUrl = siteHeroUrl;
      if (logoFile) {
        logoUrl = await uploadFileToStorage(logoFile, IMAGE_BUCKET, "images", "site");
      }
      if (bgFile) {
        bgUrl = await uploadFileToStorage(bgFile, IMAGE_BUCKET, "images", "site");
      }
      if (heroFile) {
        heroImgUrl = await uploadFileToStorage(heroFile, IMAGE_BUCKET, "images", "site");
      }

      const { error } = await supabase.from("site_settings").upsert({
        id: 1,
        hero_headline: siteHeroHeadline.trim() || null,
        logo_url: logoUrl ?? null,
        page_background_image_url: bgUrl ?? null,
        hero_image_url: heroImgUrl ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setLogoFile(null);
      setBgFile(null);
      setHeroFile(null);
      toast.success("Aparência atualizada.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar a aparência (execute a migração site_settings no Supabase se necessário).");
    } finally {
      setSiteSaving(false);
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
    <div className="min-h-screen w-full bg-[#F7F5F0] px-3 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl rounded-[28px] border border-zinc-700/80 bg-[#F7F5F0] p-4 md:p-6">
        <div className="mb-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#6B705C]/25 bg-white/80 p-1">
              <BrandLogo className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-zinc-700">/admin</p>
              <h1 className="font-serif text-2xl text-[#6B705C] md:text-3xl">BC produtos</h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-1 rounded-md border border-[#6B705C]/50 px-3 text-xs text-[#6B705C] hover:bg-[#6B705C]/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 max-w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:h-11 sm:px-4"
              style={{ backgroundColor: "#6B705C" }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate sm:inline">Novo produto</span>
            </button>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-[#6B705C]/35 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-[#6B705C]" />
            <h2 className="font-serif text-xl text-[#6B705C] md:text-2xl">Aparência do app</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-600">
            Logo, textura de fundo e banner do topo (login e dashboard). Envie arquivos do seu computador.
          </p>
          {siteLoading ? (
            <p className="text-sm text-zinc-500">Carregando…</p>
          ) : (
            <form onSubmit={handleSaveSiteBranding} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-zinc-700">Frase do hero (dashboard)</label>
                <input
                  value={siteHeroHeadline}
                  onChange={(e) => setSiteHeroHeadline(e.target.value)}
                  placeholder="Nosso propósito é tornar seu sonho uma realidade!"
                  className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                  disabled={siteSaving}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Logo</label>
                  <input
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
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Textura / fundo da página</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBgFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-zinc-700">Imagem do banner (hero)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHeroFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
                    disabled={siteSaving}
                  />
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
        </section>

        <section className="mb-8 rounded-2xl border border-[#6B705C]/35 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-xl text-[#6B705C] md:text-2xl">Bônus por kit</h2>
          <p className="mb-4 mt-1 text-sm text-zinc-600">
            Escolha o produto principal (kit). Os bônus marcados liberam automaticamente quando a cliente comprar esse kit.
          </p>
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
            <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-100 p-3">
              {bonusOnlyProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
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
        </section>

        <section className="mb-8 rounded-2xl border border-[#6B705C]/35 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#6B705C]" />
            <h2 className="font-serif text-2xl text-[#6B705C]">Notificações do app</h2>
          </div>
          <p className="mb-4 text-sm text-zinc-600">
            Os avisos aparecem na página aberta pelo ícone de sino no app (dashboard e comunidade).
          </p>

          <form onSubmit={handlePublishNotification} className="mb-6 space-y-3">
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

          <div className="border-t border-zinc-200 pt-4">
            <p className="mb-3 text-sm font-medium text-zinc-700">Histórico</p>
            {notifLoading ? (
              <p className="text-sm text-zinc-500">Carregando...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma notificação enviada ainda.</p>
            ) : (
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-[#F7F5F0] px-3 py-2"
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
                      className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingNotifId === n.id ? "..." : "Excluir"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-live="polite">
            <div className="flex items-center gap-2 text-sm text-[#6B705C]">
              <Spinner className="size-5 shrink-0" />
              Carregando catálogo de produtos...
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                >
                  <Skeleton className="h-28 w-full rounded-none bg-zinc-200/90" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-4/5 bg-zinc-200/80" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1 bg-zinc-200/70" />
                      <Skeleton className="h-8 flex-1 bg-zinc-200/70" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sortedProducts.map((product) => {
              const imageSrc =
                product.image_url ||
                product.image ||
                product.thumbnail_url ||
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop";
              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-sm"
                >
                  <img
                    src={imageSrc}
                    alt={product.name || "Produto"}
                    className="h-28 w-full object-cover"
                  />
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-zinc-900">
                      {product.name || product.title || "Sem nome"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-[#6B705C]/50 px-2.5 text-xs text-[#6B705C] hover:bg-[#6B705C]/10"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingId === product.id}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-red-300/80 px-2.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
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
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div
          className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/55 px-4 py-8 transition-opacity duration-200 ${
            isModalVisible ? "opacity-100" : "opacity-0"
          }`}
          role="presentation"
        >
          <section
            className={`relative mx-auto w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl transition-all duration-200 md:p-7 ${
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

            <header className="mb-5 pr-10">
              <h2 id="admin-product-modal-title" className="font-serif text-3xl text-[#6B705C]">
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
                <label className="text-sm text-zinc-700">Descrição (editor)</label>
                <AdminRichTextEditor value={description} onChange={setDescription} disabled={saving} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Arquivo de Vídeo</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Link do Produto (compra / checkout)</label>
                <input
                  type="url"
                  value={linkCompra}
                  onChange={(e) => setLinkCompra(e.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">ID do produto na loja (Cakto / checkout)</label>
                <input
                  type="text"
                  value={externalSalesId}
                  onChange={(e) => setExternalSalesId(e.target.value)}
                  placeholder="Deve bater com o ID enviado pelo webhook"
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                />
                <p className="text-[11px] text-zinc-500">
                  Opcional. Use o mesmo valor que a plataforma de vendas envia em <code className="rounded bg-zinc-100 px-1">product.id</code> para
                  casar a compra com este item.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Imagem de capa (envie do seu computador)</label>
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
