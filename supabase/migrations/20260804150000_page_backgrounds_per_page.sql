-- Fundo de página configurável individualmente por página (Início, Perfil, Chat, Planejamento).
-- Se vazio, cada página continua usando o fundo padrão do app (page_background_app_url).
alter table public.site_settings
  add column if not exists page_background_dashboard_url text;
alter table public.site_settings
  add column if not exists page_background_profile_url text;
alter table public.site_settings
  add column if not exists page_background_community_url text;
alter table public.site_settings
  add column if not exists page_background_planejamento_url text;
