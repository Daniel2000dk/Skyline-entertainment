begin;
select plan(30);

select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('editor@skyline.test', 'team_member');
select tests.create_user('uitvoerder@skyline.test', 'team_member');
select tests.create_user('medewerker@skyline.test', 'team_member');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

-- Creating from a template -------------------------------------------------------

select tests.authenticate_as('manager@skyline.test');
insert into ids
select 'project', public.create_event_project(
  'Paleto Bay Rally',
  (select id from public.event_types where name = 'Motorrace'),
  '2026-12-01 20:00+00',
  'Rondje door het noorden'
);
reset role;

select is(
  (select count(*)::int from public.tasks where project_id = (select id from ids where name = 'project')),
  (select count(*)::int from public.task_templates t join public.event_types e on e.id = t.event_type_id
   where e.name = 'Motorrace'),
  'a new project gets the standard tasks of its event type'
);
select is(
  (select due_at from public.tasks
   where project_id = (select id from ids where name = 'project')
     and title = 'Datum, tijd en locatie vastleggen'),
  '2026-11-10 20:00+00'::timestamptz,
  'template due dates are relative to the event start'
);
select is(
  (select title from public.events where project_id = (select id from ids where name = 'project')),
  'Paleto Bay Rally',
  'the event is created with the project name'
);
select ok(
  (select slug ~ '^paleto-bay-rally-[a-f0-9]{6}$' from public.events
   where project_id = (select id from ids where name = 'project')),
  'the event gets an unguessable slug based on the name'
);

select tests.authenticate_as('medewerker@skyline.test');
select throws_ok(
  $$select public.create_event_project('Stiekem project')$$,
  '42501', null,
  'a Medewerker cannot create projects through the function either'
);
reset role;

-- Membership for the remaining tests
insert into public.project_members (project_id, staff_id, permission)
values ((select id from ids where name = 'project'), tests.user_id('editor@skyline.test'), 'editor');

-- Editing details and revisions ---------------------------------------------------

select tests.authenticate_as('editor@skyline.test');
select lives_ok(
  $$select public.update_event_project(
      (select id from ids where name = 'project'), 'Paleto Bay Rally XL', null, 'Langere route', 5000,
      'Korte tekst', 'Paleto Bay', '2026-12-01 20:00+00', '2026-12-01 22:00+00', 30, 2500,
      'Geen nitro', 'closed')$$,
  'an editor can update project and event details together'
);
reset role;

select is(
  (select title from public.events where project_id = (select id from ids where name = 'project')),
  'Paleto Bay Rally XL',
  'renaming the project renames the event (entered once)'
);
select ok(
  exists (select 1 from public.content_revisions
          where project_id = (select id from ids where name = 'project') and entity = 'project'
            and previous ->> 'description' = 'Rondje door het noorden'),
  'the previous description is kept as a revision'
);

select tests.authenticate_as('medewerker@skyline.test');
select throws_ok(
  $$select public.update_event_project(
      (select id from ids where name = 'project'), 'Gekaapt', null, null, 0,
      null, null, null, null, null, 0, null, 'closed')$$,
  '42501', null,
  'staff without edit rights cannot update details'
);
select throws_ok(
  $$select public.revert_content_revision(
      (select max(id) from public.content_revisions where project_id = (select id from ids where name = 'project')))$$,
  '42501', null,
  'staff without edit rights cannot revert'
);
select throws_ok(
  $$update public.events set title = 'Andere naam' where project_id = (select id from ids where name = 'project')$$,
  '42501', null,
  'the event title cannot be changed separately'
);
reset role;

select tests.authenticate_as('editor@skyline.test');
select lives_ok(
  $$select public.revert_content_revision(
      (select id from public.content_revisions
       where project_id = (select id from ids where name = 'project') and entity = 'project'
       order by id desc limit 1))$$,
  'an editor can revert a revision'
);
reset role;

select is(
  (select description from public.projects where id = (select id from ids where name = 'project')),
  'Rondje door het noorden',
  'reverting restores the previous content'
);
select is(
  (select title from public.events where project_id = (select id from ids where name = 'project')),
  'Paleto Bay Rally',
  'reverting the name also restores the event title'
);

-- Tasks -------------------------------------------------------------------------------

select tests.authenticate_as('editor@skyline.test');
with created as (
  insert into public.tasks (project_id, title, assignee_id, priority)
  values ((select id from ids where name = 'project'), 'Bekers regelen',
          tests.user_id('uitvoerder@skyline.test'), 'high')
  returning id
)
insert into ids select 'task', id from created;
insert into public.checklist_items (task_id, title)
values ((select id from ids where name = 'task'), 'Goud, zilver, brons');
reset role;

select is(
  (select project_id from public.checklist_items where title = 'Goud, zilver, brons'),
  (select id from ids where name = 'project'),
  'task checklist items inherit the project'
);

select tests.authenticate_as('uitvoerder@skyline.test');
select lives_ok(
  $$update public.tasks set status = 'done' where id = (select id from ids where name = 'task')$$,
  'the assignee can complete their own task'
);
select throws_ok(
  $$update public.tasks set title = 'Andere taak' where id = (select id from ids where name = 'task')$$,
  '42501', null,
  'the assignee cannot rewrite the task'
);
select throws_ok(
  $$update public.tasks set assignee_id = tests.user_id('medewerker@skyline.test')
    where id = (select id from ids where name = 'task')$$,
  '42501', null,
  'the assignee cannot hand the task to someone else'
);
update public.checklist_items set is_done = true where title = 'Goud, zilver, brons';
select throws_ok(
  $$update public.checklist_items set title = 'Iets anders' where title = 'Goud, zilver, brons'$$,
  '42501', null,
  'the assignee cannot rename checklist items'
);
select throws_ok(
  $$insert into public.tasks (project_id, title) values ((select id from ids where name = 'project'), 'Eigen taak')$$,
  '42501', null,
  'the assignee cannot create tasks without edit rights'
);
reset role;

select ok(
  (select completed_at is not null from public.tasks where id = (select id from ids where name = 'task')),
  'completing a task records when'
);
select is(
  (select done_by from public.checklist_items where title = 'Goud, zilver, brons'),
  tests.user_id('uitvoerder@skyline.test'),
  'ticking a checklist item records who'
);
select is(
  (select details -> 'diff' -> 'status' from public.activity_log
   where action = 'tasks.update' and entity_id = (select id from ids where name = 'task')::text),
  '{"from": "todo", "to": "done"}'::jsonb,
  'task status changes appear in the activity log'
);

select tests.authenticate_as('medewerker@skyline.test');
update public.tasks set status = 'todo' where id = (select id from ids where name = 'task');
update public.checklist_items set is_done = false where title = 'Goud, zilver, brons';
reset role;
select is(
  (select status::text from public.tasks where id = (select id from ids where name = 'task')),
  'done',
  'other staff cannot change someone else''s task'
);
select ok(
  (select is_done from public.checklist_items where title = 'Goud, zilver, brons'),
  'other staff cannot untick checklist items'
);

-- Runbook and reference data ---------------------------------------------------------

select tests.authenticate_as('medewerker@skyline.test');
select throws_ok(
  $$insert into public.runbook_items (project_id, title) values ((select id from ids where name = 'project'), 'Start')$$,
  '42501', null,
  'staff without edit rights cannot change the runbook'
);
select throws_ok(
  $$insert into public.event_types (name) values ('Nieuw type')$$,
  '42501', null,
  'a Medewerker cannot add event types'
);
reset role;

select tests.authenticate_as('editor@skyline.test');
select lives_ok(
  $$insert into public.runbook_items (project_id, title, starts_at)
    values ((select id from ids where name = 'project'), 'Briefing deelnemers', '2026-12-01 19:45+00')$$,
  'an editor can add runbook items'
);
reset role;

select tests.authenticate_as('manager@skyline.test');
select lives_ok(
  $$insert into public.event_types (name) values ('Demolition derby')$$,
  'an Event Manager can add event types'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.tasks', '42501', null, 'anon cannot read tasks');
reset role;

select * from finish();
rollback;
