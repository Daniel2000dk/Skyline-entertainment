begin;
select plan(9);

select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('planner@skyline.test', 'team_member');
select tests.create_user('collega@skyline.test', 'team_member');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

select tests.authenticate_as('manager@skyline.test');
insert into ids select 'project', public.create_event_project('Car meet', null, '2026-11-07 19:00+00');
update public.events set ends_at = '2026-11-07 22:00+00' where project_id = (select id from ids where name = 'project');
reset role;

-- Rescheduling keeps the duration --------------------------------------------------------

select tests.authenticate_as('collega@skyline.test');
select throws_ok(
  $$select public.reschedule_event((select id from ids where name = 'project'), '2026-11-14 19:00+00')$$,
  '42501', null,
  'staff without edit rights cannot move an event'
);
reset role;

select tests.authenticate_as('manager@skyline.test');
select lives_ok(
  $$select public.reschedule_event((select id from ids where name = 'project'), '2026-11-14 20:00+00')$$,
  'the owner can move the event'
);
reset role;
select is(
  (select starts_at || ' / ' || ends_at from public.events where project_id = (select id from ids where name = 'project')),
  ('2026-11-14 20:00+00'::timestamptz || ' / ' || '2026-11-14 23:00+00'::timestamptz),
  'the end moves along so the duration stays three hours'
);

-- Team activities --------------------------------------------------------------------------

select tests.authenticate_as('planner@skyline.test');
with created as (
  insert into public.team_activities (title, starts_at, responsible_id)
  values ('Teamoverleg', '2026-11-02 19:00+00', tests.user_id('planner@skyline.test'))
  returning id
)
insert into ids select 'activity', id from created;
select is(
  (select created_by from public.team_activities where id = (select id from ids where name = 'activity')),
  tests.user_id('planner@skyline.test'),
  'any staff member can plan a team activity (creator recorded)'
);
select throws_ok(
  $$insert into public.team_activities (title, starts_at, ends_at) values ('Terug in de tijd', '2026-11-02 19:00+00', '2026-11-02 18:00+00')$$,
  '23514', null,
  'an activity cannot end before it starts'
);
reset role;

select tests.authenticate_as('collega@skyline.test');
update public.team_activities set title = 'Gekaapt' where id = (select id from ids where name = 'activity');
delete from public.team_activities where id = (select id from ids where name = 'activity');
reset role;
select is(
  (select title from public.team_activities where id = (select id from ids where name = 'activity')),
  'Teamoverleg',
  'other staff cannot change or remove someone else''s activity'
);

select tests.authenticate_as('manager@skyline.test');
select lives_ok(
  $$update public.team_activities set location = 'Clubhuis' where id = (select id from ids where name = 'activity')$$,
  'an Event Manager can adjust any activity'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.team_activities', '42501', null, 'anon cannot read the calendar');
select throws_ok(
  $$select public.reschedule_event((select id from ids where name = 'project'), now())$$,
  '42501', null,
  'anon cannot move events'
);
reset role;

select * from finish();
rollback;
