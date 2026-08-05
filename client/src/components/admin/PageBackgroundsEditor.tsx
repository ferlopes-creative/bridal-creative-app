import { ImagePlus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

type BackgroundFieldProps = {
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
  saving: boolean;
  onUploadPhoto: (file: File) => Promise<string>;
};

function BackgroundField({ label, url, onChange, saving, onUploadPhoto }: BackgroundFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await onUploadPhoto(file);
      onChange(uploaded);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-4 w-4 text-zinc-400" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            type="file"
            accept="image/*"
            disabled={saving || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
            className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#6B705C] file:px-2 file:py-1.5 file:text-white"
          />
          {uploading ? <p className="text-xs text-zinc-400">Enviando...</p> : null}
          {url ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={saving || uploading}
              className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remover (volta a usar o fundo padrão)
            </button>
          ) : (
            <p className="text-xs text-zinc-400">Sem imagem própria — usa o fundo padrão do app.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PageBackgroundsEditor({
  dashboardUrl,
  onDashboardChange,
  profileUrl,
  onProfileChange,
  communityUrl,
  onCommunityChange,
  planejamentoUrl,
  onPlanejamentoChange,
  saving,
  onSave,
  onUploadPhoto,
}: {
  dashboardUrl: string | null;
  onDashboardChange: (url: string | null) => void;
  profileUrl: string | null;
  onProfileChange: (url: string | null) => void;
  communityUrl: string | null;
  onCommunityChange: (url: string | null) => void;
  planejamentoUrl: string | null;
  onPlanejamentoChange: (url: string | null) => void;
  saving: boolean;
  onSave: () => void;
  onUploadPhoto: (file: File) => Promise<string>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#6B705C]/15 bg-[#fafaf8] p-4 text-sm leading-relaxed text-zinc-600">
        <p>
          Escolha um fundo próprio pra cada página. Se não definir aqui, a página usa o fundo padrão do
          app (configurado em &quot;Aparência do app&quot;).
        </p>
      </div>

      <BackgroundField
        label="Início"
        url={dashboardUrl}
        onChange={onDashboardChange}
        saving={saving}
        onUploadPhoto={onUploadPhoto}
      />
      <BackgroundField
        label="Perfil"
        url={profileUrl}
        onChange={onProfileChange}
        saving={saving}
        onUploadPhoto={onUploadPhoto}
      />
      <BackgroundField
        label="Chat"
        url={communityUrl}
        onChange={onCommunityChange}
        saving={saving}
        onUploadPhoto={onUploadPhoto}
      />
      <BackgroundField
        label="Planejamento"
        url={planejamentoUrl}
        onChange={onPlanejamentoChange}
        saving={saving}
        onUploadPhoto={onUploadPhoto}
      />

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#6B705C" }}
      >
        {saving ? (
          <>
            <Spinner className="size-4 text-white" />
            Salvando…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Salvar fundos
          </>
        )}
      </button>
    </div>
  );
}
