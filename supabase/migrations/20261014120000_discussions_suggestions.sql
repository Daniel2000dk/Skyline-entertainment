-- Discussions (comments with one level of replies) and suggestions that
-- propose a change without editing the project. All active staff can read
-- and take part; owners/admins decide on suggestions.

create type public.suggestion_status as enum ('open', 'accepted', 'rejected', 'withdrawn');

-- Fields a suggestion may change (same whitelist as the revision trigger).
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  field text check (field in (
    'title', 'description', 'budget_gta', 'summary', 'rules', 'location',
    'starts_at', 'ends_at', 'capacity', 'entry_fee_gta'
  )),
  proposed_value text check (char_length(proposed_value) <= 5000),
  message text not null check (char_length(message) between 1 and 2000 and message = btrim(message)),
  status public.suggestion_status not null default 'open',
  decided_by uuid references public.staff_profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (char_length(decision_note) <= 1000),
  created_at timestamptz not null default now(),
  -- A field change always carries a value; a free-form idea carries none.
  check ((field is null) = (proposed_value is null))
);

create index suggestions_project_idx on public.suggestions (project_id, status, created_at desc);
create index suggestions_author_idx on public.suggestions (author_id);
create index suggestions_decided_by_idx on public.suggestions (decided_by);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  suggestion_id uuid references public.suggestions (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  author_id uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (num_nonnulls(project_id, task_id, suggestion_id) = 1)
);

create index comments_project_idx on public.comments (project_id, created_at) where project_id is not null;
create index comments_task_idx on public.comments (task_id, created_at) where task_id is not null;
create index comments_suggestion_idx on public.comments (suggestion_id, created_at) where suggestion_id is not null;
create index comments_parent_idx on public.comments (parent_id);
create index comments_author_idx on public.comments (author_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Replies always belong to the same subject as the thread they answer, and
-- threads are one level deep (a reply to a reply attaches to the root).
create function private.prepare_comment()
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
    end if;
    return new;
  end if;

  -- Updates: authors edit their own text; admins may only remove.
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

-- Status transitions: author withdraws an open suggestion; owner/admin
-- accepts or rejects it. Decisions record who and when.
create function private.prepare_suggestion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    if current_user = 'authenticated'
       and (new.decision_note is distinct from old.decision_note) then
      raise exception 'Decision notes are set when deciding' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.status <> 'open' then
    raise exception 'This suggestion has already been handled' using errcode = '22023';
  end if;

  if new.status = 'withdrawn' then
    if current_user = 'authenticated' and old.author_id is distinct from (select auth.uid()) then
      raise exception 'Only the author can withdraw a suggestion' using errcode = '42501';
    end if;
  elsif new.status in ('accepted', 'rejected') then
    if current_user = 'authenticated' and not private.can_manage_project(old.project_id) then
      raise exception 'Only the project owner or an admin can decide' using errcode = '42501';
    end if;
  else
    raise exception 'Invalid status change' using errcode = '22023';
  end if;

  new.decided_by := (select auth.uid());
  new.decided_at := now();
  return new;
end;
$$;

create trigger comments_prepare
  before insert or update on public.comments
  for each row execute function private.prepare_comment();

create trigger suggestions_prepare
  before update on public.suggestions
  for each row execute function private.prepare_suggestion();

create trigger suggestions_audit
  after insert or update or delete on public.suggestions
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------------
-- Deciding (applies an accepted change in the same transaction)
-- ---------------------------------------------------------------------------

create function public.decide_suggestion(p_suggestion_id uuid, p_accept boolean, p_note text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  suggestion public.suggestions;
  value text;
  affected integer;
begin
  select * into suggestion from public.suggestions where id = p_suggestion_id for update;
  if not found then
    raise exception 'Unknown suggestion' using errcode = '22023';
  end if;
  if suggestion.status <> 'open' then
    raise exception 'This suggestion has already been handled' using errcode = '22023';
  end if;

  if p_accept and suggestion.field is not null then
    value := suggestion.proposed_value;
    if suggestion.field in ('title', 'description', 'budget_gta') then
      update public.projects p
      set title = case when suggestion.field = 'title' then value else p.title end,
          description = case when suggestion.field = 'description' then value else p.description end,
          budget_gta = case when suggestion.field = 'budget_gta' then value::bigint else p.budget_gta end
      where p.id = suggestion.project_id;
    else
      update public.events e
      set summary = case when suggestion.field = 'summary' then value else e.summary end,
          rules = case when suggestion.field = 'rules' then value else e.rules end,
          location = case when suggestion.field = 'location' then value else e.location end,
          starts_at = case when suggestion.field = 'starts_at' then value::timestamptz else e.starts_at end,
          ends_at = case when suggestion.field = 'ends_at' then value::timestamptz else e.ends_at end,
          capacity = case when suggestion.field = 'capacity' then value::integer else e.capacity end,
          entry_fee_gta = case when suggestion.field = 'entry_fee_gta' then value::bigint else e.entry_fee_gta end
      where e.project_id = suggestion.project_id;
    end if;
    get diagnostics affected = row_count;
    if affected = 0 then
      raise exception 'Not allowed to change this project' using errcode = '42501';
    end if;
  end if;

  update public.suggestions
  set status = case when p_accept then 'accepted'::public.suggestion_status
                    else 'rejected'::public.suggestion_status end,
      decision_note = nullif(btrim(p_note), '')
  where id = p_suggestion_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Not allowed to decide on this suggestion' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.decide_suggestion(uuid, boolean, text) from public, anon;
grant execute on function public.decide_suggestion(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.suggestions enable row level security;
alter table public.comments enable row level security;
revoke all on public.suggestions, public.comments from anon, authenticated;

grant select on public.suggestions to authenticated;
grant insert (project_id, field, proposed_value, message) on public.suggestions to authenticated;
grant update (status, decision_note) on public.suggestions to authenticated;

grant select on public.comments to authenticated;
grant insert (project_id, task_id, suggestion_id, parent_id, body) on public.comments to authenticated;
grant update (body, deleted_at) on public.comments to authenticated;

create policy "Active staff can view suggestions"
  on public.suggestions for select to authenticated
  using ((select private.is_staff()));
create policy "Active staff can make suggestions"
  on public.suggestions for insert to authenticated
  with check ((select private.is_staff()) and status = 'open');
create policy "Authors and project managers update suggestions"
  on public.suggestions for update to authenticated
  using ((select private.is_staff())
         and (author_id = (select auth.uid()) or private.can_manage_project(project_id)))
  with check ((select private.is_staff())
              and (author_id = (select auth.uid()) or private.can_manage_project(project_id)));

create policy "Active staff can read discussions"
  on public.comments for select to authenticated
  using ((select private.is_staff()));
create policy "Active staff can comment"
  on public.comments for insert to authenticated
  with check ((select private.is_staff()) and deleted_at is null and edited_at is null);
create policy "Authors edit; authors and admins remove"
  on public.comments for update to authenticated
  using ((select private.is_staff())
         and (author_id = (select auth.uid()) or (select private.is_admin())))
  with check ((select private.is_staff())
              and (author_id = (select auth.uid()) or (select private.is_admin())));
