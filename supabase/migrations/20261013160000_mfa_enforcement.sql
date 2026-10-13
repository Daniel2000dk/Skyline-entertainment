-- Enforce MFA in the database: staff who enabled TOTP get no staff rights
-- until their session is upgraded to aal2 (password + code). Every policy and
-- helper builds on current_staff_role(), so this covers all tables at once.

create or replace function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.id = (select auth.uid())
    and sp.is_active
    and (
      coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = sp.id and f.status = 'verified'
      )
    )
$$;
