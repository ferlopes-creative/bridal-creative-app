-- Ícone do app / aba do navegador (favicon), configurável pelo Admin.

alter table public.site_settings
  add column if not exists favicon_url text;

comment on column public.site_settings.favicon_url is
  'URL do ícone usado na aba do navegador (favicon) e como ícone ao adicionar à tela inicial.';
