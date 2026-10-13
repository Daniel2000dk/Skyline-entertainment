-- Durable fixed-window rate limiting in Postgres (shared across serverless
-- instances, no extra paid service). Keys must be keyed digests (HMAC) built
-- on the trusted server, never raw IP addresses or emails.

create table private.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create index rate_limits_window_start_idx on private.rate_limits (window_start);

revoke all on private.rate_limits from public, anon, authenticated;

-- Returns true when the call is allowed (hit counted), false when over limit.
create function public.consume_rate_limit(
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
  current_window timestamptz;
  total integer;
begin
  if limit_key is null or char_length(limit_key) not between 1 and 200
     or max_hits not between 1 and 100000
     or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit arguments' using errcode = '22023';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  insert into private.rate_limits as r (key, window_start, hits)
  values (limit_key, current_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into total;

  -- Opportunistic retention: expired windows are deleted within ~a day
  -- without needing a cron job.
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;

  return total <= max_hits;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
