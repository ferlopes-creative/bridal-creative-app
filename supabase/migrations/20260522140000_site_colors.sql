-- Cores do site editáveis no painel (site_settings id=1)

alter table public.site_settings
  add column if not exists color_primary text,
  add column if not exists color_banner text,
  add column if not exists color_banner_light text,
  add column if not exists color_page_bg text;

comment on column public.site_settings.color_primary is 'Verde principal: botões, textos, bordas e navegação.';
comment on column public.site_settings.color_banner is 'Verde dos cards e moldura do banner no dashboard.';
comment on column public.site_settings.color_banner_light is 'Verde claro (área da imagem nos cards de produto).';
comment on column public.site_settings.color_page_bg is 'Fundo claro das páginas internas.';

update public.site_settings
set
  color_primary = coalesce(nullif(trim(color_primary), ''), '#6B705C'),
  color_banner = coalesce(nullif(trim(color_banner), ''), '#5F684F'),
  color_banner_light = coalesce(nullif(trim(color_banner_light), ''), '#aeb6a1'),
  color_page_bg = coalesce(nullif(trim(color_page_bg), ''), '#FBFAF6')
where id = 1;
