-- Security events for admins: an audit trail for MFA changes and login links,
-- and an overview of who has MFA. These actions happen in Supabase Auth, so
-- the app records them right after success; the function decides who may
-- record what (staff only about themselves, admins about others).

create function public.log_security_event(target_staff_id uuid, security_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if security_event is null
     or security_event not in ('mfa.enabled', 'mfa.disabled', 'mfa.reset', 'login_link.created') then
    raise exception 'Invalid security event' using errcode = '22023';
  end if;

  if security_event in ('mfa.reset', 'login_link.created') then
    if not private.is_admin() or target_staff_id = (select auth.uid()) then
      raise exception 'Only admins can record this for other staff' using errcode = '42501';
    end if;
  elsif target_staff_id is distinct from (select auth.uid()) or not private.is_staff() then
    raise exception 'Staff can only record their own MFA changes' using errcode = '42501';
  end if;

  if not exists (select 1 from public.staff_profiles where id = target_staff_id) then
    raise exception 'Unknown staff member' using errcode = '22023';
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), security_event, 'staff_security', target_staff_id::text);
end;
$$;

revoke all on function public.log_security_event(uuid, text) from public, anon;
grant execute on function public.log_security_event(uuid, text) to authenticated;

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
