-- Projects (one workspace per event), per-project permissions and events.
--
-- Permission model:
-- * All active staff can view every project, member list and event.
-- * Admins and organizers (Event Managers) create projects; creator = owner.
-- * "Manage" (status, members, ownership, delete) = admin or project owner.
-- * "Edit" content = manage, or a member with the 'editor' permission.
-- * anon has no table access at all. Public, whitelisted read functions are
--   added together with the public event pages (phase C).

-- Idee → In bespreking → Goedgekeurd → In voorbereiding → Gepubliceerd →
-- Afgerond → Gearchiveerd, or Geannuleerd at any point.
create type public.project_status as enum (
  'idea', 'under_review', 'approved', 'in_preparation',
  'published', 'completed', 'archived', 'cancelled'
);
create type public.project_permission as enum ('editor', 'commenter');
create type public.registration_mode as enum ('closed', 'open', 'approval');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  status public.project_status not null default 'idea',
  description text check (char_length(description) <= 5000),
  owner_id uuid not null references public.staff_profiles (id),
  created_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_created_by_idx on public.projects (created_by);
create index projects_status_idx on public.projects (status);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  staff_id uuid not null references public.staff_profiles (id) on delete cascade,
  permission public.project_permission not null default 'commenter',
  added_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, staff_id)
);

create index project_members_staff_id_idx on public.project_members (staff_id);
create index project_members_added_by_idx on public.project_members (added_by);

-- The public-facing part of an event project. Visibility follows the
-- project's status, so publication state is never entered twice.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  slug text not null unique
    check (char_length(slug) <= 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 5000),
  rules text check (char_length(rules) <= 5000),
  location text check (char_length(location) <= 120),
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity between 1 and 1000),
  -- Whole in-game GTA dollars; never real money.
  entry_fee_gta bigint not null default 0 check (entry_fee_gta between 0 and 1000000000),
  registration_mode public.registration_mode not null default 'closed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index events_starts_at_idx on public.events (starts_at);

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

create function private.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or (
      private.is_staff()
      and exists (
        select 1 from public.projects p
        where p.id = target_project_id and p.owner_id = (select auth.uid())
      )
    )
$$;

create function private.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_project(target_project_id)
    or (
      private.is_staff()
      and exists (
        select 1 from public.project_members m
        where m.project_id = target_project_id
          and m.staff_id = (select auth.uid())
          and m.permission = 'editor'
      )
    )
$$;

revoke all on function private.can_manage_project(uuid) from public;
revoke all on function private.can_edit_project(uuid) from public;
grant execute on function private.can_manage_project(uuid) to authenticated, service_role;
grant execute on function private.can_edit_project(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Editors may change content; status and ownership are manager decisions.
-- Publishing requires an event with a start time.
create function private.guard_project_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.owner_id is distinct from old.owner_id or new.status is distinct from old.status)
     and not private.can_manage_project(old.id) then
    raise exception 'Only the project owner or an admin can change status or ownership'
      using errcode = '42501';
  end if;

  if new.status = 'published' and old.status is distinct from 'published'
     and not exists (
       select 1 from public.events e where e.project_id = new.id and e.starts_at is not null
     ) then
    raise exception 'A project can only be published once its event has a start time'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- New projects always start in the pipeline; publishing happens via update.
create function private.guard_project_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('published', 'completed', 'archived') then
    raise exception 'New projects cannot start as %', new.status using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A published event must keep its start time.
create function private.guard_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.starts_at is null
     and exists (
       select 1 from public.projects p where p.id = new.project_id and p.status = 'published'
     ) then
    raise exception 'A published event needs a start time' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger projects_guard_insert
  before insert on public.projects
  for each row execute function private.guard_project_insert();

create trigger projects_guard_update
  before update on public.projects
  for each row execute function private.guard_project_update();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

create trigger events_guard_update
  before update on public.events
  for each row execute function private.guard_event_update();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.events enable row level security;

revoke all on public.projects from anon, authenticated;
revoke all on public.project_members from anon, authenticated;
revoke all on public.events from anon, authenticated;

grant select, delete on public.projects to authenticated;
grant insert (title, status, description, owner_id) on public.projects to authenticated;
grant update (title, status, description, owner_id) on public.projects to authenticated;

grant select, delete on public.project_members to authenticated;
grant insert (project_id, staff_id, permission) on public.project_members to authenticated;
grant update (permission) on public.project_members to authenticated;

grant select, delete on public.events to authenticated;
grant insert (
  project_id, title, slug, summary, description, rules, location,
  starts_at, ends_at, capacity, entry_fee_gta, registration_mode
) on public.events to authenticated;
grant update (
  title, slug, summary, description, rules, location,
  starts_at, ends_at, capacity, entry_fee_gta, registration_mode
) on public.events to authenticated;

-- projects
create policy "Active staff can view projects"
  on public.projects for select
  to authenticated
  using ((select private.is_staff()));

create policy "Admins and organizers create projects they own"
  on public.projects for insert
  to authenticated
  with check (
    (select private.has_any_role(array['admin', 'organizer']::public.staff_role[]))
    and (owner_id = (select auth.uid()) or (select private.is_admin()))
  );

create policy "Project editors can update projects"
  on public.projects for update
  to authenticated
  using (private.can_edit_project(id))
  with check (private.can_edit_project(id));

create policy "Project managers can delete projects"
  on public.projects for delete
  to authenticated
  using (private.can_manage_project(id));

-- project_members
create policy "Active staff can view project members"
  on public.project_members for select
  to authenticated
  using ((select private.is_staff()));

create policy "Project managers add members"
  on public.project_members for insert
  to authenticated
  with check (private.can_manage_project(project_id));

create policy "Project managers change member permissions"
  on public.project_members for update
  to authenticated
  using (private.can_manage_project(project_id))
  with check (private.can_manage_project(project_id));

create policy "Project managers remove members"
  on public.project_members for delete
  to authenticated
  using (private.can_manage_project(project_id));

-- events
create policy "Active staff can view events"
  on public.events for select
  to authenticated
  using ((select private.is_staff()));

create policy "Project editors create events"
  on public.events for insert
  to authenticated
  with check (private.can_edit_project(project_id));

create policy "Project editors update events"
  on public.events for update
  to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Project managers delete events"
  on public.events for delete
  to authenticated
  using (private.can_manage_project(project_id));
