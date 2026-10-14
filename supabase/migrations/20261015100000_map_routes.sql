-- GTA V map: routes and markers per project, drawn on the map image the owner
-- supplied. Coordinates are relative to that image (x and y from 0 to 1, from
-- the top-left corner), so a sharper version of the same map can replace it
-- without moving anything. All staff can view; project editors draw.

-- A route is an ordered list of points: the first is the start, the last the
-- finish (or the start again for a loop); points can be marked as checkpoint.
create function private.valid_map_points(points jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(points) = 'array'
    and jsonb_array_length(points) <= 300
    and not exists (
      select 1
      from jsonb_array_elements(points) as p(point)
      where jsonb_typeof(p.point) is distinct from 'object'
         or not (case when jsonb_typeof(p.point -> 'x') = 'number'
                      then (p.point ->> 'x')::numeric between 0 and 1 else false end)
         or not (case when jsonb_typeof(p.point -> 'y') = 'number'
                      then (p.point ->> 'y')::numeric between 0 and 1 else false end)
         or (p.point ? 'checkpoint' and jsonb_typeof(p.point -> 'checkpoint') <> 'boolean')
         or exists (select 1 from jsonb_object_keys(p.point) as k(key)
                    where k.key not in ('x', 'y', 'checkpoint'))
    )
$$;

create table public.map_routes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80 and name = btrim(name)),
  color text not null default 'gold' check (color in ('gold', 'blue', 'green', 'red', 'white')),
  points jsonb not null default '[]'::jsonb check (private.valid_map_points(points)),
  is_loop boolean not null default false,
  notes text check (char_length(notes) <= 1000),
  created_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index map_routes_project_idx on public.map_routes (project_id, created_at);
create index map_routes_created_by_idx on public.map_routes (created_by);

create table public.map_markers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80 and label = btrim(label)),
  note text check (char_length(note) <= 1000),
  x double precision not null check (x between 0 and 1),
  y double precision not null check (y between 0 and 1),
  created_by uuid default auth.uid() references public.staff_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index map_markers_project_idx on public.map_markers (project_id, created_at);
create index map_markers_created_by_idx on public.map_markers (created_by);

create trigger map_routes_set_updated_at
  before update on public.map_routes
  for each row execute function private.set_updated_at();
create trigger map_markers_set_updated_at
  before update on public.map_markers
  for each row execute function private.set_updated_at();

create trigger map_routes_audit
  after insert or update or delete on public.map_routes
  for each row execute function private.audit_row_change();
create trigger map_markers_audit
  after insert or update or delete on public.map_markers
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.map_routes enable row level security;
alter table public.map_markers enable row level security;
revoke all on public.map_routes, public.map_markers from anon, authenticated;

grant select, delete on public.map_routes, public.map_markers to authenticated;
grant insert (project_id, name, color, points, is_loop, notes) on public.map_routes to authenticated;
grant update (name, color, points, is_loop, notes) on public.map_routes to authenticated;
grant insert (project_id, label, note, x, y) on public.map_markers to authenticated;
grant update (label, note, x, y) on public.map_markers to authenticated;

create policy "Active staff can view routes"
  on public.map_routes for select to authenticated
  using ((select private.is_staff()));
create policy "Project editors add routes"
  on public.map_routes for insert to authenticated
  with check (private.can_edit_project(project_id));
create policy "Project editors change routes"
  on public.map_routes for update to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));
create policy "Project editors delete routes"
  on public.map_routes for delete to authenticated
  using (private.can_edit_project(project_id));

create policy "Active staff can view markers"
  on public.map_markers for select to authenticated
  using ((select private.is_staff()));
create policy "Project editors add markers"
  on public.map_markers for insert to authenticated
  with check (private.can_edit_project(project_id));
create policy "Project editors change markers"
  on public.map_markers for update to authenticated
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));
create policy "Project editors delete markers"
  on public.map_markers for delete to authenticated
  using (private.can_edit_project(project_id));

-- ---------------------------------------------------------------------------
-- Map image: private bucket, readable by active staff only. It is uploaded
-- with the secret key (scripts/upload-map.mjs); nobody writes via the API.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maps', 'maps', false, 52428800, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Active staff can read the map"
  on storage.objects for select to authenticated
  using (bucket_id = 'maps' and (select private.is_staff()));
