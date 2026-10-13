-- Shared helpers for the database tests. Runs first (alphabetical order) and
-- is deliberately NOT wrapped in a rolled-back transaction, so the helpers
-- exist for the other test files. Local/CI test databases only.

create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Creates an auth user. With a role, an invitation is created first so the
-- signup trigger turns the user into staff (the production path).
create or replace function tests.create_user(
  user_email text,
  staff_role public.staff_role default null,
  active boolean default true
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  if staff_role is not null then
    insert into public.staff_invitations (email, display_name, role)
    values (lower(user_email), split_part(user_email, '@', 1), staff_role);
  end if;

  insert into auth.users (id, email, aud, role)
  values (new_id, user_email, 'authenticated', 'authenticated');

  if not active then
    update public.staff_profiles set is_active = false where id = new_id;
  end if;

  return new_id;
end;
$$;

-- Security definer so tests can resolve ids while acting as another role.
create or replace function tests.user_id(user_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where email = user_email
$$;

-- Switches the current transaction to an authenticated user's identity.
-- session_aal: 'aal1' = password only, 'aal2' = password + MFA code.
drop function if exists tests.authenticate_as(text);
create or replace function tests.authenticate_as(user_email text, session_aal text default 'aal1')
returns void
language plpgsql
set search_path = ''
as $$
declare
  target uuid := tests.user_id(user_email);
begin
  if target is null then
    raise exception 'Unknown test user %', user_email;
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', target, 'role', 'authenticated', 'aal', session_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Gives a user an MFA factor (verified = enabled, otherwise abandoned setup).
create or replace function tests.add_totp_factor(user_email text, factor_status text default 'verified')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
  values (gen_random_uuid(), tests.user_id(user_email), 'test', 'totp',
          factor_status::auth.factor_status, now(), now());
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.authenticate_as_service_role()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

select plan(1);
select ok(true, 'test helpers installed');
select * from finish();
