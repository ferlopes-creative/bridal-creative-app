-- Banner próprio da aba "Meus produtos", separado do banner da Início

alter table public.site_settings
  add column if not exists owned_products_banner_urls jsonb not null default '[]'::jsonb;

comment on column public.site_settings.owned_products_banner_urls is
  'Array JSON de URLs do carrossel exibido em Meus produtos. Vazio = nenhum banner ali.';
