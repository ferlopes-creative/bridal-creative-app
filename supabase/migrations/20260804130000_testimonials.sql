-- Seção "O que as noivas dizem": depoimentos configuráveis (nome, data, nota, texto, foto)
-- e a foto do banner do topo da seção.
alter table public.site_settings
  add column if not exists testimonials_config jsonb;

alter table public.site_settings
  add column if not exists testimonials_banner_url text;

comment on column public.site_settings.testimonials_config is
  'Array JSON: depoimentos com nome, data, nota (1-5), texto, foto e visibilidade.';

comment on column public.site_settings.testimonials_banner_url is
  'URL da foto de banner exibida no topo da seção de depoimentos.';
