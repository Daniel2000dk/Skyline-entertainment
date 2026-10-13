begin;
select plan(27);

select tests.create_user('admin@skyline.test', 'admin');
select tests.create_user('eigenaar@skyline.test', 'organizer');
select tests.create_user('andere-manager@skyline.test', 'organizer');
select tests.create_user('editor@skyline.test', 'team_member');
select tests.create_user('commentator@skyline.test', 'team_member');
select tests.create_user('medewerker@skyline.test', 'team_member');
select tests.create_user('buitenstaander@skyline.test');

-- Creating projects ------------------------------------------------------------

select tests.authenticate_as('eigenaar@skyline.test');
select lives_ok(
  $$insert into public.projects (title, owner_id) values ('Offroad Rally', tests.user_id('eigenaar@skyline.test'))$$,
  'an Event Manager can create a project they own'
);
select throws_ok(
  $$insert into public.projects (title, owner_id) values ('Overgenomen', tests.user_id('andere-manager@skyline.test'))$$,
  '42501', null,
  'an Event Manager cannot create a project owned by someone else'
);
select throws_ok(
  $$insert into public.projects (title, owner_id, status) values ('Direct live', tests.user_id('eigenaar@skyline.test'), 'published')$$,
  '23514', null,
  'a new project cannot start as published'
);
reset role;

select tests.authenticate_as('medewerker@skyline.test');
select throws_ok(
  $$insert into public.projects (title, owner_id) values ('Stiekem', tests.user_id('medewerker@skyline.test'))$$,
  '42501', null,
  'a Medewerker cannot create projects'
);
reset role;

select tests.authenticate_as('admin@skyline.test');
select lives_ok(
  $$insert into public.projects (title, owner_id) values ('Car Meet', tests.user_id('andere-manager@skyline.test'))$$,
  'an admin can create a project for another owner'
);
reset role;

create temp table expected on commit drop as
select (select count(*)::int from public.projects) as projects;
grant select on expected to authenticated;

-- Visibility -------------------------------------------------------------------

select tests.authenticate_as('medewerker@skyline.test');
select is((select count(*)::int from public.projects), (select projects from expected), 'all active staff can view all projects');
reset role;

select tests.authenticate_as('buitenstaander@skyline.test');
select is((select count(*)::int from public.projects), 0, 'non-staff users see no projects');
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.projects', '42501', null, 'anon cannot read projects');
select throws_ok('select * from public.events', '42501', null, 'anon cannot read events directly');
select throws_ok('select * from public.project_members', '42501', null, 'anon cannot read project members');
reset role;

-- Membership and permissions ----------------------------------------------------

select tests.authenticate_as('eigenaar@skyline.test');
select lives_ok(
  $$insert into public.project_members (project_id, staff_id, permission)
    select id, tests.user_id('editor@skyline.test'), 'editor'::public.project_permission from public.projects where title = 'Offroad Rally'
    union all
    select id, tests.user_id('commentator@skyline.test'), 'commenter'::public.project_permission from public.projects where title = 'Offroad Rally'$$,
  'the owner can add editors and commenters'
);
reset role;

select tests.authenticate_as('andere-manager@skyline.test');
select throws_ok(
  $$insert into public.project_members (project_id, staff_id, permission)
    select id, tests.user_id('andere-manager@skyline.test'), 'editor' from public.projects where title = 'Offroad Rally'$$,
  '42501', null,
  'an Event Manager cannot grant themselves rights on someone else''s project'
);
update public.projects set title = 'Gekaapt' where title = 'Offroad Rally';
reset role;
select is(
  (select count(*)::int from public.projects where title = 'Gekaapt'),
  0,
  'an Event Manager cannot edit another owner''s project (cross-project denial)'
);

select tests.authenticate_as('editor@skyline.test');
update public.projects set description = 'Route via Paleto Bay' where title = 'Offroad Rally';
select is(
  (select description from public.projects where title = 'Offroad Rally'),
  'Route via Paleto Bay',
  'an editor member can edit project content'
);
select throws_ok(
  $$update public.projects set status = 'approved' where title = 'Offroad Rally'$$,
  '42501', null,
  'an editor cannot change the project status'
);
select throws_ok(
  $$update public.projects set owner_id = tests.user_id('editor@skyline.test') where title = 'Offroad Rally'$$,
  '42501', null,
  'an editor cannot take over ownership'
);
select lives_ok(
  $$insert into public.events (project_id, title, slug, capacity, entry_fee_gta)
    select id, 'Offroad Rally', 'offroad-rally', 20, 5000 from public.projects where title = 'Offroad Rally'$$,
  'an editor can create the event for the project'
);
reset role;

select tests.authenticate_as('commentator@skyline.test');
update public.projects set description = 'Gewijzigd door commentator' where title = 'Offroad Rally';
update public.events set capacity = 999 where slug = 'offroad-rally';
reset role;
select is(
  (select description from public.projects where title = 'Offroad Rally'),
  'Route via Paleto Bay',
  'a commenter cannot edit project content'
);
select is(
  (select capacity from public.events where slug = 'offroad-rally'),
  20,
  'a commenter cannot edit the event'
);

-- Publishing ---------------------------------------------------------------------

select tests.authenticate_as('eigenaar@skyline.test');
select throws_ok(
  $$update public.projects set status = 'published' where title = 'Offroad Rally'$$,
  '23514', null,
  'a project cannot be published while its event has no start time'
);
update public.events set starts_at = now() + interval '7 days' where slug = 'offroad-rally';
select lives_ok(
  $$update public.projects set status = 'published' where title = 'Offroad Rally'$$,
  'the owner can publish once the event has a start time'
);
select throws_ok(
  $$update public.events set starts_at = null where slug = 'offroad-rally'$$,
  '23514', null,
  'a published event cannot lose its start time'
);
reset role;

-- Deleting and deactivation ------------------------------------------------------

select tests.authenticate_as('editor@skyline.test');
delete from public.projects where title = 'Offroad Rally';
reset role;
select is(
  (select count(*)::int from public.projects where title = 'Offroad Rally'),
  1,
  'an editor cannot delete the project'
);

select tests.authenticate_as('admin@skyline.test');
update public.staff_profiles set is_active = false where id = tests.user_id('eigenaar@skyline.test');
reset role;

select tests.authenticate_as('eigenaar@skyline.test');
update public.projects set title = 'Na deactivatie' where title = 'Offroad Rally';
select is((select count(*)::int from public.projects), 0, 'a deactivated owner can no longer see projects');
reset role;
select is(
  (select count(*)::int from public.projects where title = 'Na deactivatie'),
  0,
  'a deactivated owner can no longer edit their project'
);

select tests.authenticate_as('admin@skyline.test');
select lives_ok(
  $$delete from public.projects where title = 'Offroad Rally'$$,
  'an admin can delete a project'
);
select is(
  (select count(*)::int from public.events where slug = 'offroad-rally'),
  0,
  'deleting a project removes its event'
);
reset role;

select * from finish();
rollback;
