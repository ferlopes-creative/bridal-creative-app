-- Banners do hero: carrossel mobile + arte opcional só para desktop.
-- Idempotente: cria hero_banner_urls se a migração 20260504120000 ainda não rodou.

alter table public.site_settings
  add column if not exists hero_banner_urls jsonb not null default '[]'::jsonb;

update public.site_settings
set hero_banner_urls = jsonb_build_array(trim(hero_image_url))
where id = 1
  and hero_image_url is not null
  and trim(hero_image_url) <> ''
  and jsonb_array_length(coalesce(hero_banner_urls, '[]'::jsonb)) = 0;

alter table public.site_settings
  add column if not exists hero_banner_desktop_urls jsonb not null default '[]'::jsonb;

comment on column public.site_settings.hero_banner_urls is
  'URLs dos banners do topo no mobile; JSON array. Usado no desktop se hero_banner_desktop_urls estiver vazio.';

comment on column public.site_settings.hero_banner_desktop_urls is
  'URLs dos banners do topo no desktop (md+); JSON array. Vazio = usa hero_banner_urls.';
