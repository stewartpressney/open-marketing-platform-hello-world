# Open Marketing Platform

A marketplace where businesses post paid requests for marketing creative. Each
request advertises a per-lead offer and a total campaign budget, so the pricing
model is performance-based rather than flat-fee.

- **Client:** React 18 + Vite, styled with [Oat](https://oat.ink) (`@knadh/oat`) — classless semantic CSS plus inline styles for layout
- **Backend:** [Supabase](https://supabase.com) for both auth and data. There is no server of our own.

## Features

- **Auth** — sign up, sign in, forgot password, and set-a-new-password, all handled
  by `client/src/Auth.jsx`. `App.jsx` watches `onAuthStateChange` and routes the
  `PASSWORD_RECOVERY` event to the reset screen when a user returns from a reset email.
- **Requests** (`client/src/offers/`) — create a request for creative, browse open
  requests in a filterable table (by category and budget band), and open a single
  request's detail view.
- **Account settings** (`client/src/account/`) — update email address or password.
  Password changes re-authenticate against the current password first, since
  Supabase's `updateUser` does not require it.

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

`dist/` is a static bundle — deploy it to any static host.

## Structure

```
client/src/
  App.jsx                    session + recovery routing
  Auth.jsx                   sign in / sign up / forgot / reset
  Dashboard.jsx              header and view switching
  supabase.js                Supabase client
  offers/                    CreateRequest, RequestList, RequestDetail
  account/AccountSettings.jsx
  components/BackLink.jsx
  hooks/useSupabaseQuery.js  shared fetch hook with cancellation
```

There is no router — `Dashboard.jsx` picks one of four mutually exclusive views
from local state.
