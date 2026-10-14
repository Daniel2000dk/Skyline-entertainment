-- Username login and activation links with a separate code.
--
-- * Staff log in with a username; the Auth email stays internal (new staff get
--   an undeliverable placeholder address, existing accounts keep theirs).
-- * Admins hand out a one-time activation link PLUS a short code, shared via
--   different channels. The link alone is useless: the code is required, and
--   five wrong codes burn the link. Only hashes are stored: the token as
--   sha256(token), the code as sha256(token || ':' || code), so the code cannot
--   be brute-forced from a database copy without the (unstored) token.
-- * Lookups that run before anyone is logged in (login, activation) are
--   functions only the server's secret key (service_role) may execute.

-- ---------------------------------------------------------------------------
-- Usernames
-- ---------------------------------------------------------------------------

alter table public.staff_profiles add column username text;

-- Existing accounts get a username derived from their name (admins can change it).
do $$
declare
  profile record;
  candidate text;
begin
  for profile in select id, display_name from public.staff_profiles order by created_at loop
    candidate := left(
      btrim(regexp_replace(lower(profile.display_name), '[^a-z0-9._-]+', '.', 'g'), '._-'),
      20
    );
    if candidate !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
      candidate := 'medewerker';
    end if;
    if exists (select 1 from public.staff_profiles where username = candidate) then
      candidate := candidate || '-' || left(replace(profile.id::text, '-', ''), 6);
    end if;
    update public.staff_profiles set username = candidate where id = profile.id;
  end loop;
end;
$$;

alter table public.staff_profiles
  alter column username set not null,
  add constraint staff_profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  add constraint staff_profiles_username_key unique (username);

alter table public.staff_invitations
  add column username text check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

create unique index staff_invitations_one_open_per_username
  on public.staff_invitations (username)
  where claimed_at is null and revoked_at is null;

grant insert (username) on public.staff_invitations to authenticated;
grant update (username) on public.staff_profiles to authenticated;

-- Usernames are login names: only admins change them (also their own).
create or replace function private.guard_staff_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      if not private.is_admin() then
        raise exception 'Only admins can change staff roles or status' using errcode = '42501';
      end if;
      if new.id = (select auth.uid()) then
        raise exception 'Staff cannot change their own role or status' using errcode = '42501';
      end if;
    end if;
    if new.username is distinct from old.username and not private.is_admin() then
      raise exception 'Only admins can change usernames' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
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
    insert into public.staff_profiles (id, display_name, role, invited_by, username)
    values (
      new.id,
      invitation.display_name,
      invitation.role,
      invitation.invited_by,
      coalesce(invitation.username, 'medewerker-' || left(replace(new.id::text, '-', ''), 8))
    );

    update public.staff_invitations
    set claimed_at = now(), user_id = new.id
    where id = invitation.id;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;

-- Login: username -> internal Auth email. Server only (secret key).
create function public.staff_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.staff_profiles sp
  join auth.users u on u.id = sp.id
  where sp.username = lower(btrim(p_username)) and sp.is_active
$$;

revoke all on function public.staff_login_email(text) from public, anon, authenticated;
grant execute on function public.staff_login_email(text) to service_role;

-- ---------------------------------------------------------------------------
-- Activation links
-- ---------------------------------------------------------------------------

create table public.staff_activations (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  failed_attempts smallint not null default 0,
  created_by uuid references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  used_at timestamptz
);

comment on table public.staff_activations is
  'One-time activation links (hashes only). Reachable only through the functions below.';

create index staff_activations_staff_id_idx on public.staff_activations (staff_id);
create index staff_activations_created_by_idx on public.staff_activations (created_by);

alter table public.staff_activations enable row level security;
revoke all on public.staff_activations from anon, authenticated;

-- Admin creates a link for another staff member; older open links for that
-- member stop working. Always written to the activity log.
create function public.create_staff_activation(
  target_staff_id uuid,
  p_token_hash text,
  p_code_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only admins can create activation links' using errcode = '42501';
  end if;
  if target_staff_id = (select auth.uid()) then
    raise exception 'Use the account page for your own password' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff_profiles where id = target_staff_id and is_active) then
    raise exception 'Unknown or inactive staff member' using errcode = '22023';
  end if;

  delete from public.staff_activations where staff_id = target_staff_id and used_at is null;
  insert into public.staff_activations (staff_id, token_hash, code_hash, created_by)
  values (target_staff_id, p_token_hash, p_code_hash, (select auth.uid()));

  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values ((select auth.uid()), 'login_link.created', 'staff_security', target_staff_id::text);
end;
$$;

revoke all on function public.create_staff_activation(uuid, text, text) from public, anon;
grant execute on function public.create_staff_activation(uuid, text, text) to authenticated;

-- Redeems a link: returns the staff id only for a valid, unused, unexpired
-- token with the right code. A wrong code counts; the fifth burns the link.
-- Returns null (instead of raising) so the failed attempt is committed.
create function public.redeem_staff_activation(p_token_hash text, p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  activation public.staff_activations;
begin
  select * into activation
  from public.staff_activations a
  where a.token_hash = p_token_hash
    and a.used_at is null
    and a.expires_at > now()
    and a.failed_attempts < 5
  for update;

  if not found then
    return null;
  end if;

  if activation.code_hash is distinct from p_code_hash then
    update public.staff_activations
    set failed_attempts = failed_attempts + 1
    where id = activation.id;
    return null;
  end if;

  update public.staff_activations set used_at = now() where id = activation.id;
  if not exists (
    select 1 from public.staff_profiles where id = activation.staff_id and is_active
  ) then
    return null;
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id)
  values (activation.staff_id, 'login_link.used', 'staff_security', activation.staff_id::text);
  return activation.staff_id;
end;
$$;

revoke all on function public.redeem_staff_activation(text, text) from public, anon, authenticated;
grant execute on function public.redeem_staff_activation(text, text) to service_role;
