begin;
select plan(8);

select tests.create_user('admin@skyline.test', 'admin');

select tests.authenticate_as_service_role();
select ok(public.consume_rate_limit('test:key', 2, 60), 'first hit is allowed');
select ok(public.consume_rate_limit('test:key', 2, 60), 'second hit is allowed');
select ok(not public.consume_rate_limit('test:key', 2, 60), 'third hit within the window is refused');
select ok(public.consume_rate_limit('test:other-key', 2, 60), 'limits are tracked per key');
select throws_ok(
  $$select public.consume_rate_limit('', 2, 60)$$,
  '22023', null,
  'invalid arguments are rejected'
);
reset role;

select tests.authenticate_as('admin@skyline.test');
select throws_ok(
  $$select public.consume_rate_limit('test:key', 1000, 60)$$,
  '42501', null,
  'logged-in users cannot call the rate limiter (cannot reset or probe it)'
);
select throws_ok('select * from private.rate_limits', '42501', null, 'rate limit data is not readable');
reset role;

select tests.authenticate_as_anon();
select throws_ok(
  $$select public.consume_rate_limit('test:key', 1000, 60)$$,
  '42501', null,
  'anon cannot call the rate limiter'
);
reset role;

select * from finish();
rollback;
