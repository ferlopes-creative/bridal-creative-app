import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Pencil, Plus, Save, Send, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
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
};

export default function AdminPage() {
  console.log("Admin Renderizado");
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
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const NOTIF_TABLE = "app_notifications";
  type AppNotif = { id: string; title: string; body: string; created_at: string };
  const [notifications, setNotifications] = useState<AppNotif[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSaving, setNotifSaving] = useState(false);
  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);

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
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

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
    folder: "images" | "videos"
  ) => {
    const fileName = `${Math.random().toString(36).substring(2)}-${file.name}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    if (!data?.path) {
      throw new Error("Upload concluido sem path retornado pelo Supabase Storage.");
    }

    if (bucket === "product-images") {
      const { data: imagePublic } = supabase.storage
        .from("product-images")
        .getPublicUrl(data.path);
      return imagePublic.publicUrl;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = existingImageUrl;
      let videoUrl = existingVideoUrl;

      if (imageFile) {
        imageUrl = await uploadFileToStorage(imageFile, IMAGE_BUCKET, "images");
      }

      if (videoFile) {
        videoUrl = await uploadFileToStorage(videoFile, VIDEO_BUCKET, "videos");
      }

      const payload = {
        name,
        description,
        link_compra: linkCompra,
        type,
        image_url: imageUrl,
        video_url: videoUrl,
      };

      const request = editingProductId
        ? supabase.from("products").update(payload).eq("id", editingProductId)
        : supabase.from("products").insert(payload);
      const { error } = await request;

      if (error) {
        throw error;
      }

      await fetchProducts();
      closeModal();
      toast.success("Produto salvo com sucesso.");
    } catch (error) {
      console.log("Erro detalhado:", error);
      console.error("Erro ao salvar produto no Supabase:", error);
      const message = error instanceof Error ? error.message : String(error);

      if (message.toLowerCase().includes("auth session missing")) {
        try {
          const fallbackPayload = {
            name,
            description,
            link_compra: linkCompra,
            type,
            image_url: existingImageUrl,
            video_url: existingVideoUrl,
          };

          const fallbackRequest = editingProductId
            ? supabase.from("products").update(fallbackPayload).eq("id", editingProductId)
            : supabase.from("products").insert(fallbackPayload);

          const { error: fallbackError } = await fallbackRequest;
          if (fallbackError) throw fallbackError;

          await fetchProducts();
          closeModal();
          toast.success("Produto salvo em modo teste (sem upload autenticado).");
        } catch (fallbackError) {
          console.log("Erro detalhado:", fallbackError);
          console.error("Falha no fallback de salvamento:", fallbackError);
          toast.error("Falha ao salvar mesmo em modo de teste.");
        }
      } else {
        toast.error("Falha ao salvar produto. Verifique os buckets e permissões.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F5F0] px-3 py-6 md:px-6">
      <section className="mx-auto w-full max-w-6xl rounded-[28px] border border-zinc-700/80 bg-[#F7F5F0] p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#6B705C]/25 bg-white/80 p-1">
              <BrandLogo className="h-full w-full" />
            </div>
            <div>
              <p className="text-sm text-zinc-700">/admin</p>
              <h1 className="font-serif text-3xl text-[#6B705C]">BC produtos</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#6B705C" }}
            >
              <Plus className="h-4 w-4" />
              Adicionar Novo Produto
            </button>
          </div>
        </div>

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
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 transition-opacity duration-200 ${
            isModalVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <section
            className={`relative w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl transition-all duration-200 md:p-7 ${
              isModalVisible ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"
            }`}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-200"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="mb-5">
              <h2 className="font-serif text-3xl text-[#6B705C]">Cadastrar Conteúdo</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Preencha os dados abaixo para cadastrar um novo conteúdo no catálogo
              </p>
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
                <label className="text-sm text-zinc-700">Descrição Detalhada</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o conteúdo"
                  className="min-h-[90px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                  required
                />
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
                <label className="text-sm text-zinc-700">Link do Produto</label>
                <input
                  type="url"
                  value={linkCompra}
                  onChange={(e) => setLinkCompra(e.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-zinc-700">Imagem de Capa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-3 file:py-1.5 file:text-white"
                />
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
