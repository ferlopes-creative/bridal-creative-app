-- Corrige salvamento no /admin: "new row violates row-level security policy" em products.
-- Execute no Supabase (SQL Editor) se a tabela já existir sem GRANTs/políticas de escrita.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.products to anon, authenticated, service_role;

alter table public.products enable row level security;

drop policy if exists "products_select" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;
drop policy if exists "products_write" on public.products;
drop policy if exists "products_delete_authenticated" on public.products;
drop policy if exists "products_anon_write" on public.products;

-- Catálogo legível pelo app (dashboard, página do produto, visitantes).
create policy "products_select"
  on public.products for select
  to anon, authenticated
  using (true);

-- Escrita restrita a contas do painel (/admin), validadas por login_admin + Supabase Auth.
create policy "products_admin_insert"
  on public.products for insert
  to authenticated
  with check (public.is_login_admin());

create policy "products_admin_update"
  on public.products for update
  to authenticated
  using (public.is_login_admin())
  with check (public.is_login_admin());

create policy "products_admin_delete"
  on public.products for delete
  to authenticated
  using (public.is_login_admin());

-- Realtime no painel admin (lista de produtos).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end;
$$;
