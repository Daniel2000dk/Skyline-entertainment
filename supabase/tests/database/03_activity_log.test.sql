begin;
select plan(11);

select tests.create_user('admin@skyline.test', 'admin');
select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('medewerker@skyline.test', 'team_member');

select tests.authenticate_as('manager@skyline.test');
insert into public.projects (title, owner_id) values ('Jetski Race', tests.user_id('manager@skyline.test'));
update public.projects set status = 'under_review' where title = 'Jetski Race';
reset role;

select tests.authenticate_as('admin@skyline.test');
update public.staff_profiles set role = 'organizer' where id = tests.user_id('medewerker@skyline.test');
reset role;

-- Entries are written automatically with the acting user ---------------------

select is(
  (select actor_id from public.activity_log where action = 'projects.insert'),
  tests.user_id('manager@skyline.test'),
  'creating a project is logged with the actor'
);
select is(
  (select details -> 'diff' -> 'status' from public.activity_log where action = 'projects.update'),
  '{"from": "idea", "to": "under_review"}'::jsonb,
  'status changes are logged with before and after values'
);
select is(
  (select details -> 'diff' -> 'role' from public.activity_log
   where action = 'staff_profiles.update' and entity_id = tests.user_id('medewerker@skyline.test')::text),
  '{"from": "team_member", "to": "organizer"}'::jsonb,
  'role changes are logged with before and after values'
);
select ok(
  not exists (
    select 1 from public.activity_log
    where details::text ilike '%@skyline.test%'
  ),
  'no email addresses end up in the activity log'
);

-- Visibility ----------------------------------------------------------------------

select tests.authenticate_as('medewerker@skyline.test');
select ok(
  (select count(*) from public.activity_log where project_id is not null) >= 2,
  'staff can read project activity'
);
select is(
  (select count(*)::int from public.activity_log where entity_type in ('staff_profiles', 'staff_invitations')),
  0,
  'non-admins cannot read staff or invitation activity'
);

-- Append-only ---------------------------------------------------------------------

select throws_ok(
  $$insert into public.activity_log (action, entity_type) values ('fake', 'fake')$$,
  '42501', null,
  'staff cannot forge activity entries'
);
reset role;

select tests.authenticate_as('admin@skyline.test');
select throws_ok('delete from public.activity_log', '42501', null, 'even admins cannot delete activity');
select throws_ok(
  $$update public.activity_log set action = 'rewritten'$$,
  '42501', null,
  'even admins cannot rewrite activity'
);
reset role;

select tests.authenticate_as_service_role();
select throws_ok('delete from public.activity_log', '42501', null, 'the service role cannot delete activity');
reset role;

-- History survives deletion ---------------------------------------------------------

delete from public.projects where title = 'Jetski Race';
select ok(
  exists (select 1 from public.activity_log where action = 'projects.delete'),
  'deleting a project keeps its history'
);

select * from finish();
rollback;
