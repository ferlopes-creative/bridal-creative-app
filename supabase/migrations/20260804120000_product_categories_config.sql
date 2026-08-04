-- Atalhos "Explore" da Início: categorias de produtos configuráveis (nome, foto, visibilidade, produtos incluídos)
alter table public.site_settings
  add column if not exists product_categories_config jsonb;

comment on column public.site_settings.product_categories_config is
  'Array JSON: categorias/atalhos de produtos com nome, foto, visibilidade e lista de produtos incluídos.';
