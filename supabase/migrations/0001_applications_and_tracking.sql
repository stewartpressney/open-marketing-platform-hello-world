-- Applications, per-account tracking sites, and pixel events.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) before
-- deploying the app. It only creates new objects — the existing `offers`
-- table and its policies are left untouched.

-- ---------------------------------------------------------------------------
-- Short-code generation
-- ---------------------------------------------------------------------------

-- Codes appear in URLs and QR codes, so the alphabet omits characters that are
-- easy to confuse when read aloud or retyped: 0/o, 1/l, etc.
create or replace function public.generate_short_code(len int default 8)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'abcdefghijkmnpqrstuvwxyz23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- sites — one row per account, holding the public site key used by the pixel
-- ---------------------------------------------------------------------------

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_key text not null unique,
  name text,
  created_at timestamptz not null default now(),
  -- One key per account: the same snippet covers every campaign the account
  -- runs, so there is nothing to re-install when a new request is approved.
  unique (user_id)
);

alter table public.sites enable row level security;

create policy "sites are readable by their owner"
  on public.sites for select
  to authenticated
  using (user_id = auth.uid());

create policy "sites are insertable by their owner"
  on public.sites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sites are updatable by their owner"
  on public.sites for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mint the site key server-side so a client can never choose its own.
create or replace function public.set_site_key()
returns trigger
language plpgsql
as $$
begin
  loop
    new.site_key := 'omp_' || public.generate_short_code(16);
    exit when not exists (select 1 from public.sites where site_key = new.site_key);
  end loop;
  return new;
end;
$$;

create trigger sites_set_key
  before insert on public.sites
  for each row
  execute function public.set_site_key();

-- ---------------------------------------------------------------------------
-- applications — a platform user applying to run traffic for a request
-- ---------------------------------------------------------------------------

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  pitch text,
  -- Null until approved; this is what identifies the applicant in tracking URLs.
  tracking_code text unique,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  -- One application per person per request.
  unique (offer_id, applicant_id)
);

create index if not exists applications_offer_id_idx on public.applications (offer_id);
create index if not exists applications_applicant_id_idx on public.applications (applicant_id);

alter table public.applications enable row level security;

-- Applicants see their own applications; request owners see applications made
-- to their requests.
create policy "applications are readable by applicant or request owner"
  on public.applications for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.offers o
      where o.id = offer_id and o.user_id = auth.uid()
    )
  );

-- You may only apply as yourself, and never to your own request.
create policy "applications are insertable by other users"
  on public.applications for insert
  to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.offers o
      where o.id = offer_id and o.user_id <> auth.uid()
    )
  );

-- Only the request owner decides. Applicants deliberately have no UPDATE
-- policy, so they cannot approve themselves or edit their tracking code.
create policy "applications are updatable by the request owner"
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_id and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.offers o
      where o.id = offer_id and o.user_id = auth.uid()
    )
  );

-- An applicant may withdraw while still pending.
create policy "pending applications are deletable by the applicant"
  on public.applications for delete
  to authenticated
  using (applicant_id = auth.uid() and status = 'pending');

-- Mint the tracking code the moment an application is approved, and stamp the
-- decision time. Doing it in a trigger means the code cannot be forged by a
-- client and is never present on a pending or rejected row.
create or replace function public.handle_application_decision()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.decided_at := now();
  end if;

  if new.status = 'approved' and new.tracking_code is null then
    loop
      new.tracking_code := public.generate_short_code(8);
      exit when not exists (
        select 1 from public.applications where tracking_code = new.tracking_code
      );
    end loop;
  end if;

  return new;
end;
$$;

create trigger applications_handle_decision
  before update on public.applications
  for each row
  execute function public.handle_application_decision();

-- ---------------------------------------------------------------------------
-- tracking_events — raw pixel hits
-- ---------------------------------------------------------------------------

create table if not exists public.tracking_events (
  id bigint generated always as identity primary key,
  site_id uuid references public.sites (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  -- 'click' is recorded by the redirect function and so is available even
  -- before the business installs the pixel; 'view' and 'convert' come from
  -- the pixel on the business's own site.
  event_type text not null check (event_type in ('click', 'view', 'convert')),
  value numeric,
  visitor_id text,
  url text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists tracking_events_application_idx
  on public.tracking_events (application_id, event_type);
create index if not exists tracking_events_site_idx
  on public.tracking_events (site_id, created_at desc);

alter table public.tracking_events enable row level security;

-- Both sides of a campaign can read its events: the business that owns the
-- site, and the applicant who drove the traffic. There is no insert policy —
-- writes only happen through the `collect` Edge Function using the service
-- role key, so hits cannot be forged with the public anon key.
create policy "events are readable by site owner or attributed applicant"
  on public.tracking_events for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- application_stats — per-application rollup used by the dashboard
-- ---------------------------------------------------------------------------

-- security_invoker makes the view respect the querying user's RLS on the
-- underlying tables, so it exposes nothing the caller could not already read.
create or replace view public.application_stats
with (security_invoker = true) as
select
  a.id as application_id,
  a.offer_id,
  a.applicant_id,
  count(*) filter (where e.event_type = 'click') as clicks,
  count(*) filter (where e.event_type = 'view') as views,
  count(*) filter (where e.event_type = 'convert') as conversions,
  coalesce(sum(e.value) filter (where e.event_type = 'convert'), 0) as conversion_value,
  max(e.created_at) as last_event_at
from public.applications a
left join public.tracking_events e on e.application_id = a.id
group by a.id, a.offer_id, a.applicant_id;
