# Open Marketing Platform

A marketplace where businesses post paid requests for marketing creative. Each
request advertises a per-lead offer and a total campaign budget, so the pricing
model is performance-based rather than flat-fee.

- **Client:** React 18 + Vite, styled with [Oat](https://oat.ink) (`@knadh/oat`) — classless semantic CSS plus inline styles for layout
- **Backend:** [Supabase](https://supabase.com) — Postgres and auth, plus two Edge Functions for tracking. There is no server of our own.

## Features

- **Auth** — sign up, sign in, forgot password, and set-a-new-password, all handled
  by `client/src/Auth.jsx`. `App.jsx` watches `onAuthStateChange` and routes the
  `PASSWORD_RECOVERY` event to the reset screen when a user returns from a reset email.
- **Requests** (`client/src/offers/`) — create a request for creative, browse open
  requests in a filterable table (by category and budget band), and open a single
  request's detail view.
- **Applications** — members apply to a request they don't own; the request owner
  approves or rejects from the request's detail page. Approval mints a unique
  tracking code, which becomes a short link and a QR code under **My applications**.
- **Conversion tracking** — a business installs one snippet on their website and
  sees which platform member drove each visit and lead, across all their campaigns.
- **Account settings** (`client/src/account/`) — update email address or password,
  and get the tracking snippet. Password changes re-authenticate against the current
  password first, since Supabase's `updateUser` does not require it.

## How tracking works

1. A member is approved on a request and receives a link like
   `https://<project-ref>.supabase.co/functions/v1/r/ab3k9x`, plus its QR code.
2. A visitor follows the link or scans the code. The `r` function records a
   **click** and redirects to the request's target link with `?omp=ab3k9x` appended.
3. On the business's site, `omp.js` reads that parameter, stores it for 30 days,
   and posts a **view** to the `collect` function.
4. When the visitor converts, the business's thank-you page calls
   `omp('convert', { value: 49 })` and a **lead** is recorded against that member —
   even if the conversion happens on a later visit within the window.

Events are written only by the Edge Functions using the service role key. There
is no insert policy on `tracking_events`, so the public anon key cannot forge
hits, and a hit is credited to a member only when the request behind the code
belongs to the account that owns the site key.

## Setup

Copy `.env.example` to `.env` and fill in your Supabase project details:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The password-reset flow redirects back to `window.location.origin`, so that URL
must be registered under **Authentication → URL Configuration** in the Supabase
dashboard.

`VITE_TRACKING_BASE_URL` is optional. Set it when the Edge Functions sit behind
a custom domain — short links read better as `go.example.com/r/ab3k9x`, and QR
codes scan more reliably the shorter the encoded string. It defaults to
`${VITE_SUPABASE_URL}/functions/v1`.

### Database

Run the migration once, either by pasting it into the Supabase SQL editor or with
the CLI:

```bash
supabase db push
```

`supabase/migrations/0001_applications_and_tracking.sql` creates `applications`,
`sites`, and `tracking_events` with their RLS policies, plus the
`application_stats` rollup view. It does not touch the existing `offers` table.

### Edge Functions

Both functions are called by anonymous visitors on third-party sites, so they
must be deployed without JWT verification:

```bash
supabase functions deploy r --no-verify-jwt
supabase functions deploy collect --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — no
extra secrets to configure.

### Data

Requests are stored in a Supabase table named `offers` (the UI calls them
"requests" — the naming diverged as the app grew). Columns used by the app:

| Column | Notes |
| --- | --- |
| `id` | primary key |
| `user_id` | author, set from the signed-in user |
| `title` | required |
| `category` | one of Retail, Food & Drink, Events, Services, Health & Beauty, Other |
| `description` | optional |
| `target_link` | optional URL |
| `offer_per_lead` | numeric, nullable |
| `total_budget` | numeric, nullable |
| `created_at` | used for ordering |

The tables added by the migration are documented inline in the migration file.

## Run

```bash
npm install
npm run dev
```

Client: http://localhost:5173

## Production

```bash
npm run build   # outputs to dist/
npm run preview # serve the build locally
```

`dist/` is a static bundle — deploy it to any static host. `omp.js` ships in it
unbundled, so businesses load the pixel from `https://your-app-domain/omp.js`.

## Structure

```
client/
  public/omp.js              tracking pixel served to customer sites
  src/
    App.jsx                  session + recovery routing
    Auth.jsx                 sign in / sign up / forgot / reset
    Dashboard.jsx            header and view switching
    supabase.js              Supabase client
    tracking.js              tracking URLs and install snippet
    offers/                  CreateRequest, RequestList, RequestDetail,
                             ApplyPanel, ApplicationsPanel
    applications/            MyApplications — links, QR codes, stats
    account/                 AccountSettings, TrackingPixel
    components/              BackLink, CopyButton, QrCode
    hooks/useSupabaseQuery.js  shared fetch hook with cancellation
supabase/
  migrations/                schema and RLS policies
  functions/r                short-link redirect
  functions/collect          pixel event ingest
```

There is no router — `Dashboard.jsx` holds a single `view` name in local state
and renders one of five mutually exclusive screens.
