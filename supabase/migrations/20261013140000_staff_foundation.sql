-- Staff foundation: roles, profiles, invitations and authorization helpers.
--
-- Security model:
-- * Only invited staff get a profile; every authorization helper requires an
--   ACTIVE profile, so any other authenticated user can read/write nothing.
-- * Grants are deny-by-default: anon gets nothing, authenticated gets only the
--   columns listed here, and RLS decides which rows.
-- * Helpers live in the `private` schema, which the Data API does not expose.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.staff_role as enum ('admin', 'organizer', 'team_member');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 60 and display_name = btrim(display_name)),
  role public.staff_role not null default 'team_member',
  is_active boolean not null default true,
  invited_by uuid references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.staff_profiles is
  'Internal staff. A row exists only for invited users; is_active=false revokes all access.';

-- Invitations are the only way to become staff. Emails live here (admin-only)
-- instead of on staff_profiles, so regular staff never see colleagues'' emails.
create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) between 3 and 254 and email = lower(btrim(email)) and email like '_%@_%'),
  display_name text not null
    check (char_length(display_name) between 1 and 60 and display_name = btrim(display_name)),
  role public.staff_role not null default 'team_member',
  invited_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  claimed_at timestamptz,
  revoked_at timestamptz,
  check ((claimed_at is null) = (user_id is null))
);

create unique index staff_invitations_one_open_per_email
  on public.staff_invitations (email)
  where claimed_at is null and revoked_at is null;
create index staff_invitations_invited_by_idx on public.staff_invitations (invited_by);
create index staff_profiles_invited_by_idx on public.staff_profiles (invited_by);

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so they can read staff_profiles
-- regardless of the caller's RLS; they only ever answer about auth.uid()).
-- ---------------------------------------------------------------------------

create function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.id = (select auth.uid()) and sp.is_active
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_staff_role() is not null
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_staff_role() = 'admin', false)
$$;

create function private.has_any_role(roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_staff_role() = any (roles), false)
$$;

revoke all on function private.current_staff_role() from public;
revoke all on function private.is_staff() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.has_any_role(public.staff_role[]) from public;
grant execute on function private.current_staff_role() to authenticated, service_role;
grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.has_any_role(public.staff_role[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Role and active-status changes are admin-only, and nobody can change their
-- own role or status. Because the acting admin always remains an active admin,
-- this also guarantees the last admin cannot be removed through the API.
create function private.guard_staff_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active) then
    if not private.is_admin() then
      raise exception 'Only admins can change staff roles or status' using errcode = '42501';
    end if;
    if new.id = (select auth.uid()) then
      raise exception 'Staff cannot change their own role or status' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger staff_profiles_guard_update
  before update on public.staff_profiles
  for each row execute function private.guard_staff_profile_update();

create trigger staff_profiles_set_updated_at
  before update on public.staff_profiles
  for each row execute function private.set_updated_at();

-- When Auth creates a user (invite link generated by an admin), turn a
-- matching open invitation into a staff profile. No invitation = no profile.
create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.staff_invitations;
begin
  select * into invitation
  from public.staff_invitations i
  where i.email = lower(new.email)
    and i.claimed_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  order by i.created_at desc
  limit 1
  for update;

  if found then
    insert into public.staff_profiles (id, display_name, role, invited_by)
    values (new.id, invitation.display_name, invitation.role, invitation.invited_by);

    update public.staff_invitations
    set claimed_at = now(), user_id = new.id
    where id = invitation.id;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.staff_profiles enable row level security;
alter table public.staff_invitations enable row level security;

revoke all on public.staff_profiles from anon, authenticated;
revoke all on public.staff_invitations from anon, authenticated;

grant select on public.staff_profiles to authenticated;
grant update (display_name, role, is_active) on public.staff_profiles to authenticated;

grant select on public.staff_invitations to authenticated;
grant insert (email, display_name, role) on public.staff_invitations to authenticated;
grant update (revoked_at) on public.staff_invitations to authenticated;

create policy "Active staff can view staff"
  on public.staff_profiles for select
  to authenticated
  using ((select private.is_staff()));

create policy "Staff update their own profile; admins update anyone"
  on public.staff_profiles for update
  to authenticated
  using ((select private.is_staff()) and (id = (select auth.uid()) or (select private.is_admin())))
  with check ((select private.is_staff()) and (id = (select auth.uid()) or (select private.is_admin())));

create policy "Admins can view invitations"
  on public.staff_invitations for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins can create invitations"
  on public.staff_invitations for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins can revoke open invitations"
  on public.staff_invitations for update
  to authenticated
  using ((select private.is_admin()) and claimed_at is null and revoked_at is null)
  with check ((select private.is_admin()));
