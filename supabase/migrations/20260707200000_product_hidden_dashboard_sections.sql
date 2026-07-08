-- Ocultar produtos no catálogo antes da compra
alter table public.products
  add column if not exists is_hidden boolean not null default false;

comment on column public.products.is_hidden is
  'Quando true, o produto não aparece no catálogo para quem ainda não tem acesso.';

-- Ordem das seções do dashboard (JSON array de ids)
alter table public.site_settings
  add column if not exists dashboard_section_order jsonb not null default '["owned","suggested","bonus","other","whatsapp"]'::jsonb;

comment on column public.site_settings.dashboard_section_order is
  'Ordem das seções na home do app: owned, suggested, bonus, other, whatsapp.';
