// Pixel event ingest.
//
//   POST https://<project-ref>.supabase.co/functions/v1/collect
//        { site_key, code, event, value, visitor_id, url, referrer }
//
//   GET  https://<project-ref>.supabase.co/functions/v1/collect?site_key=…&code=…
//        returns a 1x1 GIF, for a plain <img> install with no JavaScript.
//
// Writes go through the service role key, which is why there is no insert
// policy on tracking_events — the public anon key cannot forge hits.
//
// Deploy with: supabase functions deploy collect --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// The pixel runs on our customers' own domains, so any origin may post here.
// Nothing readable is returned, so there is no data to leak cross-origin.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const VALID_EVENTS = ['view', 'convert'];

// Smallest possible transparent GIF, for the <img> install path.
const PIXEL_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

type Payload = {
  site_key?: string;
  code?: string | null;
  event?: string;
  value?: unknown;
  visitor_id?: string | null;
  url?: string | null;
  referrer?: string | null;
};

// Keep free-text fields bounded — they arrive from arbitrary third-party pages.
const trim = (v: unknown, max: number) =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null;

async function record(payload: Payload): Promise<number> {
  const event = payload.event ?? 'view';
  if (!payload.site_key || !VALID_EVENTS.includes(event)) return 400;

  const { data: site } = await supabase
    .from('sites')
    .select('id, user_id')
    .eq('site_key', payload.site_key)
    .maybeSingle();

  if (!site) return 404;

  // Resolve attribution. An unrecognised code is not an error — the visit is
  // still recorded, just unattributed, so site totals stay honest.
  let applicationId: string | null = null;
  let offerId: string | null = null;

  if (payload.code) {
    const { data: application } = await supabase
      .from('applications')
      .select('id, offer_id, offers ( user_id )')
      .eq('tracking_code', payload.code)
      .eq('status', 'approved')
      .maybeSingle();

    // Only attribute when the request behind the code actually belongs to the
    // account that owns this site. Otherwise anyone could paste someone
    // else's code onto their page and inflate that applicant's numbers.
    const offer = application?.offers as { user_id: string } | null;
    if (application && offer?.user_id === site.user_id) {
      applicationId = application.id;
      offerId = application.offer_id;
    }
  }

  const rawValue = Number(payload.value);
  const value = event === 'convert' && Number.isFinite(rawValue) && rawValue >= 0
    ? rawValue
    : null;

  const { error } = await supabase.from('tracking_events').insert({
    site_id: site.id,
    application_id: applicationId,
    offer_id: offerId,
    event_type: event,
    value,
    visitor_id: trim(payload.visitor_id, 64),
    url: trim(payload.url, 2048),
    referrer: trim(payload.referrer, 2048),
  });

  return error ? 500 : 204;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams;
    await record({
      site_key: params.get('site_key') ?? undefined,
      code: params.get('code'),
      event: params.get('event') ?? 'view',
      value: params.get('value'),
      visitor_id: params.get('visitor_id'),
      url: params.get('url'),
      referrer: req.headers.get('referer'),
    });

    // Always return the GIF, even on a bad request — a broken image on a
    // customer's page would be a worse failure than a dropped event.
    return new Response(PIXEL_GIF, {
      status: 200,
      headers: { ...CORS, 'content-type': 'image/gif', 'cache-control': 'no-store' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(null, { status: 405, headers: CORS });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(null, { status: 400, headers: CORS });
  }

  const status = await record(payload);
  return new Response(null, { status, headers: CORS });
});
