-- Project management core: event types with task templates, richer project
-- details, tasks, checklists, runbook (draaiboek) and revertible content
-- revisions. Same model as before: all active staff can read; project editors
-- write; owners/admins manage; assignees may only progress their own tasks.

create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.task_status as enum ('todo', 'in_progress', 'done');

-- ---------------------------------------------------------------------------
-- Event types and task templates
-- ---------------------------------------------------------------------------

create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60 and name = btrim(name)),
  description text check (char_length(description) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160 and title = btrim(title)),
  description text check (char_length(description) <= 2000),
  priority public.task_priority not null default 'normal',
  -- Due date = event start minus this many days (negative = after the event).
  days_before_event integer not null default 0 check (days_before_event between -60 and 365),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index task_templates_event_type_idx on public.task_templates (event_type_id, position);

-- ---------------------------------------------------------------------------
-- Project details
-- ---------------------------------------------------------------------------

alter table public.projects
  add column event_type_id uuid references public.event_types (id) on delete set null,
  add column budget_gta bigint not null default 0 check (budget_gta between 0 and 1000000000);

create index projects_event_type_idx on public.projects (event_type_id);

-- ---------------------------------------------------------------------------
-- Tasks, checklists, runbook
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160 and title = btrim(title)),
  description text check (char_length(description) <= 5000),
  assignee_id uuid references public.staff_profiles (id) on delete set null,
  due_at timestamptz,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'todo',
  position integer not null default 0,
  completed_at timestamptz,
  template_id uuid references public.task_templates (id) on delete set null,
  created_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_idx on public.tasks (project_id, status, position);
create index tasks_assignee_open_idx on public.tasks (assignee_id) where status <> 'done';
create index tasks_due_at_idx on public.tasks (due_at) where due_at is not null;
create index tasks_template_idx on public.tasks (template_id);
create index tasks_created_by_idx on public.tasks (created_by);

-- One table for project checklists and per-task checklists (task_id set).
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200 and title = btrim(title)),
  is_done boolean not null default false,
  done_by uuid references public.staff_profiles (id) on delete set null,
  done_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index checklist_items_project_idx on public.checklist_items (project_id, position);
create index checklist_items_task_idx on public.checklist_items (task_id, position);
create index checklist_items_done_by_idx on public.checklist_items (done_by);

create table public.runbook_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  starts_at timestamptz,
  title text not null check (char_length(title) between 1 and 160 and title = btrim(title)),
  details text check (char_length(details) <= 2000),
  responsible_id uuid references public.staff_profiles (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index runbook_items_project_idx on public.runbook_items (project_id, starts_at, position);
create index runbook_items_responsible_idx on public.runbook_items (responsible_id);

-- ---------------------------------------------------------------------------
-- Content revisions (who changed what, revertible)
-- ---------------------------------------------------------------------------

create table public.content_revisions (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  entity text not null check (entity in ('project', 'event')),
  changed_columns text[] not null,
  previous jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index content_revisions_project_idx on public.content_revisions (project_id, changed_at desc);

create function private.record_content_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  tracked text[] := case tg_table_name
    when 'projects' then array['title', 'description', 'event_type_id', 'budget_gta']
    else array['summary', 'description', 'rules', 'location', 'starts_at', 'ends_at',
               'capacity', 'entry_fee_gta', 'registration_mode']
  end;
  previous jsonb := '{}'::jsonb;
  changed text[] := '{}';
  col text;
begin
  foreach col in array tracked loop
    if new_row -> col is distinct from old_row -> col then
      previous := previous || jsonb_build_object(col, old_row -> col);
      changed := changed || col;
    end if;
  end loop;

  if cardinality(changed) > 0 then
    insert into public.content_revisions (project_id, entity, changed_columns, previous, changed_by)
    values (
      coalesce((new_row ->> 'project_id')::uuid, (new_row ->> 'id')::uuid),
      case when tg_table_name = 'projects' then 'project' else 'event' end,
      changed,
      previous,
      (select auth.uid())
    );
  end if;
  return null;
end;
$$;

revoke all on function private.record_content_revision() from public;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- The event title always follows the project name (entered once).
create function private.sync_event_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events set title = new.title where project_id = new.id and title <> new.title;
  return null;
end;
$$;

revoke all on function private.sync_event_title() from public;

-- Assignees who are not project editors may only progress their own task.
create function private.prepare_task()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  free_columns constant text[] := array['status', 'position', 'completed_at', 'updated_at'];
begin
  if tg_op = 'UPDATE' and current_user = 'authenticated'
     and not private.can_edit_project(old.project_id)
     and (to_jsonb(new) - free_columns) is distinct from (to_jsonb(old) - free_columns) then
    raise exception 'Assignees can only change the status of their own task' using errcode = '42501';
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- Task checklist items inherit the task's project; ticking records who/when;
-- assignees (non-editors) may only tick items of their own task.
create function private.prepare_checklist_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.task_id is not null then
    select t.project_id into new.project_id from public.tasks t where t.id = new.task_id;
  end if;

  if tg_op = 'UPDATE' and current_user = 'authenticated'
     and not private.can_edit_project(old.project_id)
     and (new.title is distinct from old.title or new.position is distinct from old.position) then
    raise exception 'Only project editors can change checklist items' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' or new.is_done is distinct from old.is_done then
    new.done_by := case when new.is_done then (select auth.uid()) end;
    new.done_at := case when new.is_done then now() end;
  end if;
  return new;
end;
$$;

create trigger projects_sync_event_title
  after update of title on public.projects
  for each row execute function private.sync_event_title();

create trigger projects_record_revision
  after update on public.projects
  for each row execute function private.record_content_revision();

create trigger events_record_revision
  after update on public.events
  for each row execute function private.record_content_revision();

create trigger tasks_prepare
  before insert or update on public.tasks
  for each row execute function private.prepare_task();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

create trigger checklist_items_prepare
  before insert or update on public.checklist_items
  for each row execute function private.prepare_checklist_item();

create trigger runbook_items_set_updated_at
  before update on public.runbook_items
  for each row execute function private.set_updated_at();

create trigger tasks_audit
  after insert or update or delete on public.tasks
  for each row execute function private.audit_row_change();

create trigger runbook_items_audit
  after insert or update or delete on public.runbook_items
  for each row execute function private.audit_row_change();

create trigger event_types_audit
  after insert or update or delete on public.event_types
  for each row execute function private.audit_row_change();

create trigger task_templates_audit
  after insert or update or delete on public.task_templates
  for each row execute function private.audit_row_change();

-- Record assignment and priority changes in the activity log diff as well.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  old_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  row_data jsonb := coalesce(new_row, old_row);
  changed text[] := '{}';
  diff jsonb := '{}'::jsonb;
  col text;
  tracked constant text[] := array[
    'role', 'is_active', 'status', 'registration_mode', 'permission', 'owner_id',
    'revoked_at', 'claimed_at', 'assignee_id', 'priority'
  ];
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key order by n.key), '{}')
    into changed
    from jsonb_each(new_row) n
    where n.key <> 'updated_at' and n.value is distinct from old_row -> n.key;

    if cardinality(changed) = 0 then
      return null;
    end if;

    foreach col in array changed loop
      if col = any (tracked) then
        diff := diff || jsonb_build_object(
          col, jsonb_build_object('from', old_row -> col, 'to', new_row -> col)
        );
      end if;
    end loop;
  end if;

  insert into public.activity_log (actor_id, action, entity_type, entity_id, project_id, details)
  values (
    (select auth.uid()),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(row_data ->> 'id', (row_data ->> 'project_id') || ':' || (row_data ->> 'staff_id')),
    case when tg_table_name = 'projects' then (row_data ->> 'id')::uuid
         else (row_data ->> 'project_id')::uuid end,
    case when tg_op = 'UPDATE'
         then jsonb_build_object('changed', to_jsonb(changed))
              || case when diff = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('diff', diff) end
         else '{}'::jsonb end
  );

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Functions (SECURITY INVOKER: grants and RLS of the caller apply)
-- ---------------------------------------------------------------------------

-- Creates a project with its event and the event type's standard tasks in one
-- transaction. Only admins and Event Managers pass the projects insert policy.
create function public.create_event_project(
  p_title text,
  p_event_type_id uuid default null,
  p_starts_at timestamptz default null,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_project_id uuid;
  base_slug text;
begin
  insert into public.projects (title, description, owner_id, event_type_id)
  values (p_title, p_description, (select auth.uid()), p_event_type_id)
  returning id into new_project_id;

  base_slug := left(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), 60);
  if base_slug = '' then
    base_slug := 'evenement';
  end if;

  insert into public.events (project_id, title, slug, starts_at)
  values (
    new_project_id,
    p_title,
    base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
    p_starts_at
  );

  insert into public.tasks (project_id, title, description, priority, due_at, position, template_id)
  select new_project_id, t.title, t.description, t.priority,
         case when p_starts_at is null then null
              else p_starts_at - make_interval(days => t.days_before_event) end,
         t.position, t.id
  from public.task_templates t
  where t.event_type_id = p_event_type_id
  order by t.position;

  return new_project_id;
end;
$$;

-- Updates project and event details atomically (editors only, via RLS).
create function public.update_event_project(
  p_project_id uuid,
  p_title text,
  p_event_type_id uuid,
  p_description text,
  p_budget_gta bigint,
  p_summary text,
  p_location text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_entry_fee_gta bigint,
  p_rules text,
  p_registration_mode public.registration_mode
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.projects
  set title = p_title,
      event_type_id = p_event_type_id,
      description = p_description,
      budget_gta = p_budget_gta
  where id = p_project_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Project not found or not editable' using errcode = '42501';
  end if;

  update public.events
  set summary = p_summary,
      location = p_location,
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      capacity = p_capacity,
      entry_fee_gta = p_entry_fee_gta,
      rules = p_rules,
      registration_mode = p_registration_mode
  where project_id = p_project_id;
end;
$$;

-- Restores the values a revision replaced (creates a new revision itself).
create function public.revert_content_revision(p_revision_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  revision public.content_revisions;
  previous jsonb;
  affected integer;
begin
  select * into revision from public.content_revisions where id = p_revision_id;
  if not found then
    raise exception 'Unknown revision' using errcode = '22023';
  end if;
  previous := revision.previous;

  if revision.entity = 'project' then
    update public.projects p
    set title = case when previous ? 'title' then previous ->> 'title' else p.title end,
        description = case when previous ? 'description' then previous ->> 'description' else p.description end,
        event_type_id = case when previous ? 'event_type_id' then (previous ->> 'event_type_id')::uuid else p.event_type_id end,
        budget_gta = case when previous ? 'budget_gta' then (previous ->> 'budget_gta')::bigint else p.budget_gta end
    where p.id = revision.project_id;
  else
    update public.events e
    set summary = case when previous ? 'summary' then previous ->> 'summary' else e.summary end,
        description = case when previous ? 'description' then previous ->> 'description' else e.description end,
        rules = case when previous ? 'rules' then previous ->> 'rules' else e.rules end,
        location = case when previous ? 'location' then previous ->> 'location' else e.location end,
        starts_at = case when previous ? 'starts_at' then (previous ->> 'starts_at')::timestamptz else e.starts_at end,
        ends_at = case when previous ? 'ends_at' then (previous ->> 'ends_at')::timestamptz else e.ends_at end,
        capacity = case when previous ? 'capacity' then (previous ->> 'capacity')::integer else e.capacity end,
        entry_fee_gta = case when previous ? 'entry_fee_gta' then (previous ->> 'entry_fee_gta')::bigint else e.entry_fee_gta end,
        registration_mode = case when previous ? 'registration_mode'
                                 then (previous ->> 'registration_mode')::public.registration_mode
                                 else e.registration_mode end
    where e.project_id = revision.project_id;
  end if;

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Not allowed to revert this revision' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.create_event_project(text, uuid, timestamptz, text) from public, anon;
revoke all on function public.update_event_project(uuid, text, uuid, text, bigint, text, text, timestamptz, timestamptz, integer, bigint, text, public.registration_mode) from public, anon;
revoke all on function public.revert_content_revision(bigint) from public, anon;
grant execute on function public.create_event_project(text, uuid, timestamptz, text) to authenticated;
grant execute on function public.update_event_project(uuid, text, uuid, text, bigint, text, text, timestamptz, timestamptz, integer, bigint, text, public.registration_mode) to authenticated;
grant execute on function public.revert_content_revision(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.event_types enable row level security;
alter table public.task_templates enable row level security;
alter table public.tasks enable row level security;
alter table public.checklist_items enable row level security;
alter table public.runbook_items enable row level security;
alter table public.content_revisions enable row level security;

revoke all on public.event_types, public.task_templates, public.tasks, public.checklist_items,
  public.runbook_items, public.content_revisions from anon, authenticated;

grant insert (event_type_id, budget_gta) on public.projects to authenticated;
grant update (event_type_id, budget_gta) on public.projects to authenticated;
-- The event title is maintained from the project name.
revoke update (title) on public.events from authenticated;

grant select, delete on public.event_types to authenticated;
grant insert (name, description) on public.event_types to authenticated;
grant update (name, description, is_active) on public.event_types to authenticated;

grant select, delete on public.task_templates to authenticated;
grant insert (event_type_id, title, description, priority, days_before_event, position)
  on public.task_templates to authenticated;
grant update (title, description, priority, days_before_event, position)
  on public.task_templates to authenticated;

grant select, delete on public.tasks to authenticated;
grant insert (project_id, title, description, assignee_id, due_at, priority, status, position, template_id)
  on public.tasks to authenticated;
grant update (title, description, assignee_id, due_at, priority, status, position)
  on public.tasks to authenticated;

grant select, delete on public.checklist_items to authenticated;
grant insert (project_id, task_id, title, is_done, position) on public.checklist_items to authenticated;
grant update (title, is_done, position) on public.checklist_items to authenticated;

grant select, delete on public.runbook_items to authenticated;
grant insert (project_id, starts_at, title, details, responsible_id, position)
  on public.runbook_items to authenticated;
grant update (starts_at, title, details, responsible_id, position)
  on public.runbook_items to authenticated;

grant select on public.content_revisions to authenticated;

-- event types and templates: readable by staff, managed by admins and Event Managers
create policy "Active staff can view event types"
  on public.event_types for select to authenticated
  using ((select private.is_staff()));
create policy "Admins and organizers add event types"
  on public.event_types for insert to authenticated
  with check ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));
create policy "Admins and organizers change event types"
  on public.event_types for update to authenticated
  using ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])))
  with check ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));
create policy "Admins and organizers delete event types"
  on public.event_types for delete to authenticated
  using ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));

create policy "Active staff can view task templates"
  on public.task_templates for select to authenticated
  using ((select private.is_staff()));
create policy "Admins and organizers add task templates"
  on public.task_templates for insert to authenticated
  with check ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));
create policy "Admins and organizers change task templates"
  on public.task_templates for update to authenticated
  using ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])))
  with check ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));
create policy "Admins and organizers delete task templates"
  on public.task_templates for delete to authenticated
  using ((select private.has_any_role(array['admin', 'organizer']::public.staff_role[])));

-- tasks
create policy "Active staff can view tasks"
  on public.tasks for select to authenticated
  using ((select private.is_staff()));
create policy "Project editors create tasks"
  on public.tasks for insert to authenticated
  with check (private.can_edit_project(project_id));
create policy "Project editors and assignees update tasks"
  on public.tasks for update to authenticated
  using (private.can_edit_project(project_id)
         or (assignee_id = (select auth.uid()) and (select private.is_staff())))
  with check (private.can_edit_project(project_id)
              or (assignee_id = (select auth.uid()) and (select private.is_staff())));
create policy "Project editors delete tasks"
  on public.tasks for delete to authenticated
  using (private.can_edit_project(project_id));

-- checklist items
create policy "Active staff can view checklist items"
  on public.checklist_items for select to authenticated
  using ((select private.is_staff()));
create policy "Project editors add checklist items"
  on public.checklist_items for insert to authenticated
  with check (private.can_edit_project(project_id));
create policy "Project editors and task assignees tick checklist items"
  on public.checklist_items for update to authenticated
  using (
    private.can_edit_project(project_id)
    or ((select private.is_staff()) and task_id is not null and exists (
      select 1 from public.tasks t where t.id = task_id and t.assignee_id = (select auth.uid())
    ))
  );
create policy "Project editors delete checklist items"
  on public.checklist_items for delete to authenticated
  using (private.can_edit_project(project_id));

-- runbook
create policy "Active staff can view the runbook"
  on public.runbook_items for select to authenticated
  using ((select private.is_staff()));
create policy "Project editors add runbook items"
  on public.runbook_items for insert to authenticated
  with check (private.can_edit_project(project_id));
create policy "Project editors change runbook items"
  on public.runbook_items for update to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));
create policy "Project editors delete runbook items"
  on public.runbook_items for delete to authenticated
  using (private.can_edit_project(project_id));

-- revisions (written by trigger only)
create policy "Active staff can view revisions"
  on public.content_revisions for select to authenticated
  using ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Reference data: event types from the brief with editable standard tasks.
-- ---------------------------------------------------------------------------

insert into public.event_types (name, description) values
  ('Motorrace', 'Race op de weg of het circuit.'),
  ('Offroad rally', 'Rally door ruig terrein.'),
  ('Jetskirace', 'Race op het water met jetski''s.'),
  ('Boottocht', 'Tocht over het water met boten.'),
  ('Jetskitocht', 'Toertocht met jetski''s.'),
  ('Parachute-evenement', 'Sprongen en landingen op een doel.'),
  ('Car meeting', 'Bijeenkomst om auto''s te tonen.'),
  ('Verstoppetje', 'Zoek- en verstopspel in een afgebakend gebied.');

insert into public.task_templates (event_type_id, title, priority, days_before_event, position)
select et.id, t.title, t.priority::public.task_priority, t.days, t.pos
from public.event_types et
cross join (values
  ('Datum, tijd en locatie vastleggen', 'high', 21, 10),
  ('Inschrijfgeld en prijzengeld bepalen', 'normal', 14, 20),
  ('Aankondiging voorbereiden en publiceren', 'normal', 14, 30),
  ('Draaiboek afronden', 'high', 3, 80),
  ('Evaluatie na afloop', 'low', -2, 90)
) as t(title, priority, days, pos);

insert into public.task_templates (event_type_id, title, priority, days_before_event, position)
select et.id, t.title, t.priority::public.task_priority, t.days, t.pos
from (values
  ('Motorrace', 'Route en checkpoints uitzetten op de kaart', 'high', 10, 40),
  ('Motorrace', 'Route testrijden', 'normal', 3, 50),
  ('Offroad rally', 'Route en checkpoints uitzetten op de kaart', 'high', 10, 40),
  ('Offroad rally', 'Route testrijden', 'normal', 3, 50),
  ('Jetskirace', 'Parcours en boeien uitzetten op de kaart', 'high', 10, 40),
  ('Jetskirace', 'Parcours testvaren', 'normal', 3, 50),
  ('Boottocht', 'Vaarroute uitzetten op de kaart', 'high', 10, 40),
  ('Jetskitocht', 'Vaarroute uitzetten op de kaart', 'high', 10, 40),
  ('Parachute-evenement', 'Sprongplek en landingszone bepalen', 'high', 10, 40),
  ('Car meeting', 'Locatie en parkeerindeling regelen', 'high', 7, 40),
  ('Verstoppetje', 'Speelgebied en spelregels bepalen', 'high', 7, 40)
) as t(type_name, title, priority, days, pos)
join public.event_types et on et.name = t.type_name;
