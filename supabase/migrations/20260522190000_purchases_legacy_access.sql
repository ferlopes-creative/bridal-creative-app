-- Compras por usuária (libera produtos no app). Inclui origem para compradores da plataforma antiga.

create table if not exists public.purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.purchases
  add column if not exists source text;

update public.purchases
set source = 'webhook'
where source is null or trim(source) = '';

alter table public.purchases
  alter column source set default 'webhook';

alter table public.purchases
  alter column source set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'purchases_status_check'
  ) then
    alter table public.purchases
      add constraint purchases_status_check
      check (status in ('active', 'refunded'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'purchases_source_check'
  ) then
    alter table public.purchases
      add constraint purchases_source_check
      check (source in ('webhook', 'legacy', 'admin'));
  end if;
end $$;

comment on table public.purchases is
  'Compras ativas por usuária. O app libera conteúdo quando status = active.';
comment on column public.purchases.source is
  'webhook = Cakto; legacy = importação compradores antigos; admin = concessão manual no painel.';

create index if not exists purchases_user_id_status_idx
  on public.purchases (user_id, status);

grant select on table public.purchases to authenticated;
grant all on table public.purchases to service_role;

alter table public.purchases enable row level security;

drop policy if exists "purchases_select_own" on public.purchases;
drop policy if exists "purchases_admin_all" on public.purchases;

create policy "purchases_select_own"
  on public.purchases for select
  to authenticated
  using (user_id = auth.uid());

-- Escrita apenas via API (service role) ou SQL manual; clientes não inserem compras.
create policy "purchases_admin_all"
  on public.purchases for all
  to authenticated
  using (public.is_login_admin())
  with check (public.is_login_admin());
