-- Respostas em thread: comentários podem referenciar uma postagem anterior

alter table public.community_comments
  add column if not exists parent_id uuid references public.community_comments (id) on delete cascade;

create index if not exists community_comments_parent_id_idx
  on public.community_comments (parent_id);

comment on column public.community_comments.parent_id is 'Quando preenchido, este registo é uma resposta ao comentário indicado.';
