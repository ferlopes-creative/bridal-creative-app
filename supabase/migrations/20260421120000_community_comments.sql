-- Comentários da comunidade (/community)
-- Execute no Supabase: SQL Editor → New query → colar → Run
-- Ou: supabase db push (se usar CLI linkado ao projeto)

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  comment text not null,
  image_url text,
  created_at timestamptz not null default now()
);

comment on table public.community_comments is 'Chat simples entre usuários (nome, texto, imagem opcional).';

alter table public.community_comments enable row level security;

-- Leitura aberta (chat visível para quem usa o app com a anon key)
create policy "community_comments_select_public"
  on public.community_comments
  for select
  to anon, authenticated
  using (true);

-- Inserção: usuários anon + autenticados (ajuste para só authenticated em produção se preferir)
create policy "community_comments_insert_public"
  on public.community_comments
  for insert
  to anon, authenticated
  with check (true);

-- Realtime (lista atualiza ao vivo)
alter publication supabase_realtime add table public.community_comments;
