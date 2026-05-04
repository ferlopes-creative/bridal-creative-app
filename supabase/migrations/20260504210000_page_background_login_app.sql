-- Fundos separados: tela de login vs páginas internas (dashboard, chat, produto).
-- Valores iniciais nulos: o app usa fallback em page_background_image_url (legado).

alter table public.site_settings
  add column if not exists page_background_login_url text;

alter table public.site_settings
  add column if not exists page_background_app_url text;

comment on column public.site_settings.page_background_login_url is 'Textura/fundo só da página de login.';
comment on column public.site_settings.page_background_app_url is 'Textura/fundo do dashboard, comunidade/chat e página de produto.';
comment on column public.site_settings.page_background_image_url is 'Legado: usado como fallback se login/app estiverem vazios; pode espelhar o fundo app ao gravar no admin.';
