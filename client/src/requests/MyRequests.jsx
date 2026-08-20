import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { useSite } from '../hooks/useSite.js';
import { installSnippet, CONVERSION_SNIPPET } from '../tracking.js';
import BackLink from '../components/BackLink.jsx';
import CodeBlock from '../components/CodeBlock.jsx';

// Pixel setup state for one request.
//
// Clicks are recorded server-side by the redirect function, so they arrive
// whether or not the pixel is installed. Views and leads only ever come from
// the pixel. That asymmetry is what makes the diagnosis below reliable:
// clicks with no views means traffic is reaching the site but the snippet
// is not reporting back.
function pixelStatus({ clicks, views, conversions }) {
  if (clicks === 0 && views === 0) {
    return {
      label: 'Waiting for traffic',
      detail: 'No one has used a tracking link for this request yet, so there is nothing to verify. Install the snippet now and it will start reporting as soon as the first visitor arrives.',
    };
  }
  if (views === 0) {
    return {
      label: 'Pixel not detected',
      detail: `${clicks} ${clicks === 1 ? 'visitor has' : 'visitors have'} been sent to your page, but the pixel has not reported a single view. Check that step 1 is installed on the page your target link points to.`,
    };
  }
  if (conversions === 0) {
    return {
      label: 'Installed — no leads yet',
      detail: 'The pixel is reporting page views, so step 1 is working. Leads are only counted when step 2 runs, so add the conversion call to your thank-you page.',
    };
  }
  return {
    label: 'Fully configured',
    detail: 'Views and leads are both being recorded for this request.',
  };
}

export default function MyRequests({ user, onBack }) {
  const { site, loading: siteLoading, error: siteError } = useSite(user.id);

  const { data: requests, loading, error } = useSupabaseQuery(
    () => supabase
      .from('offers')
      .select('id, title, category, target_link, offer_per_lead, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    [user.id]
  );

  // Per-link rollups for every link pointing at one of this account's
  // requests. RLS already limits link_stats to links the caller owns or that
  // target the caller's own requests, so no extra filtering is needed here.
  const { data: stats } = useSupabaseQuery(
    () => supabase
      .from('link_stats')
      .select('link_id, offer_id, clicks, views, conversions'),
    [user.id]
  );

  // Roll the per-link rows up to one total per request.
  const totalsByOffer = {};
  for (const row of stats ?? []) {
    const t = totalsByOffer[row.offer_id] ??= { clicks: 0, views: 0, conversions: 0, links: 0 };
    t.clicks += row.clicks ?? 0;
    t.views += row.views ?? 0;
    t.conversions += row.conversions ?? 0;
    t.links += 1;
  }

  if (loading || siteLoading) return <p>Loading…</p>;

  const mine = requests ?? [];

  return (
    <section>
      <BackLink onBack={onBack} />
      <h2 style={{ marginTop: '1rem' }}>My requests</h2>

      {error && <p role="alert">{error}</p>}
      {siteError && <p role="alert">{siteError}</p>}

      {!error && mine.length === 0 && (
        <p>You haven't posted any requests yet.</p>
      )}

      {mine.length > 0 && (
        <p>
          One snippet covers every request on this account
          {site && <> — your site key is <code>{site.site_key}</code></>}. Each
          request below shows whether that request's target page is reporting back.
        </p>
      )}

      {mine.map(request => {
        const totals = totalsByOffer[request.id] ?? { clicks: 0, views: 0, conversions: 0, links: 0 };
        const status = pixelStatus(totals);

        return (
          <article key={request.id} style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #8884' }}>
            <header>
              <h3 style={{ marginBottom: '0.25rem' }}>{request.title}</h3>
              <p style={{ margin: 0 }}>
                <small>
                  {request.category} · ${request.offer_per_lead ?? 0} per lead ·{' '}
                  {totals.links} {totals.links === 1 ? 'link' : 'links'} promoting this
                </small>
              </p>
            </header>

            <p style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>
              <strong>{status.label}</strong>
            </p>
            <p style={{ marginTop: 0 }}><small>{status.detail}</small></p>

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))', gap: '0.5rem 1.5rem', margin: '1rem 0' }}>
              <div>
                <dt><small>Clicks</small></dt>
                <dd style={{ margin: 0, fontSize: '1.25rem' }}>{totals.clicks}</dd>
              </div>
              <div>
                <dt><small>Landing views</small></dt>
                <dd style={{ margin: 0, fontSize: '1.25rem' }}>{totals.views}</dd>
              </div>
              <div>
                <dt><small>Leads</small></dt>
                <dd style={{ margin: 0, fontSize: '1.25rem' }}>{totals.conversions}</dd>
              </div>
            </dl>

            {request.target_link ? (
              <p style={{ margin: '0 0 1rem' }}>
                <small>
                  Install on{' '}
                  <a href={request.target_link} target="_blank" rel="noreferrer">{request.target_link}</a>
                </small>
              </p>
            ) : (
              <p style={{ margin: '0 0 1rem' }}>
                <small role="alert">
                  This request has no target link, so its tracking links cannot
                  redirect anywhere. Add one to start collecting traffic.
                </small>
              </p>
            )}

            {site && (
              <details>
                <summary>Pixel setup for this request</summary>

                <h4 style={{ marginTop: '1rem' }}>1. Install on every page</h4>
                <p><small>Paste this just before the closing <code>&lt;/body&gt;</code> tag.</small></p>
                <CodeBlock code={installSnippet(site.site_key)} copyLabel="Copy snippet" />

                <h4 style={{ marginTop: '1.5rem' }}>2. Record a lead</h4>
                <p>
                  <small>
                    Call this on the thank-you page visitors reach after converting.
                    <code>value</code> is optional and records what the lead was worth.
                  </small>
                </p>
                <CodeBlock code={CONVERSION_SNIPPET} copyLabel="Copy conversion call" />
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}
