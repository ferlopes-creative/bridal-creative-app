-- Avisos exibidos no app (página aberta pelo ícone de sino)
-- SQL Editor do Supabase: colar e executar

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.app_notifications is 'Notificações enviadas pelo /admin; leitura no app em /notifications.';

alter table public.app_notifications enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, delete on table public.app_notifications to anon, authenticated, service_role;

create policy "app_notifications_select"
  on public.app_notifications
  for select
  to anon, authenticated
  using (true);

-- Ajuste em produção: restrinja a equipe (ex. role custom ou service key)
create policy "app_notifications_insert"
  on public.app_notifications
  for insert
  to anon, authenticated
  with check (true);

create policy "app_notifications_delete"
  on public.app_notifications
  for delete
  to anon, authenticated
  using (true);

alter publication supabase_realtime add table public.app_notifications;
