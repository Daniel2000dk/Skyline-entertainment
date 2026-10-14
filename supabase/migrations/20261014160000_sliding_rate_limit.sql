-- Sliding-window rate limiting. A fixed window lets an attacker spend the
-- full budget just before a window boundary and again just after it (twice
-- the limit). The previous window now still counts, weighted by how much of
-- it overlaps the sliding window: hits_now + hits_previous * (1 - elapsed).

create or replace function public.consume_rate_limit(
  limit_key text,
  max_hits integer,
  window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  now_epoch double precision := extract(epoch from clock_timestamp());
  current_window timestamptz;
  elapsed double precision;
  total integer;
  previous integer;
begin
  if limit_key is null or char_length(limit_key) not between 1 and 200
     or max_hits not between 1 and 100000
     or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit arguments' using errcode = '22023';
  end if;

  current_window := to_timestamp(floor(now_epoch / window_seconds) * window_seconds);
  elapsed := (now_epoch - extract(epoch from current_window)) / window_seconds;

  insert into private.rate_limits as r (key, window_start, hits)
  values (limit_key, current_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into total;

  select r.hits into previous
  from private.rate_limits r
  where r.key = limit_key
    and r.window_start = current_window - make_interval(secs => window_seconds);

  -- Opportunistic retention (no cron job): keep at most two days.
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;

  return total + coalesce(previous, 0) * (1 - elapsed) <= max_hits;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
