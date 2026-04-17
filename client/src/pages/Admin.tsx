import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Save, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/");
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
          <div>
            <p className="text-sm text-zinc-700">/admin</p>
            <h1 className="font-serif text-3xl text-[#6B705C]">BC produtos</h1>
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

        {loading ? (
          <p className="text-sm text-zinc-600">Carregando produtos...</p>
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
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-[#6B705C]/50 px-2.5 text-xs text-[#6B705C] hover:bg-[#6B705C]/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
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

            <form onSubmit={handleSave} className="space-y-4">
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-8 text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                  style={{ backgroundColor: "#6B705C" }}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "SALVANDO..." : "SALVAR"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
