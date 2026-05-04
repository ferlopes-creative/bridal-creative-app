import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Filter,
  ImagePlus,
  MessageCirclePlus,
  MessageSquareText,
  Reply,
  X,
} from "lucide-react";
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
const DISPLAY_NAME_STORAGE_KEY = "bridal_community_display_name";

type ChatComment = {
  id: string;
  parent_id: string | null;
  name: string;
  comment: string;
  image_url: string | null;
  created_at: string;
};

type TimeFilter = "all" | "today" | "week" | "month";
type ImageFilter = "all" | "with_image" | "without_image";

const TABLE_NAME = "community_comments";

function persistDisplayName(value: string) {
  const t = value.trim();
  if (!t) return;
  try {
    localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, t);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Total de respostas debaixo deste comentário (todos os níveis). */
function countThreadReplies(parentId: string, repliesByParent: Map<string, ChatComment[]>): number {
  const direct = repliesByParent.get(parentId) ?? [];
  let n = direct.length;
  for (const r of direct) {
    n += countThreadReplies(r.id, repliesByParent);
  }
  return n;
}

type CommentNodeProps = {
  item: ChatComment;
  depth: number;
  repliesByParent: Map<string, ChatComment[]>;
  formatTime: (iso: string) => string;
  nameForReply: string;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  replyText: string;
  setReplyText: (t: string) => void;
  onReplySubmit: (parentId: string) => void;
  submittingReplyTo: string | null;
};

function CommentNode({
  item,
  depth,
  repliesByParent,
  formatTime,
  nameForReply,
  replyingToId,
  setReplyingToId,
  replyText,
  setReplyText,
  onReplySubmit,
  submittingReplyTo,
}: CommentNodeProps) {
  const replies = repliesByParent.get(item.id) ?? [];
  const isReplying = replyingToId === item.id;
  const isRoot = depth === 0;
  const [threadOpen, setThreadOpen] = useState(true);
  const replyCountTotal = isRoot ? countThreadReplies(item.id, repliesByParent) : 0;

  const replyForm = isReplying ? (
    <form
      className="space-y-2 rounded-lg border border-[#6B705C]/30 bg-white p-3 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onReplySubmit(item.id);
      }}
    >
      <p className="text-[11px] leading-snug text-zinc-500">
        O nome usado será o do formulário no topo do Chat
        {nameForReply.trim() ? (
          <>
            : <span className="font-medium text-zinc-700">{nameForReply.trim()}</span>
          </>
        ) : (
          <> (preencha o campo Nome acima)</>
        )}
        .
      </p>
      <textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Escreva a sua resposta…"
        rows={3}
        className="min-h-20 w-full min-w-0 rounded-md border border-[#d7d9d2] bg-white px-3 py-2 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-[#6B705C]/25"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={Boolean(submittingReplyTo) || !replyText.trim()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#6B705C] px-4 text-sm text-white disabled:opacity-60"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {submittingReplyTo === item.id ? (
            <>
              <Spinner className="size-4 text-white" />
              A enviar…
            </>
          ) : (
            "Enviar resposta"
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setReplyingToId(null);
            setReplyText("");
          }}
          className="inline-flex h-9 items-center rounded-md border border-[#d7d9d2] bg-white px-4 text-sm text-[#4c4f46]"
        >
          Cancelar
        </button>
      </div>
    </form>
  ) : null;

  const authorBlock = (
    <div className="mb-2 flex min-w-0 items-start gap-2">
      <CircleUserRound
        className={`shrink-0 text-[#6B705C] ${isRoot ? "h-9 w-9" : "h-7 w-7"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold break-words text-zinc-900 [overflow-wrap:anywhere] [word-break:break-word]">
            {item.name}
          </p>
          {!isRoot && (
            <span className="inline-flex items-center rounded-full bg-[#6B705C]/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#4e563f]">
              Resposta
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{formatTime(item.created_at)}</p>
      </div>
    </div>
  );

  const bodyBlock = (
    <>
      {item.image_url && (
        <div className="mb-2 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
          <img
            src={item.image_url}
            alt={`Imagem enviada por ${item.name}`}
            className="h-44 w-full object-cover"
          />
        </div>
      )}
      <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 [overflow-wrap:anywhere] [word-break:break-word]">
        {item.comment}
      </p>
      <div className="mt-3 flex justify-end border-t border-[#6B705C]/10 pt-2">
        <button
          type="button"
          onClick={() => {
            if (isReplying) {
              setReplyingToId(null);
              setReplyText("");
            } else {
              setReplyingToId(item.id);
              setReplyText("");
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#6B705C] transition-colors hover:bg-[#6B705C]/12"
        >
          <Reply className="h-3.5 w-3.5" strokeWidth={2} />
          Responder
        </button>
      </div>
    </>
  );

  if (isRoot) {
    return (
      <div className="mb-4 overflow-hidden rounded-2xl border border-[#6B705C]/35 bg-white shadow-md ring-1 ring-black/[0.04]">
        <div className="border-b border-[#6B705C]/12 bg-gradient-to-b from-white to-[#faf9f6] px-3 py-3 md:px-4 md:py-4">
          <div className="mb-2 flex items-center gap-2 text-[#6B705C]">
            <MessageSquareText className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase">Publicação</span>
          </div>
          {authorBlock}
          {bodyBlock}
        </div>

        {replyForm && <div className="border-b border-[#6B705C]/12 bg-[#f7f6f2] px-3 py-3 md:px-4">{replyForm}</div>}

        {replies.length > 0 && (
          <div className="bg-[#eef0e8]/90">
            <button
              type="button"
              onClick={() => setThreadOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#6B705C]/10 md:px-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#6B705C]/20">
                {threadOpen ? (
                  <ChevronDown className="h-4 w-4 text-[#6B705C]" strokeWidth={2.5} />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#6B705C]" strokeWidth={2.5} />
                )}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#4a5342]">
                {threadOpen ? "Ocultar respostas" : "Ver respostas"}
                <span className="ml-2 font-normal text-zinc-500">
                  ({replyCountTotal} {replyCountTotal === 1 ? "resposta" : "respostas"})
                </span>
              </span>
            </button>

            {threadOpen && (
              <div className="border-t border-[#6B705C]/15 bg-[#e8eae3]/65 px-3 pb-4 pt-1 md:px-4">
                <p className="mb-3 mt-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#6B705C]">
                  <span className="h-px flex-1 bg-[#6B705C]/25" aria-hidden />
                  <span className="shrink-0 uppercase">Na mesma conversa</span>
                  <span className="h-px flex-1 bg-[#6B705C]/25" aria-hidden />
                </p>
                <div className="relative pl-2">
                  <div
                    className="absolute top-1 bottom-1 left-[11px] w-[3px] rounded-full bg-[#8f9a82]/50"
                    aria-hidden
                  />
                  <div className="relative space-y-3 pl-6">
                    {replies.map((r) => (
                      <CommentNode
                        key={r.id}
                        item={r}
                        depth={1}
                        repliesByParent={repliesByParent}
                        formatTime={formatTime}
                        nameForReply={nameForReply}
                        replyingToId={replyingToId}
                        setReplyingToId={setReplyingToId}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onReplySubmit={onReplySubmit}
                        submittingReplyTo={submittingReplyTo}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={depth >= 2 ? "relative border-l-2 border-[#b8c4a8]/90 pl-3" : "relative"}>
      <article
        className={`w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border p-3 shadow-sm ${
          depth === 1
            ? "border-[#8f9a82]/50 bg-white ring-1 ring-[#6B705C]/15"
            : "border-[#6B705C]/25 bg-[#fcfcfa] ring-1 ring-black/[0.03]"
        }`}
      >
        {authorBlock}
        {bodyBlock}
      </article>

      {replyForm && <div className="mt-2">{replyForm}</div>}

      {replies.map((r) => (
        <CommentNode
          key={r.id}
          item={r}
          depth={depth + 1}
          repliesByParent={repliesByParent}
          formatTime={formatTime}
          nameForReply={nameForReply}
          replyingToId={replyingToId}
          setReplyingToId={setReplyingToId}
          replyText={replyText}
          setReplyText={setReplyText}
          onReplySubmit={onReplySubmit}
          submittingReplyTo={submittingReplyTo}
        />
      ))}
    </div>
  );
}

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

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReplyTo, setSubmittingReplyTo] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("all");

  useEffect(() => {
    try {
      const cached = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
      if (cached) setName(cached);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchComments = useCallback(async (opts?: { silent?: boolean }) => {
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

      const normalized = (data || []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        parent_id: item.parent_id != null ? String(item.parent_id) : null,
        name: String(item.name ?? "Sem nome"),
        comment: String(item.comment ?? item.text ?? ""),
        image_url: (item.image_url as string | null) ?? null,
        created_at: String(item.created_at ?? new Date().toISOString()),
      }));

      setComments(normalized);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

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
  }, [fetchComments]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const { roots, repliesByParent } = useMemo(() => {
    const repliesByParent = new Map<string, ChatComment[]>();
    const roots: ChatComment[] = [];
    for (const c of comments) {
      if (c.parent_id) {
        const list = repliesByParent.get(c.parent_id) ?? [];
        list.push(c);
        repliesByParent.set(c.parent_id, list);
      } else {
        roots.push(c);
      }
    }
    for (const list of Array.from(repliesByParent.values())) {
      list.sort(
        (a: ChatComment, b: ChatComment) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { roots, repliesByParent };
  }, [comments]);

  const filteredRoots = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = query.trim().toLowerCase();

    const nodeMatches = (c: ChatComment) =>
      !normalizedQuery ||
      c.name.toLowerCase().includes(normalizedQuery) ||
      c.comment.toLowerCase().includes(normalizedQuery);

    const threadMatches = (root: ChatComment): boolean => {
      if (nodeMatches(root)) return true;
      const stack = [root.id];
      while (stack.length) {
        const id = stack.pop()!;
        for (const c of repliesByParent.get(id) ?? []) {
          if (nodeMatches(c)) return true;
          stack.push(c.id);
        }
      }
      return false;
    };

    return roots.filter((item) => {
      const created = new Date(item.created_at).getTime();
      const ageMs = now - created;

      const matchesQuery = threadMatches(item);

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
  }, [roots, repliesByParent, query, timeFilter, imageFilter]);

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

  const handleReplySubmit = useCallback(
    async (parentId: string) => {
      if (!name.trim() || !replyText.trim()) {
        toast.error("Preencha o nome no topo e a resposta.");
        return;
      }

      setSubmittingReplyTo(parentId);
      const { error } = await supabase.from(TABLE_NAME).insert({
        name: name.trim(),
        comment: replyText.trim(),
        image_url: null,
        parent_id: parentId,
      });

      if (error) {
        console.error("Erro ao responder:", error);
        if (error.code === "PGRST204" || error.message?.includes("parent_id")) {
          toast.error(
            "Coluna parent_id em falta. Execute a migração SQL mais recente em supabase/migrations no Supabase."
          );
        } else if (error.code === "PGRST205") {
          toast.error(
            "Tabela community_comments não existe no Supabase. Rode o SQL em supabase/migrations no SQL Editor."
          );
        } else {
          toast.error(error.message || "Não foi possível enviar a resposta.");
        }
        setSubmittingReplyTo(null);
        return;
      }

      persistDisplayName(name.trim());
      setReplyText("");
      setReplyingToId(null);
      setSubmittingReplyTo(null);
      toast.success("Resposta enviada.");
      await fetchComments({ silent: true });
    },
    [name, replyText, fetchComments]
  );

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
      parent_id: null as string | null,
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

    persistDisplayName(name.trim());
    setCommentText("");
    clearChosenImage();
    setSubmitting(false);
    toast.success("Comentário enviado.");
  };

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
              <span
                className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#FBFAF6]"
                aria-hidden
              />
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
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => persistDisplayName(name)}
                placeholder="Nome"
                disabled={loading || submitting}
                autoComplete="name"
                className="h-10 w-full rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-[#6B705C]/25 disabled:bg-zinc-50"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Guardado neste dispositivo para não precisar repetir; pode alterar quando quiser.
              </p>
            </div>
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
                  <img src={imagePreviewUrl} alt="" className="max-h-40 w-full object-contain" />
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
              placeholder="Nova postagem"
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
                "Publicar"
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
                  <div key={key} className="rounded-2xl border border-[#6B705C]/20 bg-white/70 p-4">
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

          {!loading && filteredRoots.length === 0 && (
            <p className="text-sm text-[#6B705C]">Sem comentários para os filtros selecionados.</p>
          )}

          {!loading &&
            filteredRoots.map((root) => (
              <CommentNode
                key={root.id}
                item={root}
                depth={0}
                repliesByParent={repliesByParent}
                formatTime={formatTime}
                nameForReply={name}
                replyingToId={replyingToId}
                setReplyingToId={setReplyingToId}
                replyText={replyText}
                setReplyText={setReplyText}
                onReplySubmit={handleReplySubmit}
                submittingReplyTo={submittingReplyTo}
              />
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
