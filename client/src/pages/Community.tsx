/**
 * Community Page — Bridal Creative
 * Design: Botanical Elegance — Organic Luxury
 * Feed estilo Instagram com postagens de fotos, curtidas e comentários
 * Paleta: #677354 (olive), #F7F5F0 (cream bg), #B8A88A (gold), #3A3A3A (text)
 * Tipografia: Cinzel (títulos) + Inter (corpo)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";

const FLORAL_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/floral-texture-8VK8r3EpbwG2BTJNWNsWef.webp";

interface Comment {
  id: number;
  user: string;
  avatar: string;
  text: string;
  time: string;
}

interface Post {
  id: number;
  user: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: Comment[];
  time: string;
}

const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    user: "Ana & Pedro",
    avatar: "",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/community-post-1-WvAWSASnMnZZCsXwsFXW2n.webp",
    caption: "Nossa mesa dos sonhos ficou perfeita! Cada detalhe pensado com tanto carinho. Obrigada @bridalcreative por tornar tudo possível! \u2728\ud83c\udf3f",
    likes: 47,
    liked: false,
    saved: false,
    comments: [
      { id: 1, user: "Maria Silva", avatar: "", text: "Que mesa linda! Parab\u00e9ns pelo bom gosto! \u2764\ufe0f", time: "2h" },
      { id: 2, user: "Juliana Costa", avatar: "", text: "Amei a combina\u00e7\u00e3o das flores com a lou\u00e7a dourada!", time: "1h" },
    ],
    time: "3h",
  },
  {
    id: 2,
    user: "Camila Noiva",
    avatar: "",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/community-post-2-Tu5kb5GgW7wt4tgRh8rF2z.webp",
    caption: "Meu buqu\u00ea dos sonhos! Pe\u00f4nias brancas com rosas e eucalipto... n\u00e3o poderia ser mais perfeito \ud83d\udc90\ud83e\udd0d",
    likes: 89,
    liked: false,
    saved: false,
    comments: [
      { id: 1, user: "Fernanda Lima", avatar: "", text: "Que buqu\u00ea maravilhoso! Quero um igual!", time: "5h" },
      { id: 2, user: "Bruna Oliveira", avatar: "", text: "As pe\u00f4nias ficaram incr\u00edveis! Qual florista voc\u00ea usou?", time: "4h" },
      { id: 3, user: "Tatiana Reis", avatar: "", text: "Simplesmente perfeito! \ud83c\udf3f\u2728", time: "3h" },
    ],
    time: "6h",
  },
  {
    id: 3,
    user: "Bridal Creative",
    avatar: "",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/community-post-3-BQTeeMJZu6JwWcqbZbZ9wi.webp",
    caption: "Nosso novo kit de convites com cal\u00edgrafia artesanal e lacre de cera. Cada detalhe conta a hist\u00f3ria do seu amor \u2702\ufe0f\ud83d\udc8c",
    likes: 124,
    liked: false,
    saved: false,
    comments: [
      { id: 1, user: "Laura Mendes", avatar: "", text: "Que convite lindo! Quero saber mais sobre esse kit!", time: "8h" },
      { id: 2, user: "Isabela Santos", avatar: "", text: "O lacre de cera \u00e9 tudo! Amei demais \ud83d\ude0d", time: "7h" },
    ],
    time: "12h",
  },
  {
    id: 4,
    user: "Rafaela & Thiago",
    avatar: "",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/community-post-4-57fcz34RvEdhRSRmZYXC5x.webp",
    caption: "Nosso altar ao ar livre ficou m\u00e1gico na golden hour! O arco de eucalipto e rosas brancas superou todas as expectativas \ud83c\udf05\ud83c\udf39",
    likes: 203,
    liked: false,
    saved: false,
    comments: [
      { id: 1, user: "Carla Dias", avatar: "", text: "Parece sa\u00eddo de um filme! Que cerim\u00f4nia linda!", time: "1d" },
      { id: 2, user: "Priscila Alves", avatar: "", text: "Esse arco \u00e9 o mais bonito que j\u00e1 vi! \ud83d\ude2d\u2764\ufe0f", time: "20h" },
      { id: 3, user: "Amanda Rocha", avatar: "", text: "Golden hour perfeita! Parab\u00e9ns aos noivos!", time: "18h" },
    ],
    time: "1d",
  },
  {
    id: 5,
    user: "Bridal Creative",
    avatar: "",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663132399034/jpeYEGnYHUdNtg6CzjAYS3/community-post-5-Nb5CnkmoiFY9NxTfg7LV9e.webp",
    caption: "Lembrancinhas artesanais que encantam! Ventarolas personalizadas, sais de banho e tags em cal\u00edgrafia. Cada mimo feito com amor \ud83c\udf3f\ud83d\udc9a",
    likes: 76,
    liked: false,
    saved: false,
    comments: [
      { id: 1, user: "Beatriz Nunes", avatar: "", text: "Que lembrancinhas fofas! Adorei a ventarola!", time: "2d" },
    ],
    time: "2d",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function AvatarCircle({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-[11px]";
  const isBrand = name === "Bridal Creative";
  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold tracking-wide flex-shrink-0 ${
        isBrand
          ? "bg-[#677354] text-white ring-2 ring-[#B8A88A]"
          : "bg-[#E8E3DA] text-[#677354]"
      }`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {getInitials(name)}
    </div>
  );
}

function PostCard({ post, onLike, onSave, onAddComment }: {
  post: Post;
  onLike: (id: number) => void;
  onSave: (id: number) => void;
  onAddComment: (id: number, text: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(post.id, commentText.trim());
      setCommentText("");
    }
  };

  const visibleComments = showAllComments ? post.comments : post.comments.slice(0, 2);

  return (
    <motion.article
      className="bg-white border-b border-[#E8E3DA]/60"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <AvatarCircle name={post.user} />
          <div>
            <p
              className="text-[13px] font-semibold text-[#3A3A3A] leading-tight"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {post.user}
            </p>
            <p className="text-[11px] text-[#8A8A7A]" style={{ fontFamily: "var(--font-body)" }}>
              {post.time}
            </p>
          </div>
        </div>
        <button className="p-1.5 rounded-full hover:bg-[#F7F5F0] transition-colors">
          <MoreHorizontal className="w-5 h-5 text-[#8A8A7A]" />
        </button>
      </div>

      {/* Post Image */}
      <div className="relative w-full aspect-square bg-[#F0EDE6] overflow-hidden">
        <img
          src={post.image}
          alt={`Post de ${post.user}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onDoubleClick={() => !post.liked && onLike(post.id)}
        />
        {/* Double-tap heart animation placeholder */}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className="group transition-transform active:scale-125"
            aria-label={post.liked ? "Descurtir" : "Curtir"}
          >
            <Heart
              className={`w-[26px] h-[26px] transition-colors duration-200 ${
                post.liked
                  ? "fill-red-500 text-red-500"
                  : "text-[#3A3A3A] group-hover:text-[#677354]"
              }`}
              strokeWidth={1.6}
            />
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="group"
            aria-label="Comentar"
          >
            <MessageCircle
              className="w-[25px] h-[25px] text-[#3A3A3A] group-hover:text-[#677354] transition-colors"
              strokeWidth={1.6}
            />
          </button>
          <button className="group" aria-label="Compartilhar">
            <Send
              className="w-[23px] h-[23px] text-[#3A3A3A] group-hover:text-[#677354] transition-colors"
              strokeWidth={1.6}
            />
          </button>
        </div>
        <button
          onClick={() => onSave(post.id)}
          className="group transition-transform active:scale-110"
          aria-label={post.saved ? "Remover dos salvos" : "Salvar"}
        >
          <Bookmark
            className={`w-[25px] h-[25px] transition-colors duration-200 ${
              post.saved
                ? "fill-[#677354] text-[#677354]"
                : "text-[#3A3A3A] group-hover:text-[#677354]"
            }`}
            strokeWidth={1.6}
          />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4 pt-1">
        <p className="text-[13px] font-semibold text-[#3A3A3A]" style={{ fontFamily: "var(--font-body)" }}>
          {post.likes.toLocaleString("pt-BR")} curtida{post.likes !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 pt-1.5 pb-1">
        <p className="text-[13px] text-[#3A3A3A] leading-[1.5]" style={{ fontFamily: "var(--font-body)" }}>
          <span className="font-semibold mr-1.5">{post.user}</span>
          {post.caption}
        </p>
      </div>

      {/* Comments Section */}
      <div className="px-4 pb-3">
        {post.comments.length > 2 && !showAllComments && (
          <button
            onClick={() => setShowAllComments(true)}
            className="text-[12px] text-[#8A8A7A] mt-1 mb-1"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Ver todos os {post.comments.length} comentários
          </button>
        )}

        <AnimatePresence>
          {visibleComments.map((comment) => (
            <motion.div
              key={comment.id}
              className="flex items-start gap-2.5 mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AvatarCircle name={comment.user} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#3A3A3A] leading-[1.5]" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="font-semibold mr-1">{comment.user}</span>
                  {comment.text}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-[#8A8A7A]">{comment.time}</span>
                  <button className="text-[10px] text-[#8A8A7A] font-medium hover:text-[#677354]">
                    Responder
                  </button>
                </div>
              </div>
              <button className="pt-1">
                <Heart className="w-3 h-3 text-[#B5B5A8]" strokeWidth={1.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Comment Input */}
        <AnimatePresence>
          {showComments && (
            <motion.form
              onSubmit={handleSubmitComment}
              className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E8E3DA]/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AvatarCircle name="Você" size="sm" />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Adicione um comentário..."
                className="flex-1 text-[13px] bg-transparent border-none outline-none text-[#3A3A3A] placeholder:text-[#B5B5A8]"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="text-[13px] font-semibold text-[#677354] disabled:text-[#B5B5A8] transition-colors"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Publicar
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Inline comment input (always visible) */}
        {!showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="text-[12px] text-[#8A8A7A] mt-1.5 block"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Adicione um comentário...
          </button>
        )}
      </div>
    </motion.article>
  );
}

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [, setLocation] = useLocation();

  const handleLike = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handleSave = (postId: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p))
    );
  };

  const handleAddComment = (postId: number, text: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: Date.now(),
                  user: "Você",
                  avatar: "",
                  text,
                  time: "agora",
                },
              ],
            }
          : p
      )
    );
  };

  return (
    <div
      className="min-h-screen pb-24 max-w-[480px] mx-auto"
      style={{
        backgroundColor: "#F7F5F0",
      }}
    >
      {/* Community Header */}
      <header className="sticky top-0 z-50 bg-[#F7F5F0]/95 backdrop-blur-md border-b border-[#E8E3DA]/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setLocation("/dashboard")}
            className="p-1 rounded-full hover:bg-[#E8E3DA]/50 transition-colors"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6 text-[#677354]" strokeWidth={1.8} />
          </button>
          <h1
            className="text-[16px] tracking-[0.12em] text-[#3A3A3A]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontVariant: "small-caps",
            }}
          >
            Comunidade
          </h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Stories-like section */}
      <div className="bg-white border-b border-[#E8E3DA]/50 py-4">
        <div
          className="flex gap-4 overflow-x-auto px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Add story button */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#B8A88A] flex items-center justify-center bg-[#F7F5F0]">
              <span className="text-[#677354] text-xl font-light">+</span>
            </div>
            <span className="text-[10px] text-[#8A8A7A]" style={{ fontFamily: "var(--font-body)" }}>
              Sua história
            </span>
          </div>
          {/* Story circles */}
          {INITIAL_POSTS.slice(0, 4).map((post) => (
            <div key={`story-${post.id}`} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-[#677354] via-[#B8A88A] to-[#677354]">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                  <img
                    src={post.image}
                    alt={post.user}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span
                className="text-[10px] text-[#3A3A3A] max-w-[64px] truncate text-center"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {post.user.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="mt-2">
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onSave={handleSave}
            onAddComment={handleAddComment}
          />
        ))}
      </div>

      {/* End of feed message */}
      <div className="py-10 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E8E3DA]/50 flex items-center justify-center">
          <Heart className="w-5 h-5 text-[#B8A88A]" strokeWidth={1.5} />
        </div>
        <p
          className="text-[13px] text-[#8A8A7A]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          Você viu todas as postagens recentes
        </p>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
