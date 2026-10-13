begin;
select plan(16);

select tests.create_user('met-mfa@skyline.test', 'admin');
select tests.create_user('zonder-mfa@skyline.test', 'team_member');
select tests.create_user('half-ingesteld@skyline.test', 'team_member');
select tests.add_totp_factor('met-mfa@skyline.test');
select tests.add_totp_factor('half-ingesteld@skyline.test', 'unverified');

-- Password only (aal1) with MFA enabled: no staff rights at all.
select tests.authenticate_as('met-mfa@skyline.test', 'aal1');
select is((select count(*)::int from public.staff_profiles), 0,
  'with MFA enabled, a password-only session sees no staff');
select is((select count(*)::int from public.staff_invitations), 0,
  'with MFA enabled, a password-only admin session sees no invitations');
select throws_ok(
  $$insert into public.projects (title, owner_id) values ('Zonder code', tests.user_id('met-mfa@skyline.test'))$$,
  '42501', null,
  'with MFA enabled, a password-only session cannot write'
);
reset role;

-- Password + code (aal2): full rights again.
select tests.authenticate_as('met-mfa@skyline.test', 'aal2');
select ok((select count(*) from public.staff_profiles) > 0, 'after the MFA code, staff are visible');
select ok((select private.is_admin()), 'after the MFA code, admin rights apply');
reset role;

-- Without MFA, or with an abandoned (unverified) setup, aal1 stays enough.
select tests.authenticate_as('zonder-mfa@skyline.test', 'aal1');
select ok((select count(*) from public.staff_profiles) > 0, 'staff without MFA keep access at aal1');
reset role;

select tests.authenticate_as('half-ingesteld@skyline.test', 'aal1');
select ok((select count(*) from public.staff_profiles) > 0,
  'an unverified (abandoned) MFA setup does not lock the user out');
reset role;

-- Audit of MFA changes ---------------------------------------------------------

select tests.authenticate_as('zonder-mfa@skyline.test');
select lives_ok(
  $$select public.log_mfa_event(tests.user_id('zonder-mfa@skyline.test'), 'enabled')$$,
  'staff can record their own MFA change'
);
select throws_ok(
  $$select public.log_mfa_event(tests.user_id('met-mfa@skyline.test'), 'disabled')$$,
  '42501', null,
  'staff cannot record MFA changes for someone else'
);
select throws_ok(
  $$select public.log_mfa_event(tests.user_id('half-ingesteld@skyline.test'), 'reset')$$,
  '42501', null,
  'non-admins cannot record an MFA reset'
);
reset role;

select tests.authenticate_as('met-mfa@skyline.test', 'aal2');
select lives_ok(
  $$select public.log_mfa_event(tests.user_id('zonder-mfa@skyline.test'), 'reset')$$,
  'admins can record an MFA reset of another staff member'
);
select throws_ok(
  $$select public.log_mfa_event(tests.user_id('met-mfa@skyline.test'), 'reset')$$,
  '42501', null,
  'admins cannot record a reset of their own MFA'
);
select is(
  (select actor_id from public.activity_log
   where action = 'mfa.reset' and entity_id = tests.user_id('zonder-mfa@skyline.test')::text),
  tests.user_id('met-mfa@skyline.test'),
  'the MFA reset is logged with the acting admin'
);
reset role;

-- Admin MFA overview ------------------------------------------------------------

select tests.authenticate_as('met-mfa@skyline.test', 'aal2');
select ok(
  tests.user_id('met-mfa@skyline.test') in (select public.staff_with_mfa()),
  'admins see who has MFA enabled'
);
reset role;

select tests.authenticate_as('zonder-mfa@skyline.test');
select is((select count(*)::int from public.staff_with_mfa()), 0, 'non-admins get no MFA overview');
reset role;

select tests.authenticate_as_anon();
select throws_ok('select public.staff_with_mfa()', '42501', null, 'anon cannot request the MFA overview');
reset role;

select * from finish();
rollback;
