-- Métricas de uso do Planejamento de Casamento pro Admin — só contagens
-- agregadas (nunca dados individuais das usuárias), restrito a admin.

create or replace function public.wedding_planning_usage_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_login_admin() then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'started', (select count(*) from public.wedding_details),
    'with_vendor', (select count(distinct user_id) from public.vendors),
    'with_checklist_done', (select count(distinct user_id) from public.checklist_items where done = true),
    'with_guests', (select count(distinct user_id) from public.guests)
  ) into result;

  return result;
end;
$$;

revoke all on function public.wedding_planning_usage_stats() from public;
grant execute on function public.wedding_planning_usage_stats() to authenticated;
