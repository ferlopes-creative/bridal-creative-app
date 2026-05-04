-- Branding/CMS + vínculo kit → bônus + ID externo de vendas (Cakto etc.)

alter table public.products add column if not exists external_sales_id text;

create unique index if not exists products_external_sales_id_uidx
  on public.products (external_sales_id)
  where external_sales_id is not null and trim(external_sales_id) <> '';

comment on column public.products.external_sales_id is 'ID do produto na plataforma de vendas; webhook resolve purchases.product_id para este produto.';

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  logo_url text,
  page_background_image_url text,
  hero_image_url text,
  hero_headline text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1)
  on conflict (id) do nothing;

comment on table public.site_settings is 'CMS leve: logo, textura de fundo, banner do hero; única linha id=1.';

alter table public.site_settings enable row level security;

grant select, insert, update, delete on table public.site_settings to anon, authenticated, service_role;

drop policy if exists "site_settings_select" on public.site_settings;
drop policy if exists "site_settings_write" on public.site_settings;
drop policy if exists "site_settings_anon_write" on public.site_settings;

create policy "site_settings_select"
  on public.site_settings for select to anon, authenticated using (true);

create policy "site_settings_write"
  on public.site_settings for all to authenticated using (true) with check (true);

create policy "site_settings_anon_write"
  on public.site_settings for all to anon using (true) with check (true);

create table if not exists public.kit_bonus_products (
  id uuid primary key default gen_random_uuid(),
  kit_product_id uuid not null references public.products (id) on delete cascade,
  bonus_product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kit_product_id, bonus_product_id)
);

comment on table public.kit_bonus_products is 'Compra do kit (produto) libera estes bônus automaticamente.';

alter table public.kit_bonus_products enable row level security;

grant select, insert, delete on table public.kit_bonus_products to anon, authenticated, service_role;

drop policy if exists "kit_bonus_select" on public.kit_bonus_products;
drop policy if exists "kit_bonus_write" on public.kit_bonus_products;
drop policy if exists "kit_bonus_delete" on public.kit_bonus_products;
drop policy if exists "kit_bonus_anon_write" on public.kit_bonus_products;

create policy "kit_bonus_select"
  on public.kit_bonus_products for select to anon, authenticated using (true);

create policy "kit_bonus_write"
  on public.kit_bonus_products for insert to authenticated with check (true);

create policy "kit_bonus_delete"
  on public.kit_bonus_products for delete to authenticated using (true);

create policy "kit_bonus_anon_write"
  on public.kit_bonus_products for all to anon using (true) with check (true);
