import { ImageIcon, LinkIcon, Package, Save, Type, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AdminPanel() {
  return (
    <section className="w-full rounded-3xl border border-zinc-300 bg-white p-5 shadow-sm md:p-7">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900">Painel ADM</h2>

      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome-produto">Nome</Label>
          <div className="relative">
            <Package className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input id="nome-produto" placeholder="Nome do produto" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao-produto">Descrição</Label>
          <Textarea id="descricao-produto" placeholder="Descrição do produto" className="min-h-24" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-produto">Vídeo</Label>
          <div className="relative">
            <Video className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input id="video-produto" type="file" accept="video/*" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="link-produto">Link</Label>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input id="link-produto" type="url" placeholder="Link do produto" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imagem-produto">Imagem</Label>
          <div className="relative">
            <ImageIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input id="imagem-produto" type="file" accept="image/*" className="pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="tipo-produto">Tipo</Label>
            <Select>
              <SelectTrigger id="tipo-produto" className="w-full">
                <Type className="h-4 w-4 text-zinc-500" />
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRO">PRO</SelectItem>
                <SelectItem value="BON">BON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#6B705C" }}
          >
            <Save className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </form>
    </section>
  );
}
