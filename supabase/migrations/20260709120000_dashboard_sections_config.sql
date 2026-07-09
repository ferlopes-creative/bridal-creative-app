-- Configuração completa das seções do dashboard (título, tipo, produtos, ordem)
alter table public.site_settings
  add column if not exists dashboard_sections_config jsonb;

comment on column public.site_settings.dashboard_sections_config is
  'Array JSON: seções do dashboard com título, tipo (produtos/whatsapp), modo automático ou manual e lista de produtos.';
