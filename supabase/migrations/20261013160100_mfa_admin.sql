-- MFA support for admins: an audit trail for MFA changes and an overview of
-- who has MFA. MFA itself is managed by Supabase Auth, so the app records the
-- event right after a successful change; the function decides who may record what.

create function public.log_mfa_event(target_staff_id uuid, mfa_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if mfa_event is null or mfa_event not in ('enabled', 'disabled', 'reset') then
    raise exception 'Invalid MFA event' using errcode = '22023';
  end if;

  if mfa_event = 'reset' then
    if not private.is_admin() or target_staff_id = (select auth.uid()) then
      raise exception 'Only admins can reset MFA of other staff' using errcode = '42501';
    end if;
  elsif target_staff_id is distinct from (select auth.uid()) or not private.is_staff() then
    raise exception 'Staff can only record their own MFA changes' using errcode = '42501';
  end if;

  if not exists (select 1 from public.staff_profiles where id = target_staff_id) then
    raise exception 'Unknown staff member' using errcode = '22023';
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), 'mfa.' || mfa_event, 'staff_mfa', target_staff_id::text);
end;
$$;

revoke all on function public.log_mfa_event(uuid, text) from public, anon;
grant execute on function public.log_mfa_event(uuid, text) to authenticated;

-- Admin overview: which staff have MFA enabled (Auth's user list does not
-- include factors). Non-admins get an empty result.
create function public.staff_with_mfa()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select f.user_id
  from auth.mfa_factors f
  where private.is_admin() and f.status = 'verified' and f.factor_type = 'totp'
  group by f.user_id
$$;

revoke all on function public.staff_with_mfa() from public, anon;
grant execute on function public.staff_with_mfa() to authenticated;
