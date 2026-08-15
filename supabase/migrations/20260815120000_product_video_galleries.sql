-- Permite vários vídeos por produto (entrega e venda), não só um

alter table public.products
  add column if not exists delivery_video_urls jsonb not null default '[]'::jsonb;
alter table public.products
  add column if not exists sales_video_urls jsonb not null default '[]'::jsonb;

comment on column public.products.delivery_video_urls is
  'Array JSON de URLs de vídeo exibidos após a compra (substitui/complementa video_url).';
comment on column public.products.sales_video_urls is
  'Array JSON de URLs de vídeo exibidos antes da compra (substitui/complementa video_sales_url).';
