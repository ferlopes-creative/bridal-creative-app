import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  ImagePlus,
  Lock,
  Plus,
  Reply,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import BottomAppNav from "@/components/BottomAppNav";
import BrandLogo from "@/components/BrandLogo";
import PageBackgroundTexture from "@/components/PageBackgroundTexture";
import { useNotificationBellBadge } from "@/hooks/useNotificationBellBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAppAccessState } from "@/contexts/AppAccessContext";
import { useCommunityAccess } from "@/contexts/CommunityAccessContext";
import { useSiteSettings, resolveCommunityBackground } from "@/contexts/SiteSettingsContext";
import { readLocalCache, writeLocalCache } from "@/lib/localCache";
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
const CHAT_CACHE_KEY = "chat_v1";

type ChatCache = {
  comments: ChatComment[];
  likes: { comment_id: string; user_id: string }[];
};

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
  likesByComment: Map<string, { count: number; likedByMe: boolean }>;
  onToggleLike: (commentId: string) => void;
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
  likesByComment,
  onToggleLike,
}: CommentNodeProps) {
  const replies = repliesByParent.get(item.id) ?? [];
  const isReplying = replyingToId === item.id;
  const isRoot = depth === 0;
  const [threadOpen, setThreadOpen] = useState(true);
  const replyCountTotal = isRoot ? countThreadReplies(item.id, repliesByParent) : 0;

  const replyForm = isReplying ? (
    <form
      className="space-y-2 rounded-lg border border-bc-primary/30 bg-white p-3 shadow-sm"
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
        className="min-h-20 w-full min-w-0 rounded-md border border-[#d7d9d2] bg-white px-3 py-2 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-bc-primary/25"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={Boolean(submittingReplyTo) || !replyText.trim()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-bc-primary px-4 text-sm text-white disabled:opacity-60"
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

  const initial = (item.name || "?").trim().charAt(0).toUpperCase();
  const likeState = likesByComment.get(item.id) ?? { count: 0, likedByMe: false };

  const authorBlock = (
    <div className="mb-1.5 flex min-w-0 items-center gap-2">
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-bc-primary/15 font-semibold text-bc-primary ${
          isRoot ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs"
        }`}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <p className="text-sm font-semibold break-words text-zinc-900 [overflow-wrap:anywhere] [word-break:break-word]">
            {item.name}
          </p>
          <span className="text-xs text-zinc-400">·</span>
          <p className="text-xs text-zinc-400">{formatTime(item.created_at)}</p>
        </div>
      </div>
    </div>
  );

  const bodyBlock = (
    <>
      {item.image_url && (
        <div className="mb-2 overflow-hidden bg-zinc-50">
          <img
            src={item.image_url}
            alt={`Imagem enviada por ${item.name}`}
            className="aspect-square w-full object-cover"
          />
        </div>
      )}
      <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 [overflow-wrap:anywhere] [word-break:break-word]">
        {item.comment}
      </p>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleLike(item.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:bg-bc-primary/10 ${
            likeState.likedByMe ? "text-bc-primary" : "text-zinc-500 hover:text-bc-primary"
          }`}
        >
          <Heart
            className="h-3.5 w-3.5"
            strokeWidth={2}
            fill={likeState.likedByMe ? "currentColor" : "none"}
          />
          {likeState.count > 0 ? likeState.count : "Curtir"}
        </button>
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
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-bc-primary/10 hover:text-bc-primary"
        >
          <Reply className="h-3.5 w-3.5" strokeWidth={2} />
          Comentar
        </button>
      </div>
    </>
  );

  if (isRoot) {
    return (
      <div>
        <div className="px-4 py-3">
          {authorBlock}
          {bodyBlock}
        </div>

        {replyForm && <div className="border-t border-zinc-100 bg-[#fafbf8] px-4 py-3">{replyForm}</div>}

        {replies.length > 0 && (
          <div className="border-t border-zinc-100 px-4">
            <button
              type="button"
              onClick={() => setThreadOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 py-2.5 text-left text-xs font-medium text-bc-primary transition-colors hover:text-bc-primary/80"
            >
              {threadOpen ? (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              {threadOpen ? "Ocultar respostas" : "Ver respostas"}
              <span className="font-normal text-zinc-400">
                ({replyCountTotal})
              </span>
            </button>

            {threadOpen && (
              <div className="space-y-3 pb-3">
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
                    likesByComment={likesByComment}
                    onToggleLike={onToggleLike}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-zinc-100 pl-3">
      <article className="w-full min-w-0 max-w-full overflow-x-hidden">
        {authorBlock}
        {bodyBlock}
      </article>

      {replyForm && <div className="mt-2">{replyForm}</div>}

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
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
              likesByComment={likesByComment}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Community() {
  const [, setLocation] = useLocation();
  const { settings } = useSiteSettings();
  const { hasUnread } = useNotificationBellBadge();
  const pageBgUrl = resolveCommunityBackground(settings);
  const logoUrl = settings.logo_url;
  const { authSession, session } = useAppAccessState();
  const { canOpenCommunity } = useCommunityAccess();
  const currentUserId = session?.user.id ?? null;
  const accessLoading = authSession === null;
  const chatCache = readLocalCache<ChatCache>(CHAT_CACHE_KEY);
  const [comments, setComments] = useState<ChatComment[]>(chatCache?.comments ?? []);
  const [likes, setLikes] = useState<{ comment_id: string; user_id: string }[]>(chatCache?.likes ?? []);
  const [loading, setLoading] = useState(chatCache == null);
  const chatCacheRef = useRef<ChatCache>(chatCache ?? { comments: [], likes: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
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
    const registeredName = (session?.user.user_metadata?.display_name as string | undefined)?.trim();
    if (registeredName) setName(registeredName);
  }, [session]);

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
      chatCacheRef.current = { ...chatCacheRef.current, comments: normalized };
      writeLocalCache(CHAT_CACHE_KEY, chatCacheRef.current);
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  const fetchLikes = useCallback(async () => {
    const { data, error } = await supabase.from("community_comment_likes").select("comment_id, user_id");
    if (error) {
      if (!error.message?.includes("community_comment_likes")) {
        console.error("Erro ao carregar curtidas:", error);
      }
      return;
    }
    const normalized = (data || []).map((item: Record<string, unknown>) => ({
      comment_id: String(item.comment_id),
      user_id: String(item.user_id),
    }));
    setLikes(normalized);
    chatCacheRef.current = { ...chatCacheRef.current, likes: normalized };
    writeLocalCache(CHAT_CACHE_KEY, chatCacheRef.current);
  }, []);

  useEffect(() => {
    if (accessLoading || !canOpenCommunity) {
      setLoading(false);
      return;
    }

    fetchComments({ silent: chatCacheRef.current.comments.length > 0 });
    fetchLikes();

    const channel = supabase
      .channel("community-comments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        () => fetchComments({ silent: true })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_comment_likes" },
        () => fetchLikes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accessLoading, canOpenCommunity, fetchComments, fetchLikes]);

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

  const likesByComment = useMemo(() => {
    const map = new Map<string, { count: number; likedByMe: boolean }>();
    for (const like of likes) {
      const entry = map.get(like.comment_id) ?? { count: 0, likedByMe: false };
      entry.count += 1;
      if (currentUserId && like.user_id === currentUserId) entry.likedByMe = true;
      map.set(like.comment_id, entry);
    }
    return map;
  }, [likes, currentUserId]);

  const toggleLike = useCallback(
    async (commentId: string) => {
      if (!currentUserId) return;
      const alreadyLiked = likes.some(
        (l) => l.comment_id === commentId && l.user_id === currentUserId
      );

      if (alreadyLiked) {
        setLikes((prev) => prev.filter((l) => !(l.comment_id === commentId && l.user_id === currentUserId)));
        const { error } = await supabase
          .from("community_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);
        if (error) {
          console.error("Erro ao descurtir:", error);
          void fetchLikes();
        }
      } else {
        setLikes((prev) => [...prev, { comment_id: commentId, user_id: currentUserId }]);
        const { error } = await supabase
          .from("community_comment_likes")
          .insert({ comment_id: commentId, user_id: currentUserId });
        if (error) {
          console.error("Erro ao curtir:", error);
          if (error.message?.includes("community_comment_likes")) {
            toast.error(
              "Coluna/tabela de curtidas ausente. Execute a migração 20260804140000_community_comment_likes.sql no Supabase."
            );
          }
          void fetchLikes();
        }
      }
    },
    [currentUserId, likes, fetchLikes]
  );

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
    setComposeOpen(false);
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-bc-page-bg pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <PageBackgroundTexture imageUrl={pageBgUrl} settings={settings} />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-5">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center">
            <BrandLogo src={logoUrl} className="max-h-14 max-w-14 object-contain" />
          </div>
          <button
            type="button"
            onClick={() => setLocation("/notifications")}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-bc-primary transition-colors hover:bg-bc-primary/10"
            aria-label="Notificações"
          >
            <Bell className="h-6 w-6" />
            {hasUnread && (
              <span
                className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-bc-page-bg"
                aria-hidden
              />
            )}
          </button>
        </header>

        <div className="mb-4 flex items-center justify-between rounded-[2px] border border-bc-primary/15 bg-white p-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-1 text-bc-primary"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-base" style={{ fontFamily: "var(--font-display)" }}>
              Chat
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-full border border-bc-primary/25 px-3 py-1 text-sm text-bc-primary disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </div>

        {refreshing && (
          <div
            className="mb-3 flex items-center gap-2 rounded-lg border border-bc-primary/15 bg-white px-3 py-2 text-xs text-bc-primary"
            role="status"
            aria-live="polite"
          >
            <Spinner className="size-3.5 shrink-0" />
            Atualizando mensagens...
          </div>
        )}

        {showFilters && (
          <section className="mb-4 space-y-3 rounded-[2px] border border-bc-primary/15 bg-white p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou comentário"
              className="h-10 w-full rounded-md border border-[#d7d9d2] bg-white px-3 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-bc-primary/25"
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

        {!accessLoading && !canOpenCommunity && (
          <section className="mb-5 rounded-[2px] border border-bc-primary/15 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-bc-primary/12 p-2">
                <Lock className="h-5 w-5 text-bc-primary" />
              </div>
              <div>
                <h2
                  className="text-base font-semibold leading-snug text-[#4c4f46]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Conecte-se com noivas que vivem o mesmo momento que você!
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-bc-primary">
                  Nossa comunidade é exclusiva para clientes Bridal Creative. Realize sua primeira compra e o
                  acesso é liberado na hora.
                </p>
              </div>
            </div>
          </section>
        )}

        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogContent showCloseButton className="max-w-md gap-0 overflow-hidden rounded-[2px] border border-bc-primary/15 bg-white p-0">
            <div className="relative p-4" aria-busy={submitting}>
              <DialogTitle
                className="mb-3 text-base font-semibold text-bc-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Nova publicação
              </DialogTitle>
              {submitting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2px] bg-white/85 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-2 rounded-[2px] border border-bc-primary/20 bg-white px-6 py-4 shadow-sm">
                    <Spinner className="size-9 text-bc-primary" />
                    <span className="text-xs font-medium tracking-wide text-bc-primary">Enviando comentário...</span>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className={`space-y-3 ${submitting ? "pointer-events-none" : ""}`}>
                <div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => persistDisplayName(name)}
                    placeholder="Nome"
                    disabled={loading || submitting}
                    autoComplete="name"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-bc-primary/25 disabled:bg-zinc-50"
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
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-white px-3 text-sm text-bc-primary transition-colors hover:border-bc-primary/50 hover:bg-bc-primary/5 disabled:bg-zinc-50"
                    >
                      <ImagePlus className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.5} />
                      Adicionar foto (opcional)
                    </button>
                  ) : (
                    <div className="relative overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                      <img src={imagePreviewUrl} alt="" className="max-h-40 w-full object-contain" />
                      <button
                        type="button"
                        onClick={clearChosenImage}
                        disabled={loading || submitting}
                        className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-bc-primary shadow-sm ring-1 ring-black/5 hover:bg-white disabled:opacity-50"
                        aria-label="Remover imagem"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <p className="border-t border-zinc-100 bg-white px-3 py-2 text-[11px] text-zinc-500">
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
                  autoFocus
                  className="min-h-22 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-[#4c4f46] outline-none focus:ring-2 focus:ring-bc-primary/25 disabled:bg-zinc-50"
                />
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-bc-primary px-4 text-sm tracking-wide text-white disabled:opacity-70"
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
            </div>
          </DialogContent>
        </Dialog>

        <section className="space-y-3" aria-busy={loading || accessLoading}>
          {accessLoading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2px] border border-bc-primary/20 bg-white/80 py-10">
              <Spinner className="size-11 text-bc-primary" />
              <p className="text-sm font-medium text-bc-primary">Verificando acesso ao chat...</p>
            </div>
          )}
          {loading && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-3 rounded-[2px] border border-bc-primary/20 bg-white/80 py-10">
                <Spinner className="size-11 text-bc-primary" />
                <p className="text-sm font-medium text-bc-primary">Carregando mensagens...</p>
                <p className="max-w-xs text-center text-xs text-bc-primary/70">
                  Aguarde enquanto buscamos o histórico do chat.
                </p>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((key) => (
                  <div key={key} className="rounded-[2px] border border-bc-primary/20 bg-white/70 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Skeleton className="size-8 shrink-0 rounded-full bg-bc-primary/15" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28 bg-bc-primary/15" />
                        <Skeleton className="h-3 w-20 bg-bc-primary/10" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-full bg-bc-primary/10" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!accessLoading && canOpenCommunity && !loading && filteredRoots.length === 0 && (
            <p className="text-sm text-bc-primary">Sem comentários para os filtros selecionados.</p>
          )}

          {!accessLoading && canOpenCommunity && !loading && filteredRoots.length > 0 && (
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-[2px] border border-bc-primary/15 bg-white">
              {filteredRoots.map((root) => (
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
                  likesByComment={likesByComment}
                  onToggleLike={toggleLike}
                />
              ))}
            </div>
          )}
        </section>

        {canOpenCommunity && (
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="fixed right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-bc-primary text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.97] md:right-6"
            style={{ bottom: "max(6.25rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
            aria-label="Nova publicação"
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <BottomAppNav />
    </div>
  );
}
