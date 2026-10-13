-- Append-only activity log, written exclusively by audit triggers.
--
-- * No foreign keys: history must survive deletion of projects or staff.
-- * Logs which columns changed, plus before/after values only for small,
--   non-sensitive enum-like columns. Never emails, free text or secrets.
-- * Nobody (not even service_role) can update or delete entries via the API.

create table public.activity_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  project_id uuid,
  details jsonb not null default '{}'::jsonb
);

create index activity_log_occurred_at_idx on public.activity_log (occurred_at desc);
create index activity_log_project_id_idx on public.activity_log (project_id, occurred_at desc);

comment on table public.activity_log is
  'Append-only audit trail. actor_id null = system/service action.';

create function private.audit_row_change()
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
    'role', 'is_active', 'status', 'registration_mode',
    'permission', 'owner_id', 'revoked_at', 'claimed_at'
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
         then jsonb_build_object('changed', to_jsonb(changed)) || case when diff = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('diff', diff) end
         else '{}'::jsonb end
  );

  return null;
end;
$$;

revoke all on function private.audit_row_change() from public;

create trigger staff_profiles_audit
  after insert or update or delete on public.staff_profiles
  for each row execute function private.audit_row_change();

create trigger staff_invitations_audit
  after insert or update or delete on public.staff_invitations
  for each row execute function private.audit_row_change();

create trigger projects_audit
  after insert or update or delete on public.projects
  for each row execute function private.audit_row_change();

create trigger project_members_audit
  after insert or update or delete on public.project_members
  for each row execute function private.audit_row_change();

create trigger events_audit
  after insert or update or delete on public.events
  for each row execute function private.audit_row_change();

alter table public.activity_log enable row level security;

revoke all on public.activity_log from anon, authenticated, service_role;
grant select on public.activity_log to authenticated, service_role;

-- Admins see everything (incl. staff/invitation changes); other staff see
-- project-related history only.
create policy "Admins view all activity; staff view project activity"
  on public.activity_log for select
  to authenticated
  using ((select private.is_admin()) or (project_id is not null and (select private.is_staff())));
