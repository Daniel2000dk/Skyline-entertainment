-- Ideas board (ideas, votes, discussion) and file attachments for projects
-- and ideas in a private storage bucket. Approved ideas become projects
-- without retyping; their discussion stays linked to the project.

create type public.idea_status as enum ('new', 'discussing', 'approved', 'rejected', 'converted');

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  description text check (char_length(description) <= 5000),
  author_id uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  status public.idea_status not null default 'new',
  project_id uuid unique references public.projects (id) on delete set null,
  decided_by uuid references public.staff_profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ideas_status_idx on public.ideas (status, created_at desc);
create index ideas_author_idx on public.ideas (author_id);
create index ideas_decided_by_idx on public.ideas (decided_by);

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  staff_id uuid not null default auth.uid() references public.staff_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, staff_id)
);

create index idea_votes_staff_idx on public.idea_votes (staff_id);

-- Discussions on ideas reuse the comments table.
alter table public.comments
  add column idea_id uuid references public.ideas (id) on delete cascade;
alter table public.comments drop constraint comments_check;
alter table public.comments
  add constraint comments_one_subject check (num_nonnulls(project_id, task_id, suggestion_id, idea_id) = 1);
create index comments_idea_idx on public.comments (idea_id, created_at) where idea_id is not null;

create or replace function private.prepare_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.comments;
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      select * into parent from public.comments where id = new.parent_id;
      if not found then
        raise exception 'Unknown parent comment' using errcode = '23503';
      end if;
      new.parent_id := coalesce(parent.parent_id, parent.id);
      new.project_id := parent.project_id;
      new.task_id := parent.task_id;
      new.suggestion_id := parent.suggestion_id;
      new.idea_id := parent.idea_id;
    end if;
    return new;
  end if;

  if current_user = 'authenticated' and new.body is distinct from old.body then
    if old.author_id is distinct from (select auth.uid()) then
      raise exception 'Only the author can edit a comment' using errcode = '42501';
    end if;
    if old.deleted_at is not null then
      raise exception 'Removed comments cannot be edited' using errcode = '42501';
    end if;
    new.edited_at := now();
  end if;
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'Removed comments cannot be restored' using errcode = '42501';
  end if;
  return new;
end;
$$;

grant insert (idea_id) on public.comments to authenticated;

-- ---------------------------------------------------------------------------
-- Idea rules
-- ---------------------------------------------------------------------------

-- Authors (or admins) improve open ideas; admins and Event Managers decide;
-- converting is only possible from "approved" into a project they manage.
create function private.guard_idea_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.title is distinct from old.title or new.description is distinct from old.description then
    if old.author_id is distinct from (select auth.uid()) and not private.is_admin() then
      raise exception 'Only the author can edit an idea' using errcode = '42501';
    end if;
    if old.status in ('converted', 'rejected') then
      raise exception 'Closed ideas cannot be edited' using errcode = '22023';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not private.has_any_role(array['admin', 'organizer']::public.staff_role[]) then
      raise exception 'Only admins and Event Managers decide on ideas' using errcode = '42501';
    end if;
    if old.status = 'converted' then
      raise exception 'A converted idea cannot change status' using errcode = '22023';
    end if;
    if new.status in ('approved', 'rejected') then
      new.decided_by := (select auth.uid());
      new.decided_at := now();
    end if;
  end if;

  if new.project_id is distinct from old.project_id then
    if not (new.status = 'converted' and old.status = 'approved' and old.project_id is null
            and private.can_manage_project(new.project_id)) then
      raise exception 'Ideas are linked to projects only by converting them' using errcode = '42501';
    end if;
  elsif new.status = 'converted' then
    raise exception 'Use convert_idea_to_project to convert an idea' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger ideas_guard_update
  before update on public.ideas
  for each row execute function private.guard_idea_update();

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function private.set_updated_at();

create trigger ideas_audit
  after insert or update or delete on public.ideas
  for each row execute function private.audit_row_change();

create function public.convert_idea_to_project(p_idea_id uuid, p_event_type_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  idea public.ideas;
  new_project_id uuid;
begin
  select * into idea from public.ideas where id = p_idea_id for update;
  if not found then
    raise exception 'Unknown idea' using errcode = '22023';
  end if;
  if idea.status <> 'approved' then
    raise exception 'Only approved ideas can become a project' using errcode = '22023';
  end if;

  new_project_id := public.create_event_project(idea.title, p_event_type_id, null, idea.description);
  update public.projects set status = 'approved' where id = new_project_id;
  update public.ideas set status = 'converted', project_id = new_project_id where id = p_idea_id;
  return new_project_id;
end;
$$;

revoke all on function public.convert_idea_to_project(uuid, uuid) from public, anon;
grant execute on function public.convert_idea_to_project(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Attachments (metadata) + private storage bucket
-- ---------------------------------------------------------------------------

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  idea_id uuid references public.ideas (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  file_name text not null check (char_length(file_name) between 1 and 200),
  content_type text not null check (content_type in (
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'
  )),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  uploaded_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(project_id, idea_id) = 1),
  check (
    storage_path like case when project_id is not null
                           then 'projects/' || project_id::text || '/%'
                           else 'ideas/' || idea_id::text || '/%' end
  )
);

create index attachments_project_idx on public.attachments (project_id, created_at) where project_id is not null;
create index attachments_idea_idx on public.attachments (idea_id, created_at) where idea_id is not null;
create index attachments_uploaded_by_idx on public.attachments (uploaded_by);

-- Who may add/remove files under "projects/<id>/…" or "ideas/<id>/…".
create function private.can_write_attachment(object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(object_path, '/');
  target uuid;
begin
  if coalesce(array_length(parts, 1), 0) < 3
     or parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target := parts[2]::uuid;
  if parts[1] = 'projects' then
    return private.can_edit_project(target);
  elsif parts[1] = 'ideas' then
    return private.is_staff() and (
      private.has_any_role(array['admin', 'organizer']::public.staff_role[])
      or exists (select 1 from public.ideas i where i.id = target and i.author_id = (select auth.uid()))
    );
  end if;
  return false;
end;
$$;

revoke all on function private.can_write_attachment(text) from public;
grant execute on function private.can_write_attachment(text) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-files', 'staff-files', false, 4194304,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Active staff can read staff files"
  on storage.objects for select to authenticated
  using (bucket_id = 'staff-files' and (select private.is_staff()));
create policy "Permitted staff can upload staff files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'staff-files' and private.can_write_attachment(name));
create policy "Permitted staff can delete staff files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'staff-files' and private.can_write_attachment(name));

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.attachments enable row level security;
revoke all on public.ideas, public.idea_votes, public.attachments from anon, authenticated;

grant select, delete on public.ideas to authenticated;
grant insert (title, description) on public.ideas to authenticated;
grant update (title, description, status, project_id) on public.ideas to authenticated;

grant select, delete on public.idea_votes to authenticated;
grant insert (idea_id) on public.idea_votes to authenticated;

grant select, delete on public.attachments to authenticated;
grant insert (project_id, idea_id, storage_path, file_name, content_type, size_bytes)
  on public.attachments to authenticated;

create policy "Active staff can view ideas"
  on public.ideas for select to authenticated
  using ((select private.is_staff()));
create policy "Active staff can add ideas"
  on public.ideas for insert to authenticated
  with check ((select private.is_staff()) and status = 'new');
create policy "Authors and decision makers update ideas"
  on public.ideas for update to authenticated
  using ((select private.is_staff())
         and (author_id = (select auth.uid())
              or (select private.has_any_role(array['admin', 'organizer']::public.staff_role[]))))
  with check ((select private.is_staff()));
create policy "Authors remove new ideas; admins remove any"
  on public.ideas for delete to authenticated
  using ((select private.is_admin())
         or (author_id = (select auth.uid()) and status = 'new' and (select private.is_staff())));

create policy "Active staff can view votes"
  on public.idea_votes for select to authenticated
  using ((select private.is_staff()));
create policy "Staff vote for themselves on open ideas"
  on public.idea_votes for insert to authenticated
  with check (
    (select private.is_staff()) and staff_id = (select auth.uid())
    and exists (select 1 from public.ideas i where i.id = idea_id and i.status in ('new', 'discussing'))
  );
create policy "Staff remove their own vote"
  on public.idea_votes for delete to authenticated
  using (staff_id = (select auth.uid()));

create policy "Active staff can view attachments"
  on public.attachments for select to authenticated
  using ((select private.is_staff()));
create policy "Permitted staff add attachments"
  on public.attachments for insert to authenticated
  with check (private.can_write_attachment(storage_path));
create policy "Permitted staff remove attachments"
  on public.attachments for delete to authenticated
  using (private.can_write_attachment(storage_path) or uploaded_by = (select auth.uid()));
