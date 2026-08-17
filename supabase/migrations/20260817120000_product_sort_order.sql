-- Permite reordenar manualmente os produtos no catálogo do Admin

alter table public.products
  add column if not exists sort_order integer;

comment on column public.products.sort_order is
  'Ordem manual de exibição no catálogo do Admin (menor primeiro). Nulo = ordena por nome.';
