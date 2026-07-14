-- Imagem e galeria exclusivas da página de venda (antes da compra)

alter table public.products
  add column if not exists image_sales_url text,
  add column if not exists sales_gallery_urls jsonb not null default '[]'::jsonb;

comment on column public.products.image_sales_url is 'Imagem principal na página de compra; não usa o recorte da capa do catálogo.';
comment on column public.products.sales_gallery_urls is 'URLs (JSON array) de imagens de modelos exibidas antes da compra.';
