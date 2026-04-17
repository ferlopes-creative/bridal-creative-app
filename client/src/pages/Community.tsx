import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CircleUserRound, Filter, MessageCirclePlus } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

const FLORAL_BG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

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
  const [comments, setComments] = useState<ChatComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [commentText, setCommentText] = useState("");

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("all");

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar comentários:", error);
      setLoading(false);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel("community-comments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        fetchComments
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !commentText.trim()) return;

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      comment: commentText.trim(),
      image_url: imageUrl.trim() || null,
    };

    const { error } = await supabase.from(TABLE_NAME).insert(payload);
    if (error) {
      console.error("Erro ao criar comentário:", error);
      setSubmitting(false);
      return;
    }

    setCommentText("");
    setImageUrl("");
    setSubmitting(false);
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
    <div
      className="min-h-screen w-full pb-28"
      style={{
        backgroundImage: `url(${FLORAL_BG})`,
        backgroundSize: "380px auto",
        backgroundRepeat: "repeat",
        backgroundColor: "#F7F5F0",
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 pt-5">
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-[#6B705C]/45 bg-white/70 p-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="inline-flex items-center gap-1 text-[#6B705C]"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              Chat
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-[#6B705C]/40 px-3 py-1 text-sm text-[#6B705C]"
          >
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
        </header>

        {showFilters && (
          <section className="mb-4 space-y-3 rounded-2xl border border-[#6B705C]/40 bg-white/70 p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou comentário"
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#6B705C]/25"
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none"
              >
                <option value="all">Período: Todos</option>
                <option value="today">Últimas 24h</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Últimos 30 dias</option>
              </select>
              <select
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value as ImageFilter)}
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none"
              >
                <option value="all">Imagem: Todos</option>
                <option value="with_image">Com imagem</option>
                <option value="without_image">Sem imagem</option>
              </select>
            </div>
          </section>
        )}

        <section className="mb-5 rounded-2xl border border-[#6B705C]/45 bg-white/70 p-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#6B705C]/25"
            />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Imagem (URL opcional)"
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#6B705C]/25"
            />
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Comentário"
              className="min-h-22 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6B705C]/25"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#6B705C] px-4 text-sm text-white disabled:opacity-70"
            >
              {submitting ? "Enviando..." : "Comentar"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {loading && (
            <p className="text-sm text-[#6B705C]">Carregando comentários...</p>
          )}

          {!loading && filteredComments.length === 0 && (
            <p className="text-sm text-[#6B705C]">Sem comentários para os filtros selecionados.</p>
          )}

          {filteredComments.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#6B705C]/35 bg-white/80 p-3"
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
          className="fixed right-5 bottom-24 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6B705C]/50 bg-white text-[#6B705C]"
          aria-label="Novo comentário"
        >
          <MessageCirclePlus className="h-5 w-5" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
