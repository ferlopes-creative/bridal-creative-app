-- Opacidade da textura de fundo (0–100 %), configurável no admin.
alter table public.site_settings
  add column if not exists page_background_opacity_percent smallint not null default 22;

comment on column public.site_settings.page_background_opacity_percent is
  'Opacidade da imagem de fundo repetida (0–100). Padrão 22 (antes ~14 no CSS).';

update public.site_settings
set page_background_opacity_percent = 22
where id = 1 and page_background_opacity_percent is null;
