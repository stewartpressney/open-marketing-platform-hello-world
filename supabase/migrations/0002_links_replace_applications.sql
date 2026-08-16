-- Replace "applying to a request" with self-service tracking links.
--
-- Any signed-in user can now mint a link for any request, including their own.
-- There is no pending/approved/rejected lifecycle and no owner decision step,
-- so the tracking code is minted at INSERT rather than on approval.
--
-- Tables and columns are renamed rather than dropped and recreated, so any
-- existing rows and their tracking codes survive.

-- ---------------------------------------------------------------------------
-- Tear down the approval machinery
-- ---------------------------------------------------------------------------

-- The view is rebuilt at the end; it has to go first because it depends on
-- the columns being renamed below.
drop view if exists public.application_stats;

drop trigger if exists applications_handle_decision on public.applications;
drop function if exists public.handle_application_decision();

-- ---------------------------------------------------------------------------
-- applications -> links
-- ---------------------------------------------------------------------------

alter table public.applications rename to links;
alter table public.links rename column applicant_id to user_id;

alter index if exists applications_offer_id_idx rename to links_offer_id_idx;
alter index if exists applications_applicant_id_idx rename to links_user_id_idx;

-- The old policies must go before the columns they reference: the delete
-- policy tests `status = 'pending'`, and Postgres refuses to drop a column
-- while a policy still depends on it. (Renames above need no such care —
-- Postgres rewrites policy bodies to follow a renamed column.)
drop policy if exists "applications are readable by applicant or request owner" on public.links;
drop policy if exists "applications are insertable by other users" on public.links;
drop policy if exists "applications are updatable by the request owner" on public.links;
drop policy if exists "pending applications are deletable by the applicant" on public.links;

-- `pitch` and the decision columns only existed to support approval.
alter table public.links drop column if exists status;
alter table public.links drop column if exists pitch;
alter table public.links drop column if exists decided_at;

-- Previously null until approval. Every link now has a code from birth, so
-- backfill the stragglers before enforcing it.
update public.links
set tracking_code = public.generate_short_code(8)
where tracking_code is null;

alter table public.links alter column tracking_code set not null;

-- Mint the code server-side at insert: a client still must never be able to
-- choose its own code.
create or replace function public.set_link_code()
returns trigger
language plpgsql
as $$
begin
  loop
    new.tracking_code := public.generate_short_code(8);
    exit when not exists (
      select 1 from public.links where tracking_code = new.tracking_code
    );
  end loop;
  return new;
end;
$$;

create trigger links_set_code
  before insert on public.links
  for each row
  execute function public.set_link_code();

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Owners still see the links pointing at their own requests — that is how a
-- business sees who is driving its traffic.
create policy "links are readable by their owner or the request owner"
  on public.links for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.offers o
      where o.id = offer_id and o.user_id = auth.uid()
    )
  );

-- Any authenticated user, any request — including their own. The only
-- restriction left is that you cannot mint a link in someone else's name.
create policy "links are insertable by their owner"
  on public.links for insert
  to authenticated
  with check (user_id = auth.uid());

-- No UPDATE policy: a link is immutable once minted. Deleting and
-- regenerating is the supported way to rotate a code.
create policy "links are deletable by their owner"
  on public.links for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tracking_events.application_id -> link_id
-- ---------------------------------------------------------------------------

alter table public.tracking_events rename column application_id to link_id;
alter index if exists tracking_events_application_idx rename to tracking_events_link_idx;

drop policy if exists "events are readable by site owner or attributed applicant" on public.tracking_events;

create policy "events are readable by site owner or link owner"
  on public.tracking_events for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      where s.id = site_id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.links l
      where l.id = link_id and l.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- link_stats — per-link rollup used by My Links
-- ---------------------------------------------------------------------------

create or replace view public.link_stats
with (security_invoker = true) as
select
  l.id as link_id,
  l.offer_id,
  l.user_id,
  count(*) filter (where e.event_type = 'click') as clicks,
  count(*) filter (where e.event_type = 'view') as views,
  count(*) filter (where e.event_type = 'convert') as conversions,
  coalesce(sum(e.value) filter (where e.event_type = 'convert'), 0) as conversion_value,
  max(e.created_at) as last_event_at
from public.links l
left join public.tracking_events e on e.link_id = l.id
group by l.id, l.offer_id, l.user_id;
