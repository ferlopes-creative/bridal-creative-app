-- Fontes personalizadas (arquivos enviados pela Fernanda), usadas no editor de texto rico

alter table public.site_settings
  add column if not exists custom_fonts_config jsonb not null default '[]'::jsonb;

comment on column public.site_settings.custom_fonts_config is
  'Array JSON: fontes personalizadas enviadas (nome + URL do arquivo), disponíveis no editor de texto rico via @font-face.';
