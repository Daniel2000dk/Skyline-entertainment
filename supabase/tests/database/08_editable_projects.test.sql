begin;
select plan(5);

select tests.create_user('admin@skyline.test', 'admin');
select tests.create_user('eigenaar@skyline.test', 'organizer');
select tests.create_user('editor@skyline.test', 'team_member');
select tests.create_user('lezer@skyline.test', 'team_member');

create temp table ids (id uuid) on commit drop;
grant all on ids to authenticated;

select tests.authenticate_as('eigenaar@skyline.test');
insert into ids select public.create_event_project('Bewerkbaar project');
reset role;
insert into public.project_members (project_id, staff_id, permission)
values ((select id from ids), tests.user_id('editor@skyline.test'), 'editor'),
       ((select id from ids), tests.user_id('lezer@skyline.test'), 'commenter');

select tests.authenticate_as('eigenaar@skyline.test');
select ok((select id from ids) in (select public.my_editable_project_ids()), 'the owner can edit');
reset role;

select tests.authenticate_as('editor@skyline.test');
select ok((select id from ids) in (select public.my_editable_project_ids()), 'an editor member can edit');
reset role;

select tests.authenticate_as('lezer@skyline.test');
select ok((select id from ids) not in (select public.my_editable_project_ids()), 'a commenter cannot edit');
reset role;

select tests.authenticate_as('admin@skyline.test');
select ok((select id from ids) in (select public.my_editable_project_ids()), 'an admin can edit everything');
reset role;

select tests.authenticate_as_anon();
select throws_ok('select public.my_editable_project_ids()', '42501', null, 'anon cannot call it');
reset role;

select * from finish();
rollback;
