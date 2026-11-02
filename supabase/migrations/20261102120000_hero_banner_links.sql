-- Link opcional ao tocar em cada banner do carrossel da Início

alter table public.site_settings
  add column if not exists hero_banner_links jsonb not null default '{}'::jsonb;

comment on column public.site_settings.hero_banner_links is
  'Objeto JSON { "<url da imagem do banner>": "<link ao clicar>" }. Banner sem entrada = não clicável.';
