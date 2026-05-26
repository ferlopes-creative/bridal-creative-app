-- Imagem e galeria exclusivas da página de entrega (após a compra)

alter table public.products
  add column if not exists image_delivery_url text,
  add column if not exists delivery_gallery_urls jsonb not null default '[]'::jsonb;

comment on column public.products.image_delivery_url is 'Imagem principal na página de entrega; não usa o recorte da capa do catálogo.';
comment on column public.products.delivery_gallery_urls is 'URLs (JSON array) de imagens de modelos exibidas na entrega.';
