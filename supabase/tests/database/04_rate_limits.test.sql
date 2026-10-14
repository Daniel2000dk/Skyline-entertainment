begin;
select plan(9);

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

-- Sliding window: a full previous window still counts (no double budget at the
-- boundary). 1000 earlier hits outweigh a limit of 5 for all but the last
-- seconds of the (daily) window.
insert into private.rate_limits (key, window_start, hits)
values ('test:slide', to_timestamp(floor(extract(epoch from now()) / 86400) * 86400) - interval '1 day', 1000);
select tests.authenticate_as_service_role();
select ok(not public.consume_rate_limit('test:slide', 5, 86400), 'hits from the previous window still count');
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
