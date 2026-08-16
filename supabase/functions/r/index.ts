// Short-link redirect.
//
//   https://<project-ref>.supabase.co/functions/v1/r/<tracking_code>
//
// Looks up the approved application behind the code, records a click, and
// sends the visitor to the request's target link with `?omp=<code>` appended
// so the pixel on the destination site can attribute the visit.
//
// Deploy with: supabase functions deploy r --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { embeddedOne } from '../_shared/postgrest.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  // Service role: this function writes tracking rows that no client is
  // allowed to insert directly.
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

function fail(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Accept both /functions/v1/r/<code> and /functions/v1/r?c=<code>.
  const fromPath = url.pathname.split('/').filter(Boolean).pop();
  const code = url.searchParams.get('c') ?? (fromPath === 'r' ? null : fromPath);

  if (!code) return fail('Missing tracking code.', 400);

  const { data: application, error } = await supabase
    .from('applications')
    .select('id, offer_id, status, offers ( user_id, target_link )')
    .eq('tracking_code', code)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) return fail('Lookup failed.', 500);
  if (!application) return fail('Unknown or inactive tracking link.', 404);

  const offer = embeddedOne<{ user_id: string; target_link: string | null }>(application.offers);
  if (!offer?.target_link) return fail('This request has no target link.', 404);

  // Resolve the request owner's site so the click shows up alongside the
  // pixel's own events. A business that has never opened Account Settings
  // has no site row yet, which is fine — the click is still attributed to
  // the application.
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('user_id', offer.user_id)
    .maybeSingle();

  // Fire and forget: a tracking write must never delay or break the redirect.
  await supabase.from('tracking_events').insert({
    site_id: site?.id ?? null,
    application_id: application.id,
    offer_id: application.offer_id,
    event_type: 'click',
    url: offer.target_link,
    referrer: req.headers.get('referer'),
  });

  const destination = new URL(offer.target_link);
  destination.searchParams.set('omp', code);

  return new Response(null, {
    status: 302,
    headers: {
      location: destination.toString(),
      // Attribution must be recorded on every click, so never let a CDN or
      // browser serve this redirect from cache.
      'cache-control': 'no-store',
    },
  });
});
