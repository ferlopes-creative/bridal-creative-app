-- Corrige: "permission denied" / insert bloqueado em app_notifications
-- Execute no Supabase (SQL Editor) se a tabela já existir sem GRANTs.

-- 1) Tabela (se ainda não rodou a migração anterior)
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.app_notifications enable row level security;

-- 2) Permissões de tabela (necessárias além do RLS)
grant usage on schema public to anon, authenticated;
grant select, insert, delete on table public.app_notifications to anon, authenticated, service_role;
grant all on table public.app_notifications to service_role;

-- 3) Políticas (recria de forma idempotente)
drop policy if exists "app_notifications_select" on public.app_notifications;
drop policy if exists "app_notifications_insert" on public.app_notifications;
drop policy if exists "app_notifications_delete" on public.app_notifications;
drop policy if exists "app_notifications_update" on public.app_notifications;

create policy "app_notifications_select"
  on public.app_notifications for select
  to anon, authenticated
  using (true);

create policy "app_notifications_insert"
  on public.app_notifications for insert
  to anon, authenticated
  with check (true);

create policy "app_notifications_delete"
  on public.app_notifications for delete
  to anon, authenticated
  using (true);

-- 4) Realtime (só adiciona se ainda não estiver)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_notifications'
  ) then
    alter publication supabase_realtime add table public.app_notifications;
  end if;
end;
$$;
