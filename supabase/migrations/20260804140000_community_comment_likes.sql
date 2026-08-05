-- Curtidas nos comentários do Chat (comunidade): uma curtida por usuária por comentário.
create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.community_comment_likes enable row level security;

drop policy if exists "community_comment_likes_select_all" on public.community_comment_likes;
drop policy if exists "community_comment_likes_insert_own" on public.community_comment_likes;
drop policy if exists "community_comment_likes_delete_own" on public.community_comment_likes;

create policy "community_comment_likes_select_all"
  on public.community_comment_likes for select
  to authenticated
  using (true);

create policy "community_comment_likes_insert_own"
  on public.community_comment_likes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "community_comment_likes_delete_own"
  on public.community_comment_likes for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.community_comment_likes to authenticated;

create index if not exists community_comment_likes_comment_id_idx
  on public.community_comment_likes (comment_id);
