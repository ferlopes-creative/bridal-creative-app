-- Credenciais de acesso ao painel /admin (validação no servidor via service role).
-- No Supabase, pgcrypto fica no schema extensions (não em public).
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.login_admin (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint login_admin_email_lower unique (email)
);

comment on table public.login_admin is 'Contas autorizadas a acessar /admin (e-mail + senha com bcrypt).';

alter table public.login_admin enable row level security;

revoke all on table public.login_admin from anon, authenticated;

-- Seed: ferlopesdesigner@gmail.com / @Puppy2309
insert into public.login_admin (email, password_hash)
values (
  'ferlopesdesigner@gmail.com',
  extensions.crypt('@Puppy2309', extensions.gen_salt('bf'))
)
on conflict (email) do update set password_hash = excluded.password_hash;

create or replace function public.verify_login_admin(p_email text, p_password text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.login_admin la
    where lower(la.email) = lower(trim(p_email))
      and la.password_hash = extensions.crypt(p_password, la.password_hash)
  );
$$;

revoke all on function public.verify_login_admin(text, text) from public;
grant execute on function public.verify_login_admin(text, text) to service_role;

create or replace function public.is_login_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.login_admin la
    where lower(la.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_login_admin() from public;
grant execute on function public.is_login_admin() to authenticated;
