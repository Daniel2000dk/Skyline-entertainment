begin;
select plan(7);

select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('buitenstaander@skyline.test');

-- Fixed data in 2031 so other local data cannot influence the counts.
insert into public.projects (id, title, owner_id, status) values
  ('00000000-0000-4000-8000-000000000001', 'Gehouden', tests.user_id('manager@skyline.test'), 'idea'),
  ('00000000-0000-4000-8000-000000000002', 'Gepland', tests.user_id('manager@skyline.test'), 'in_preparation'),
  ('00000000-0000-4000-8000-000000000003', 'Afgelast', tests.user_id('manager@skyline.test'), 'cancelled');
insert into public.events (project_id, title, slug, starts_at) values
  ('00000000-0000-4000-8000-000000000001', 'Gehouden', 'dash-1', '2031-03-10 19:00+00'),
  ('00000000-0000-4000-8000-000000000002', 'Gepland', 'dash-2', '2031-03-25 19:00+00'),
  ('00000000-0000-4000-8000-000000000003', 'Afgelast', 'dash-3', '2031-03-12 19:00+00');
update public.projects set status = 'completed' where id = '00000000-0000-4000-8000-000000000001';

select tests.authenticate_as('manager@skyline.test');
create temp table summary on commit drop as
select public.dashboard_summary('2031-03-01 00:00+01', '2031-04-01 00:00+02') as month_view,
       public.dashboard_summary('2031-03-01 00:00+01', '2031-04-01 00:00+02', 'day') as day_view;
reset role;

select is((select (month_view ->> 'events_held')::int from summary), 1, 'held events count completed ones in the period');
select is((select (month_view ->> 'events_in_period')::int from summary), 2, 'cancelled events are not counted');
select is(
  (select month_view -> 'events_per_bucket' from summary),
  '[{"bucket": "2031-03", "count": 2}]'::jsonb,
  'events are bucketed per month in Amsterdam time'
);
select is(
  (select day_view -> 'events_per_bucket' from summary),
  '[{"bucket": "2031-03-10", "count": 1}, {"bucket": "2031-03-25", "count": 1}]'::jsonb,
  'events can be bucketed per day'
);
select is(
  (select (month_view ->> 'open_tasks')::int from summary),
  (select count(*)::int from public.tasks where status <> 'done'),
  'open tasks match the task table'
);

select tests.authenticate_as('buitenstaander@skyline.test');
select is(
  public.dashboard_summary('2031-03-01', '2031-04-01'),
  null,
  'non-staff get no figures'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok(
  $$select public.dashboard_summary('2031-03-01', '2031-04-01')$$,
  '42501', null,
  'anon cannot request dashboard figures'
);
reset role;

select * from finish();
rollback;
