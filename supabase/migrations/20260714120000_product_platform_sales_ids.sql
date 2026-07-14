-- IDs de produto separados por plataforma (Hotmart e Cakto)

alter table public.products
  add column if not exists cakto_sales_id text,
  add column if not exists hotmart_sales_id text;

create unique index if not exists products_cakto_sales_id_uidx
  on public.products (cakto_sales_id)
  where cakto_sales_id is not null and trim(cakto_sales_id) <> '';

create unique index if not exists products_hotmart_sales_id_uidx
  on public.products (hotmart_sales_id)
  where hotmart_sales_id is not null and trim(hotmart_sales_id) <> '';

comment on column public.products.cakto_sales_id is 'ID do produto na Cakto; webhook Cakto resolve purchases.product_id para este produto.';
comment on column public.products.hotmart_sales_id is 'ID do produto (ou oferta) na Hotmart; webhook Hotmart resolve purchases.product_id para este produto.';
