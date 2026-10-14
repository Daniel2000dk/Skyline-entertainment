begin;
select plan(17);

select tests.create_user('eigenaar@skyline.test', 'organizer');
select tests.create_user('editor@skyline.test', 'team_member');
select tests.create_user('collega@skyline.test', 'team_member');
select tests.create_user('buitenstaander@skyline.test');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

select tests.authenticate_as('eigenaar@skyline.test');
insert into ids select 'project', public.create_event_project('Kaartproject');
insert into ids select 'other', public.create_event_project('Ander project');
reset role;
insert into public.project_members (project_id, staff_id, permission)
values ((select id from ids where name = 'project'), tests.user_id('editor@skyline.test'), 'editor');

-- Routes ------------------------------------------------------------------------------------

select tests.authenticate_as('editor@skyline.test');
with created as (
  insert into public.map_routes (project_id, name, color, points)
  values ((select id from ids where name = 'project'), 'Hoofdroute', 'gold',
          '[{"x": 0.1, "y": 0.2}, {"x": 0.5, "y": 0.5, "checkpoint": true}, {"x": 0.9, "y": 0.8}]')
  returning id
)
insert into ids select 'route', id from created;
select is(
  (select created_by from public.map_routes where id = (select id from ids where name = 'route')),
  tests.user_id('editor@skyline.test'),
  'a project editor can draw a route (creator recorded)'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name, points)
    values ((select id from ids where name = 'project'), 'Buiten de kaart', '[{"x": 1.2, "y": 0.5}]')$$,
  '23514', null,
  'points outside the map are refused'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name, points)
    values ((select id from ids where name = 'project'), 'Extra velden', '[{"x": 0.2, "y": 0.5, "html": "<b>"}]')$$,
  '23514', null,
  'points cannot carry unknown fields'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name, points)
    values ((select id from ids where name = 'project'), 'Geen getal', '[{"x": "0.2", "y": 0.5}]')$$,
  '23514', null,
  'coordinates must be numbers'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name, points)
    select (select id from ids where name = 'project'), 'Te lang',
           jsonb_agg(jsonb_build_object('x', 0.5, 'y', 0.5)) from generate_series(1, 301)$$,
  '23514', null,
  'a route has at most 300 points'
);
select lives_ok(
  $$update public.map_routes set points = '[{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.3}]', is_loop = true
    where id = (select id from ids where name = 'route')$$,
  'an editor can change the points'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name) values ((select id from ids where name = 'other'), 'Ander project')$$,
  '42501', null,
  'editing rights on one project do not extend to another'
);
reset role;

select tests.authenticate_as('collega@skyline.test');
select is(
  (select count(*)::int from public.map_routes where id = (select id from ids where name = 'route')),
  1,
  'all staff can view routes'
);
select throws_ok(
  $$insert into public.map_routes (project_id, name) values ((select id from ids where name = 'project'), 'Stiekem')$$,
  '42501', null,
  'staff without edit rights cannot add routes'
);
update public.map_routes set points = '[]' where id = (select id from ids where name = 'route');
delete from public.map_routes where id = (select id from ids where name = 'route');
reset role;
select is(
  (select jsonb_array_length(points) from public.map_routes where id = (select id from ids where name = 'route')),
  2,
  'staff without edit rights cannot change or delete a route'
);
select ok(
  exists (select 1 from public.activity_log
          where action = 'map_routes.update' and entity_id = (select id from ids where name = 'route')::text),
  'route changes are in the activity log'
);

-- Markers -----------------------------------------------------------------------------------

select tests.authenticate_as('eigenaar@skyline.test');
select lives_ok(
  $$insert into public.map_markers (project_id, label, note, x, y)
    values ((select id from ids where name = 'project'), 'Parkeren', 'Achter de pier', 0.4, 0.6)$$,
  'the owner can place a marker'
);
select throws_ok(
  $$insert into public.map_markers (project_id, label, x, y)
    values ((select id from ids where name = 'project'), 'Buiten', -0.1, 0.6)$$,
  '23514', null,
  'markers outside the map are refused'
);
reset role;

select tests.authenticate_as('collega@skyline.test');
select throws_ok(
  $$insert into public.map_markers (project_id, label, x, y)
    values ((select id from ids where name = 'project'), 'Stiekem', 0.5, 0.5)$$,
  '42501', null,
  'staff without edit rights cannot place markers'
);
reset role;

-- Map image (storage) -----------------------------------------------------------------------

insert into storage.objects (bucket_id, name) values ('maps', 'test-kaart-' || gen_random_uuid());

select tests.authenticate_as('collega@skyline.test');
select ok(
  (select count(*) from storage.objects where bucket_id = 'maps') > 0,
  'active staff can read the map image'
);
reset role;

select tests.authenticate_as('buitenstaander@skyline.test');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'maps'),
  0,
  'accounts that are not staff cannot see the map image'
);
reset role;

select tests.authenticate_as_anon();
select throws_ok('select * from public.map_routes', '42501', null, 'anon cannot read routes');
reset role;

select * from finish();
rollback;
