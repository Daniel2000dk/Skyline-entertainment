begin;
select plan(20);

select tests.create_user('ul-admin@skyline.test', 'admin');
select tests.create_user('ul-admin2@skyline.test', 'admin');
select tests.create_user('ul-lid@skyline.test', 'team_member');
select tests.create_user('ul-weg@skyline.test', 'team_member', false);
select tests.create_user('ul-buiten@skyline.test');

update public.staff_profiles set username = 'ul-lid' where id = tests.user_id('ul-lid@skyline.test');
update public.staff_profiles set username = 'ul-weg' where id = tests.user_id('ul-weg@skyline.test');

-- Usernames ------------------------------------------------------------------
select ok(
  (select username ~ '^medewerker-[0-9a-f]{8}$' from public.staff_profiles
   where id = tests.user_id('ul-admin@skyline.test')),
  'staff invited without a username get a generated one'
);
select throws_ok(
  $$update public.staff_profiles set username = 'Met Spatie' where id = tests.user_id('ul-lid@skyline.test')$$,
  '23514', null, 'usernames must match the format'
);
select throws_ok(
  $$update public.staff_profiles set username = 'ul-weg' where id = tests.user_id('ul-lid@skyline.test')$$,
  '23505', null, 'usernames are unique'
);

select tests.authenticate_as('ul-lid@skyline.test');
select throws_ok(
  $$update public.staff_profiles set username = 'zelf-gekozen' where id = tests.user_id('ul-lid@skyline.test')$$,
  '42501', null, 'staff cannot change their own username'
);
reset role;

select tests.authenticate_as('ul-admin@skyline.test');
select lives_ok(
  $$update public.staff_profiles set username = 'ul-lid2' where id = tests.user_id('ul-lid@skyline.test')$$,
  'admins can change usernames'
);
reset role;
update public.staff_profiles set username = 'ul-lid' where id = tests.user_id('ul-lid@skyline.test');

-- Login lookup: server (service_role) only -------------------------------------
select is(public.staff_login_email(' UL-LID '), 'ul-lid@skyline.test',
  'the login lookup is case-insensitive');
select is(public.staff_login_email('ul-weg'), null, 'deactivated staff cannot log in');
select is(public.staff_login_email('bestaat-niet'), null, 'unknown usernames resolve to nothing');
select ok(not has_function_privilege('anon', 'public.staff_login_email(text)', 'execute'),
  'anon cannot look up login emails');
select ok(not has_function_privilege('authenticated', 'public.staff_login_email(text)', 'execute'),
  'staff cannot look up login emails');

-- Activation links -------------------------------------------------------------
select tests.authenticate_as('ul-lid@skyline.test');
select throws_ok(
  $$select public.create_staff_activation(tests.user_id('ul-admin@skyline.test'), repeat('a', 64), repeat('b', 64))$$,
  '42501', null, 'non-admins cannot create activation links'
);
select throws_ok($$select * from public.staff_activations$$, '42501', null,
  'staff cannot read activation links');
reset role;

select tests.authenticate_as('ul-admin@skyline.test');
select throws_ok(
  $$select public.create_staff_activation(tests.user_id('ul-admin@skyline.test'), repeat('a', 64), repeat('b', 64))$$,
  '42501', null, 'admins cannot create a link for themselves'
);
select lives_ok(
  $$select public.create_staff_activation(tests.user_id('ul-lid@skyline.test'), repeat('a', 64), repeat('b', 64))$$,
  'admins create links for other staff'
);
select lives_ok(
  $$select public.create_staff_activation(tests.user_id('ul-lid@skyline.test'), repeat('c', 64), repeat('d', 64))$$,
  'a new link for the same member'
);
reset role;

select is((select count(*)::int from public.staff_activations
           where staff_id = tests.user_id('ul-lid@skyline.test')), 1,
  'a new link replaces the older open link');
select is((select count(*)::int from public.activity_log
           where action = 'login_link.created' and entity_id = tests.user_id('ul-lid@skyline.test')::text), 2,
  'every link is logged');
select ok(not has_function_privilege('authenticated', 'public.redeem_staff_activation(text, text)', 'execute'),
  'only the server can redeem links');

-- Five wrong codes burn the link; the right code then fails too.
select public.redeem_staff_activation(repeat('c', 64), repeat('0', 64)) from generate_series(1, 5);
select is(public.redeem_staff_activation(repeat('c', 64), repeat('d', 64)), null,
  'after five wrong codes the link is unusable');

select tests.authenticate_as('ul-admin@skyline.test');
select public.create_staff_activation(tests.user_id('ul-lid@skyline.test'), repeat('e', 64), repeat('f', 64));
reset role;
select is(
  array[
    public.redeem_staff_activation(repeat('e', 64), repeat('f', 64)),
    public.redeem_staff_activation(repeat('e', 64), repeat('f', 64))
  ],
  array[tests.user_id('ul-lid@skyline.test'), null],
  'the right code works exactly once'
);

select * from finish();
rollback;
