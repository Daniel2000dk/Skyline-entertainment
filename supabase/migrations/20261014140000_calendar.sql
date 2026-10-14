-- Shared calendar. Events (start times) and tasks (deadlines) already live in
-- their own tables; only team activities that belong to neither are stored
-- here, so nothing has to be entered twice.

create table public.team_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  description text check (char_length(description) <= 2000),
  location text check (char_length(location) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  responsible_id uuid references public.staff_profiles (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index team_activities_starts_at_idx on public.team_activities (starts_at);
create index team_activities_responsible_idx on public.team_activities (responsible_id);
create index team_activities_project_idx on public.team_activities (project_id);
create index team_activities_created_by_idx on public.team_activities (created_by);

create trigger team_activities_set_updated_at
  before update on public.team_activities
  for each row execute function private.set_updated_at();

create trigger team_activities_audit
  after insert or update or delete on public.team_activities
  for each row execute function private.audit_row_change();

-- Moves an event; its end moves along so the duration stays the same.
create function public.reschedule_event(p_project_id uuid, p_starts_at timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.events
  set ends_at = case when ends_at is null or starts_at is null then ends_at
                     else ends_at + (p_starts_at - starts_at) end,
      starts_at = p_starts_at
  where project_id = p_project_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Not allowed to reschedule this event' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.reschedule_event(uuid, timestamptz) from public, anon;
grant execute on function public.reschedule_event(uuid, timestamptz) to authenticated;

alter table public.team_activities enable row level security;
revoke all on public.team_activities from anon, authenticated;

grant select, delete on public.team_activities to authenticated;
grant insert (title, description, location, starts_at, ends_at, responsible_id, project_id)
  on public.team_activities to authenticated;
grant update (title, description, location, starts_at, ends_at, responsible_id, project_id)
  on public.team_activities to authenticated;

create policy "Active staff can view team activities"
  on public.team_activities for select to authenticated
  using ((select private.is_staff()));
create policy "Active staff can plan team activities"
  on public.team_activities for insert to authenticated
  with check ((select private.is_staff()));
create policy "Creators and organizers change team activities"
  on public.team_activities for update to authenticated
  using ((select private.is_staff())
         and (created_by = (select auth.uid())
              or (select private.has_any_role(array['admin', 'organizer']::public.staff_role[]))))
  with check ((select private.is_staff()));
create policy "Creators and organizers remove team activities"
  on public.team_activities for delete to authenticated
  using ((select private.is_staff())
         and (created_by = (select auth.uid())
              or (select private.has_any_role(array['admin', 'organizer']::public.staff_role[]))));
