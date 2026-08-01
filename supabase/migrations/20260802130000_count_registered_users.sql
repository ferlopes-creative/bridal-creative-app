-- Função pro Admin ver quantas contas existem no app.
-- auth.users não é consultável direto pelo cliente; expõe só a contagem,
-- e apenas pra quem é admin (mesma checagem usada nas outras policies).

create or replace function public.count_registered_users()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_login_admin() then
    raise exception 'not authorized';
  end if;
  return (select count(*) from auth.users)::integer;
end;
$$;

revoke all on function public.count_registered_users() from public;
grant execute on function public.count_registered_users() to authenticated;
