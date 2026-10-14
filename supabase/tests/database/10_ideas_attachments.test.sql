begin;
select plan(28);

select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('bedenker@skyline.test', 'team_member');
select tests.create_user('collega@skyline.test', 'team_member');
select tests.create_user('admin@skyline.test', 'admin');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

-- Ideas ---------------------------------------------------------------------------------

select tests.authenticate_as('bedenker@skyline.test');
with created as (
  insert into public.ideas (title, description) values ('Onderwaterrace', 'Met duikpakken') returning id
)
insert into ids select 'idea', id from created;
select throws_ok(
  $$insert into public.ideas (title, status) values ('Meteen goedgekeurd', 'approved')$$,
  '42501', null,
  'ideas cannot be created as approved'
);
select lives_ok(
  $$update public.ideas set description = 'Met duikpakken en boeien' where id = (select id from ids where name = 'idea')$$,
  'the author can improve their idea'
);
select throws_ok(
  $$update public.ideas set status = 'approved' where id = (select id from ids where name = 'idea')$$,
  '42501', null,
  'the author cannot approve their own idea'
);
reset role;

select tests.authenticate_as('collega@skyline.test');
update public.ideas set title = 'Gekaapt' where id = (select id from ids where name = 'idea');
reset role;
select is(
  (select title from public.ideas where id = (select id from ids where name = 'idea')),
  'Onderwaterrace',
  'other staff cannot edit someone else''s idea'
);

select tests.authenticate_as('manager@skyline.test');
select throws_ok(
  $$update public.ideas set title = 'Herschreven' where id = (select id from ids where name = 'idea')$$,
  '42501', null,
  'an Event Manager cannot rewrite someone else''s idea'
);
reset role;

-- Votes -----------------------------------------------------------------------------------

select tests.authenticate_as('collega@skyline.test');
select lives_ok(
  $$insert into public.idea_votes (idea_id) values ((select id from ids where name = 'idea'))$$,
  'staff can vote'
);
select throws_ok(
  $$insert into public.idea_votes (idea_id) values ((select id from ids where name = 'idea'))$$,
  '23505', null,
  'staff can vote only once per idea'
);
select throws_ok(
  $$insert into public.idea_votes (idea_id, staff_id)
    values ((select id from ids where name = 'idea'), tests.user_id('manager@skyline.test'))$$,
  '42501', null,
  'staff cannot vote on behalf of someone else'
);
reset role;

-- Comments on ideas -------------------------------------------------------------------------

select tests.authenticate_as('collega@skyline.test');
with created as (
  insert into public.comments (idea_id, body) values ((select id from ids where name = 'idea'), 'Gaaf!') returning id
)
insert into ids select 'comment', id from created;
insert into public.comments (parent_id, body) values ((select id from ids where name = 'comment'), 'Eens');
reset role;
select is(
  (select count(*)::int from public.comments where idea_id = (select id from ids where name = 'idea')),
  2,
  'replies on an idea stay on the idea'
);

-- Deciding and converting -------------------------------------------------------------------

select tests.authenticate_as('manager@skyline.test');
select lives_ok(
  $$update public.ideas set status = 'approved' where id = (select id from ids where name = 'idea')$$,
  'an Event Manager can approve an idea'
);
reset role;
select is(
  (select decided_by from public.ideas where id = (select id from ids where name = 'idea')),
  tests.user_id('manager@skyline.test'),
  'the approval records who decided'
);

select tests.authenticate_as('bedenker@skyline.test');
select throws_ok(
  $$insert into public.idea_votes (idea_id) values ((select id from ids where name = 'idea'))$$,
  '42501', null,
  'voting closes once an idea is decided'
);
select throws_ok(
  $$select public.convert_idea_to_project((select id from ids where name = 'idea'))$$,
  '42501', null,
  'a Medewerker cannot convert an idea into a project'
);
reset role;

select tests.authenticate_as('manager@skyline.test');
insert into ids select 'project', public.convert_idea_to_project(
  (select id from ids where name = 'idea'),
  (select id from public.event_types where name = 'Jetskirace')
);
select throws_ok(
  $$select public.convert_idea_to_project((select id from ids where name = 'idea'))$$,
  '22023', null,
  'an idea is converted only once'
);
reset role;

select is(
  (select project_id from public.ideas where id = (select id from ids where name = 'idea')),
  (select id from ids where name = 'project'),
  'the idea links to its new project'
);
select is(
  (select status::text || '|' || title || '|' || description from public.projects
   where id = (select id from ids where name = 'project')),
  'approved|Onderwaterrace|Met duikpakken en boeien',
  'the project starts approved with the idea''s name and description (no retyping)'
);
select ok(
  (select count(*) > 0 from public.tasks where project_id = (select id from ids where name = 'project')),
  'the converted project gets the standard tasks of its type'
);

select tests.authenticate_as('manager@skyline.test');
with created as (
  insert into public.ideas (title) values ('Ander idee') returning id
)
insert into ids select 'other-idea', id from created;
select throws_ok(
  $$update public.ideas set project_id = (select id from ids where name = 'project')
    where id = (select id from ids where name = 'other-idea')$$,
  '42501', null,
  'ideas cannot be linked to a project by hand'
);
reset role;

-- Attachments and storage -------------------------------------------------------------------

select tests.authenticate_as('manager@skyline.test');
select ok(
  private.can_write_attachment('projects/' || (select id from ids where name = 'project') || '/plan.pdf'),
  'the project owner may add project files'
);
reset role;

select tests.authenticate_as('collega@skyline.test');
select ok(
  not private.can_write_attachment('projects/' || (select id from ids where name = 'project') || '/plan.pdf'),
  'staff without edit rights may not add project files'
);
select ok(
  not private.can_write_attachment('ideas/' || (select id from ids where name = 'idea') || '/foto.png'),
  'staff may not add files to someone else''s idea'
);
select ok(
  not private.can_write_attachment('../../etc/passwd'),
  'malformed paths are refused'
);
select throws_ok(
  $$insert into public.attachments (project_id, storage_path, file_name, content_type, size_bytes)
    values ((select id from ids where name = 'project'),
            'projects/' || (select id from ids where name = 'project') || '/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null,
  'staff without edit rights cannot register project files'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('staff-files', 'projects/' || (select id from ids where name = 'project') || '/x.pdf')$$,
  '42501', null,
  'staff without edit rights cannot upload to the project folder'
);
reset role;

select tests.authenticate_as('bedenker@skyline.test');
select ok(
  private.can_write_attachment('ideas/' || (select id from ids where name = 'idea') || '/foto.png'),
  'the author may add images to their idea'
);
reset role;

select tests.authenticate_as('manager@skyline.test');
select throws_ok(
  $$insert into public.attachments (project_id, storage_path, file_name, content_type, size_bytes)
    values ((select id from ids where name = 'project'), 'ideas/elders/x.pdf', 'x.pdf', 'application/pdf', 10)$$,
  '42501', null,
  'a file record must live in its own project folder'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.ideas', '42501', null, 'anon cannot read ideas');
reset role;

-- A converted project can still be deleted; the idea keeps its history.
delete from public.projects where id = (select id from ids where name = 'project');
select is(
  (select status::text from public.ideas where id = (select id from ids where name = 'idea')),
  'converted',
  'deleting a converted project keeps the idea'
);

select * from finish();
rollback;
