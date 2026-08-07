-- Aulas gravadas organizadas em módulos (trilhas estilo Netflix), exibidas após a compra

alter table public.products
  add column if not exists modules_config jsonb not null default '[]'::jsonb;

comment on column public.products.modules_config is
  'Array JSON: módulos com título, capa e lista de aulas (título, vídeo, capa, descrição). Exibido como trilhas na página do produto após a compra.';
