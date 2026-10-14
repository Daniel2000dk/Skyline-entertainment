begin;
select plan(23);

select tests.create_user('admin@skyline.test', 'admin');
select tests.create_user('eigenaar@skyline.test', 'organizer');
select tests.create_user('schrijver@skyline.test', 'team_member');
select tests.create_user('collega@skyline.test', 'team_member');
select tests.create_user('buitenstaander@skyline.test');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

select tests.authenticate_as('eigenaar@skyline.test');
insert into ids select 'project', public.create_event_project('Bootrace');
insert into ids select 'other', public.create_event_project('Ander project');
reset role;

-- Discussions ------------------------------------------------------------------------

select tests.authenticate_as('schrijver@skyline.test');
with created as (
  insert into public.comments (project_id, body) values ((select id from ids where name = 'project'), 'Startlijn bij de pier?')
  returning id
)
insert into ids select 'root', id from created;

with created as (
  insert into public.comments (parent_id, body) values ((select id from ids where name = 'root'), 'Goed idee')
  returning id
)
insert into ids select 'reply', id from created;

-- A reply to a reply, trying to point at another project.
with created as (
  insert into public.comments (parent_id, project_id, body)
  values ((select id from ids where name = 'reply'), (select id from ids where name = 'other'), 'Eens')
  returning id
)
insert into ids select 'nested', id from created;
reset role;

select is(
  (select parent_id from public.comments where id = (select id from ids where name = 'nested')),
  (select id from ids where name = 'root'),
  'replies to replies attach to the thread root (one level)'
);
select is(
  (select project_id from public.comments where id = (select id from ids where name = 'nested')),
  (select id from ids where name = 'project'),
  'a reply always belongs to the subject of its thread'
);

select tests.authenticate_as('schrijver@skyline.test');
update public.comments set body = 'Startlijn bij de pier, toch?' where id = (select id from ids where name = 'root');
reset role;
select ok(
  (select edited_at is not null from public.comments where id = (select id from ids where name = 'root')),
  'editing records that a comment was edited'
);

select tests.authenticate_as('collega@skyline.test');
update public.comments set body = 'Gekaapt' where id = (select id from ids where name = 'root');
reset role;
select is(
  (select body from public.comments where id = (select id from ids where name = 'root')),
  'Startlijn bij de pier, toch?',
  'others cannot edit someone else''s comment'
);

select tests.authenticate_as('admin@skyline.test');
select throws_ok(
  $$update public.comments set body = 'Admin schrijft iets anders' where id = (select id from ids where name = 'root')$$,
  '42501', null,
  'admins cannot put words in someone else''s mouth'
);
select lives_ok(
  $$update public.comments set deleted_at = now() where id = (select id from ids where name = 'reply')$$,
  'admins can remove a comment'
);
select throws_ok(
  $$update public.comments set deleted_at = null where id = (select id from ids where name = 'reply')$$,
  '42501', null,
  'removed comments cannot be restored'
);
reset role;

select tests.authenticate_as('buitenstaander@skyline.test');
select is((select count(*)::int from public.comments), 0, 'non-staff cannot read discussions');
select throws_ok(
  $$insert into public.comments (project_id, body) values ((select id from ids where name = 'project'), 'Hoi')$$,
  '42501', null,
  'non-staff cannot comment'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.comments', '42501', null, 'anon cannot read discussions');
select throws_ok('select * from public.suggestions', '42501', null, 'anon cannot read suggestions');
reset role;

-- Suggestions ------------------------------------------------------------------------

select tests.authenticate_as('schrijver@skyline.test');
with created as (
  insert into public.suggestions (project_id, field, proposed_value, message)
  values ((select id from ids where name = 'project'), 'location', 'Del Perro Pier', 'Mooier uitzicht')
  returning id
)
insert into ids select 'suggestion', id from created;
with created as (
  insert into public.suggestions (project_id, field, proposed_value, message)
  values ((select id from ids where name = 'project'), 'capacity', '50', 'Meer plek')
  returning id
)
insert into ids select 'rejected', id from created;
with created as (
  insert into public.suggestions (project_id, message)
  values ((select id from ids where name = 'project'), 'Misschien een tweede ronde?')
  returning id
)
insert into ids select 'withdraw', id from created;
select throws_ok(
  $$insert into public.suggestions (project_id, message, status)
    values ((select id from ids where name = 'project'), 'Meteen goedgekeurd', 'accepted')$$,
  '42501', null,
  'a suggestion cannot be created as already accepted'
);
select throws_ok(
  $$select public.decide_suggestion((select id from ids where name = 'suggestion'), true)$$,
  '42501', null,
  'the author cannot accept their own suggestion without managing the project'
);
reset role;

select is(
  (select location from public.events where project_id = (select id from ids where name = 'project')),
  null,
  'a suggestion does not change the project by itself'
);

select tests.authenticate_as('collega@skyline.test');
update public.suggestions set status = 'withdrawn' where id = (select id from ids where name = 'withdraw');
reset role;
select is(
  (select status::text from public.suggestions where id = (select id from ids where name = 'withdraw')),
  'open',
  'others cannot withdraw someone else''s suggestion'
);

select tests.authenticate_as('schrijver@skyline.test');
select lives_ok(
  $$update public.suggestions set status = 'withdrawn' where id = (select id from ids where name = 'withdraw')$$,
  'the author can withdraw an open suggestion'
);
reset role;

select tests.authenticate_as('eigenaar@skyline.test');
select lives_ok(
  $$select public.decide_suggestion((select id from ids where name = 'suggestion'), true, 'Top')$$,
  'the owner can accept a suggestion'
);
select lives_ok(
  $$select public.decide_suggestion((select id from ids where name = 'rejected'), false, 'Te druk')$$,
  'the owner can reject a suggestion'
);
select throws_ok(
  $$select public.decide_suggestion((select id from ids where name = 'suggestion'), false)$$,
  '22023', null,
  'a handled suggestion cannot be decided again'
);
reset role;

select is(
  (select location from public.events where project_id = (select id from ids where name = 'project')),
  'Del Perro Pier',
  'accepting applies the proposed value'
);
select is(
  (select capacity from public.events where project_id = (select id from ids where name = 'project')),
  null,
  'rejecting leaves the project unchanged'
);
select ok(
  (select decided_by = tests.user_id('eigenaar@skyline.test') and decided_at is not null
   from public.suggestions where id = (select id from ids where name = 'suggestion')),
  'the decision records who and when'
);
select ok(
  exists (select 1 from public.content_revisions
          where project_id = (select id from ids where name = 'project')
            and 'location' = any (changed_columns)
            and changed_by = tests.user_id('eigenaar@skyline.test')),
  'an accepted suggestion is a revertible revision'
);

select * from finish();
rollback;
