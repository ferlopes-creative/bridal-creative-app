import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronLeft, CircleUserRound, Filter, ImagePlus, MessageCirclePlus, X } from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSiteSettings, resolveAppPageBackground } from "@/contexts/SiteSettingsContext";
import { safeStorageObjectName } from "@/lib/safeStorageKey";

const IMAGE_BUCKET = import.meta.env.VITE_SUPABASE_IMAGE_BUCKET || "product-images";

type ChatComment = {
  id: string;
  name: string;
  comment: string;
  image_url: string | null;
  created_at: string;
};

type TimeFilter = "all" | "today" | "week" | "month";
type ImageFilter = "all" | "with_image" | "without_image";

const TABLE_NAME = "community_comments";

export default function Community() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const { hasUnread } = useNotificationBellBadge();
  const pageBgUrl = resolveAppPageBackground(settings);
  const logoUrl = settings.logo_url;
  const [comments, setComments] = useState<ChatComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("all");

  const fetchComments = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar comentários:", error);
        return;
      }

      const normalized = (data || []).map((item: any) => ({
        id: String(item.id),
        name: item.name || "Sem nome",
        comment: item.comment || item.text || "",
        image_url: item.image_url || null,
        created_at: item.created_at || new Date().toISOString(),
      }));

      setComments(normalized);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel("community-comments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        () => fetchComments({ silent: true })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const clearChosenImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (JPG, PNG, WebP…).");
      e.target.value = "";
      return;
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Imagem muito grande. Use até 8 MB.");
      e.target.value = "";
      return;
    }
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const uploadCommunityImage = async (file: File): Promise<string> => {
    const fileName = safeStorageObjectName(file);
    const filePath = `images/community/${fileName}`;
    const { data, error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) throw uploadError;
    if (!data?.path) throw new Error("Upload sem path.");

    const { data: publicData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commentText.trim()) return;

    setSubmitting(true);
    let image_url: string | null = null;

    if (imageFile) {
      try {
        image_url = await uploadCommunityImage(imageFile);
      } catch (err) {
        console.error("Upload imagem chat:", err);
        toast.error(
          "Não foi possível enviar a imagem. Confira o Storage no Supabase e as permissões do bucket."
        );
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      comment: commentText.trim(),
      image_url,
    };

    const { error } = await supabase.from(TABLE_NAME).insert(payload);
    if (error) {
      console.error("Erro ao criar comentário:", error);
      if (error.code === "PGRST205") {
        toast.error(
          "Tabela community_comments não existe no Supabase. Rode o SQL em supabase/migrations no SQL Editor."
        );
      } else {
        toast.error(error.message || "Não foi possível enviar o comentário.");
      }
      setSubmitting(false);
      return;
    }

    setCommentText("");
    clearChosenImage();
    setSubmitting(false);
    toast.success("Comentário enviado.");
  };

  const filteredComments = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = query.trim().toLowerCase();

    return comments.filter((item) => {
      const created = new Date(item.created_at).getTime();
      const ageMs = now - created;

      const matchesQuery =
        !normalizedQuery ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.comment.toLowerCase().includes(normalizedQuery);

      const matchesTime =
        timeFilter === "all" ||
        (timeFilter === "today" && ageMs <= 24 * 60 * 60 * 1000) ||
        (timeFilter === "week" && ageMs <= 7 * 24 * 60 * 60 * 1000) ||
        (timeFilter === "month" && ageMs <= 30 * 24 * 60 * 60 * 1000);

      const hasImage = Boolean(item.image_url);
      const matchesImage =
        imageFilter === "all" ||
        (imageFilter === "with_image" && hasImage) ||
        (imageFilter === "without_image" && !hasImage);

      return matchesQuery && matchesTime && matchesImage;
    });
  }, [comments, query, timeFilter, imageFilter]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FBFAF6] pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url(${pageBgUrl})`,
          backgroundSize: "360px auto",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-14 max-w-14 object-contain" />
          </div>
          <button
            type="button"
            onClick={() => setLocation("/notifications")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6B705C] transition-colors hover:bg-[#6B705C]/10"
            aria-label="Notificações"
          >
            <Bell className="h-6 w-6" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#FBFAF6]" aria-hidden />
            )}
          </button>
        </header>

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#6B705C]/40 bg-white/70 p-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-1 text-[#6B705C]"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Chat
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[#6B705C]/40 px-3 py-1 text-sm text-[#6B705C] disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </div>

        {refreshing && (
          <div
            className="mb-3 flex items-center gap-2 rounded-lg border border-[#6B705C]/25 bg-white/90 px-3 py-2 text-xs text-[#6B705C]"
            role="status"
            aria-live="polite"
          >
            <Spinner className="size-3.5 shrink-0" />
            Atualizando mensagens...
          </div>
        )}

        {showFilters && (
          <section className="mb-4 space-y-3 rounded-2xl border border-[#6B705C]/35 bg-white/75 p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou comentário"
              className="h-10 w-full rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-[#6B705C]/25"
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="h-10 rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none"
              >
                <option value="all">Período: Todos</option>
                <option value="today">Últimas 24h</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Últimos 30 dias</option>
              </select>
              <select
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value as ImageFilter)}
                className="h-10 rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none"
              >
                <option value="all">Imagem: Todos</option>
                <option value="with_image">Com imagem</option>
                <option value="without_image">Sem imagem</option>
              </select>
            </div>
          </section>
        )}

        <section
          className="relative mb-5 rounded-2xl border border-[#6B705C]/35 bg-white/75 p-3"
          aria-busy={submitting || loading}
        >
          <form onSubmit={handleSubmit} className={`space-y-3 ${submitting ? "pointer-events-none" : ""}`}>
            {submitting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-2 rounded-xl border border-[#6B705C]/20 bg-white px-6 py-4 shadow-sm">
                  <Spinner className="size-9 text-[#6B705C]" />
                  <span className="text-xs font-medium tracking-wide text-[#6B705C]">Enviando comentário...</span>
                </div>
              </div>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              disabled={loading || submitting}
              className="h-10 w-full rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-[#6B705C]/25 disabled:bg-zinc-50"
            />
            <div className="space-y-2">
              <input
                id="community-chat-image"
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onImageFileChange}
                disabled={loading || submitting}
              />
              {!imagePreviewUrl ? (
                <button
                  type="button"
                  disabled={loading || submitting}
                  onClick={() => imageInputRef.current?.click()}
                  aria-controls="community-chat-image"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#b8baa8] bg-white px-3 text-sm text-[#6B705C] transition-colors hover:border-[#6B705C]/50 hover:bg-[#6B705C]/5 disabled:bg-zinc-50"
                >
                  <ImagePlus className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
                  Adicionar foto (opcional)
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-md border border-[#d7d9d2] bg-zinc-50">
                  <img
                    src={imagePreviewUrl}
                    alt=""
                    className="max-h-40 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearChosenImage}
                    disabled={loading || submitting}
                    className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#6B705C] shadow-sm ring-1 ring-black/5 hover:bg-white disabled:opacity-50"
                    aria-label="Remover imagem"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <p className="border-t border-[#e8e8e3] bg-white px-3 py-2 text-[11px] text-zinc-500">
                    Foto será enviada ao publicar o comentário.
                  </p>
                </div>
              )}
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Comentário"
              disabled={loading || submitting}
              className="min-h-22 w-full rounded-md border border-[#d7d9d2] bg-white px-3 py-2 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-[#6B705C]/25 disabled:bg-zinc-50"
            />
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#6B705C] px-4 text-sm tracking-wide text-white disabled:opacity-70 sm:w-auto"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {submitting ? (
                <>
                  <Spinner className="size-4 text-white" />
                  Enviando...
                </>
              ) : (
                "Comentar"
              )}
            </button>
          </form>
        </section>

        <section className="space-y-3" aria-busy={loading}>
          {loading && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#6B705C]/20 bg-white/80 py-10">
                <Spinner className="size-11 text-[#6B705C]" />
                <p className="text-sm font-medium text-[#6B705C]">Carregando mensagens...</p>
                <p className="max-w-xs text-center text-xs text-[#6B705C]/70">
                  Aguarde enquanto buscamos o histórico do chat.
                </p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-[#6B705C]/20 bg-white/70 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Skeleton className="size-8 shrink-0 rounded-full bg-[#6B705C]/15" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28 bg-[#6B705C]/15" />
                        <Skeleton className="h-3 w-20 bg-[#6B705C]/10" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-full bg-[#6B705C]/10" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && filteredComments.length === 0 && (
            <p className="text-sm text-[#6B705C]">Sem comentários para os filtros selecionados.</p>
          )}

          {!loading &&
            filteredComments.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#6B705C]/30 bg-white/85 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <CircleUserRound className="h-8 w-8 text-[#6B705C]" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                  <p className="text-xs text-zinc-500">{formatTime(item.created_at)}</p>
                </div>
              </div>

              {item.image_url && (
                <div className="mb-2 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                  <img
                    src={item.image_url}
                    alt={`Imagem enviada por ${item.name}`}
                    className="h-44 w-full object-cover"
                  />
                </div>
              )}

              <p className="text-sm text-zinc-700">{item.comment}</p>
            </article>
          ))}
        </section>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#6B705C]/35 bg-white text-[#6B705C] shadow-md md:right-6"
          style={{ bottom: "max(6.25rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
          aria-label="Subir ao formulário"
        >
          <MessageCirclePlus className="h-5 w-5" />
        </button>
      </div>
      <BottomAppNav />
    </div>
  );
}
