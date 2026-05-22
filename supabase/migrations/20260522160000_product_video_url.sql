-- Vídeo individual por produto (URL no Storage, uma por linha em products)

alter table public.products
  add column if not exists video_url text;

comment on column public.products.video_url is 'URL pública do vídeo deste produto no Storage; cada item do catálogo tem o seu.';
