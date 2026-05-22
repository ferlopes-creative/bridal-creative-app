-- Múltiplos links de acesso por produto (após a compra)

alter table public.products
  add column if not exists access_links jsonb not null default '[]'::jsonb;

comment on column public.products.access_links is 'Lista JSON de { "label": string, "url": string } exibida após a compra.';

update public.products
set access_links = jsonb_build_array(
  jsonb_build_object('label', 'Acesso', 'url', trim(link_compra))
)
where (access_links is null or access_links = '[]'::jsonb)
  and link_compra is not null
  and trim(link_compra) <> '';
