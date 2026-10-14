-- Dashboard figures, computed in the database in one round trip with the
-- caller's rights (RLS applies). Periods are [from, to); buckets use the
-- community time zone. Participation and money figures arrive with the
-- registration (phase C) and finance (phase D) modules.

create function public.dashboard_summary(p_from timestamptz, p_to timestamptz, p_granularity text default 'month')
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'events_held', (
      select count(*) from public.events e join public.projects p on p.id = e.project_id
      where e.starts_at >= p_from and e.starts_at < p_to and p.status in ('completed', 'archived')
    ),
    'events_in_period', (
      select count(*) from public.events e join public.projects p on p.id = e.project_id
      where e.starts_at >= p_from and e.starts_at < p_to and p.status <> 'cancelled'
    ),
    'upcoming_events', (
      select count(*) from public.events e join public.projects p on p.id = e.project_id
      where e.starts_at >= now() and p.status in ('approved', 'in_preparation', 'published')
    ),
    'open_tasks', (select count(*) from public.tasks where status <> 'done'),
    'overdue_tasks', (select count(*) from public.tasks where status <> 'done' and due_at < now()),
    'my_open_tasks', (
      select count(*) from public.tasks where status <> 'done' and assignee_id = (select auth.uid())
    ),
    'tasks_completed', (
      select count(*) from public.tasks where completed_at >= p_from and completed_at < p_to
    ),
    'open_ideas', (select count(*) from public.ideas where status in ('new', 'discussing')),
    'events_per_bucket', (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'count', total) order by bucket), '[]'::jsonb)
      from (
        select to_char(
                 date_trunc(case when p_granularity = 'day' then 'day' else 'month' end,
                            e.starts_at at time zone 'Europe/Amsterdam'),
                 case when p_granularity = 'day' then 'YYYY-MM-DD' else 'YYYY-MM' end
               ) as bucket,
               count(*) as total
        from public.events e join public.projects p on p.id = e.project_id
        where e.starts_at >= p_from and e.starts_at < p_to and p.status <> 'cancelled'
        group by 1
      ) buckets
    )
  )
  where (select private.is_staff())
$$;

revoke all on function public.dashboard_summary(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.dashboard_summary(timestamptz, timestamptz, text) to authenticated;
