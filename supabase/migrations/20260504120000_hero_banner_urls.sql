-- Múltiplos banners no dashboard (carrossel); migra hero_image_url existente.

alter table public.site_settings
  add column if not exists hero_banner_urls jsonb not null default '[]'::jsonb;

comment on column public.site_settings.hero_banner_urls is 'URLs dos banners do topo (dashboard), em ordem; JSON array de strings.';

update public.site_settings
set hero_banner_urls = jsonb_build_array(trim(hero_image_url))
where id = 1
  and hero_image_url is not null
  and trim(hero_image_url) <> ''
  and jsonb_array_length(coalesce(hero_banner_urls, '[]'::jsonb)) = 0;
