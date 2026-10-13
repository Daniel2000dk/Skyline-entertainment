begin;
select plan(30);

select tests.create_user('admin@skyline.test', 'admin');
select tests.create_user('manager@skyline.test', 'organizer');
select tests.create_user('medewerker@skyline.test', 'team_member');
select tests.create_user('collega@skyline.test', 'team_member');
select tests.create_user('inactief@skyline.test', 'team_member', false);
select tests.create_user('buitenstaander@skyline.test');

-- Invitation flow (runs as the database owner, like Auth does) ------------

select is(
  (select role::text from public.staff_profiles where id = tests.user_id('manager@skyline.test')),
  'organizer',
  'an invited user gets a profile with the invited role'
);

select ok(
  (select claimed_at is not null and user_id = tests.user_id('manager@skyline.test')
   from public.staff_invitations where email = 'manager@skyline.test'),
  'the invitation is marked as claimed by that user'
);

select is(
  (select count(*)::int from public.staff_profiles where id = tests.user_id('buitenstaander@skyline.test')),
  0,
  'a user without invitation does not become staff'
);

insert into public.staff_invitations (email, display_name, role, expires_at)
values ('verlopen@skyline.test', 'Verlopen', 'admin', now() - interval '1 minute');
select tests.create_user('verlopen@skyline.test');
select is(
  (select count(*)::int from public.staff_profiles where id = tests.user_id('verlopen@skyline.test')),
  0,
  'an expired invitation does not grant staff access'
);

insert into public.staff_invitations (email, display_name, role, revoked_at)
values ('ingetrokken@skyline.test', 'Ingetrokken', 'admin', now());
select tests.create_user('ingetrokken@skyline.test');
select is(
  (select count(*)::int from public.staff_profiles where id = tests.user_id('ingetrokken@skyline.test')),
  0,
  'a revoked invitation does not grant staff access'
);

insert into public.staff_invitations (email, display_name, role)
values ('hoofdletters@skyline.test', 'Hoofdletters', 'team_member');
select tests.create_user('HoofdLetters@Skyline.test');
select is(
  (select count(*)::int from public.staff_profiles where id = tests.user_id('HoofdLetters@Skyline.test')),
  1,
  'invitation matching ignores email case'
);

-- Anonymous visitors --------------------------------------------------------

select tests.authenticate_as_anon();
select throws_ok('select * from public.staff_profiles', '42501', null, 'anon cannot read staff profiles');
select throws_ok('select * from public.staff_invitations', '42501', null, 'anon cannot read invitations');
reset role;

-- Authenticated users without (active) staff profile ------------------------

select tests.authenticate_as('buitenstaander@skyline.test');
select is((select count(*)::int from public.staff_profiles), 0, 'a non-staff user sees no staff');
select is((select count(*)::int from public.staff_invitations), 0, 'a non-staff user sees no invitations');
reset role;

select tests.authenticate_as('inactief@skyline.test');
select is((select count(*)::int from public.staff_profiles), 0, 'a deactivated staff member sees no staff');
reset role;

-- Regular staff (Medewerker) -------------------------------------------------

select tests.authenticate_as('medewerker@skyline.test');
select is((select count(*)::int from public.staff_profiles), 6, 'active staff can see all staff profiles');
select is((select count(*)::int from public.staff_invitations), 0, 'non-admins cannot see invitations (or emails)');

update public.staff_profiles set display_name = 'Nieuwe naam'
where id = tests.user_id('medewerker@skyline.test');
select is(
  (select display_name from public.staff_profiles where id = tests.user_id('medewerker@skyline.test')),
  'Nieuwe naam',
  'staff can change their own display name'
);

select throws_ok(
  $$update public.staff_profiles set role = 'admin' where id = tests.user_id('medewerker@skyline.test')$$,
  '42501', null,
  'staff cannot promote themselves'
);

update public.staff_profiles set display_name = 'Gehackt'
where id = tests.user_id('collega@skyline.test');
reset role;
select isnt(
  (select display_name from public.staff_profiles where id = tests.user_id('collega@skyline.test')),
  'Gehackt',
  'staff cannot edit a colleague''s profile'
);

select tests.authenticate_as('medewerker@skyline.test');
select throws_ok(
  $$insert into public.staff_invitations (email, display_name, role) values ('x@skyline.test', 'X', 'admin')$$,
  '42501', null,
  'non-admins cannot invite staff'
);
select throws_ok(
  $$insert into public.staff_profiles (id, display_name, role) values (gen_random_uuid(), 'X', 'admin')$$,
  '42501', null,
  'nobody can insert staff profiles directly'
);
reset role;

-- Event Manager ---------------------------------------------------------------

select tests.authenticate_as('manager@skyline.test');
update public.staff_profiles set role = 'admin' where id = tests.user_id('collega@skyline.test');
reset role;
select is(
  (select role::text from public.staff_profiles where id = tests.user_id('collega@skyline.test')),
  'team_member',
  'an Event Manager cannot change other staff roles'
);

-- Administrator -----------------------------------------------------------------

select tests.authenticate_as('admin@skyline.test');
select is((select count(*)::int from public.staff_invitations), 8, 'admins can see all invitations');

select lives_ok(
  $$update public.staff_profiles set role = 'organizer' where id = tests.user_id('collega@skyline.test')$$,
  'admins can change another staff member''s role'
);
select throws_ok(
  $$update public.staff_profiles set role = 'team_member' where id = tests.user_id('admin@skyline.test')$$,
  '42501', null,
  'admins cannot change their own role (keeps at least one admin)'
);
select throws_ok(
  $$update public.staff_profiles set is_active = false where id = tests.user_id('admin@skyline.test')$$,
  '42501', null,
  'admins cannot deactivate themselves'
);
select throws_ok(
  $$delete from public.staff_profiles where id = tests.user_id('collega@skyline.test')$$,
  '42501', null,
  'staff profiles cannot be deleted through the API (deactivate instead)'
);

select lives_ok(
  $$insert into public.staff_invitations (email, display_name, role) values ('nieuw@skyline.test', 'Nieuw', 'team_member')$$,
  'admins can create invitations'
);
select is(
  (select invited_by from public.staff_invitations where email = 'nieuw@skyline.test'),
  tests.user_id('admin@skyline.test'),
  'invited_by is set from the session, not from input'
);
select throws_ok(
  $$insert into public.staff_invitations (email, display_name, role, invited_by)
    values ('vals@skyline.test', 'Vals', 'admin', tests.user_id('collega@skyline.test'))$$,
  '42501', null,
  'invited_by cannot be forged'
);
select throws_ok(
  $$insert into public.staff_invitations (email, display_name, role) values ('nieuw@skyline.test', 'Dubbel', 'team_member')$$,
  '23505', null,
  'only one open invitation per email'
);

update public.staff_invitations set revoked_at = now() where email = 'nieuw@skyline.test';

update public.staff_profiles set is_active = false where id = tests.user_id('medewerker@skyline.test');
reset role;

select tests.authenticate_as('medewerker@skyline.test');
select is((select count(*)::int from public.staff_profiles), 0, 'a deactivated staff member immediately loses access');
reset role;

select ok(
  (select revoked_at is not null from public.staff_invitations where email = 'nieuw@skyline.test'),
  'admins can revoke open invitations'
);

select * from finish();
rollback;
