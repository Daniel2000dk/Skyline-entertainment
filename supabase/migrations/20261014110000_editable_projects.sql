-- The projects the current staff member may edit, so the UI can show edit
-- controls on lists spanning many projects. Same rule as the RLS policies
-- (private.can_edit_project); the database still enforces every write.

create function public.my_editable_project_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id from public.projects p where private.can_edit_project(p.id)
$$;

revoke all on function public.my_editable_project_ids() from public, anon;
grant execute on function public.my_editable_project_ids() to authenticated;
