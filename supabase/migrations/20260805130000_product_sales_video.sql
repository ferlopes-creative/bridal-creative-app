-- Vídeo exclusivo da página de venda (antes da compra); video_url continua sendo o de entrega

alter table public.products
  add column if not exists video_sales_url text;

comment on column public.products.video_sales_url is 'URL pública do vídeo exibido na página de vendas, antes da compra. Se vazio, nenhum vídeo é exibido antes da compra.';
