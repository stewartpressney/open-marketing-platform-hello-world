import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { trackingUrl } from '../tracking.js';
import BackLink from '../components/BackLink.jsx';
import LinkShare from '../components/LinkShare.jsx';

// Every tracking link the user has generated, with its QR code and performance.
export default function MyLinks({ user, onBack }) {
  const { data, loading, error } = useSupabaseQuery(
    () => supabase
      .from('links')
      .select('id, tracking_code, created_at, offers ( id, title, category, offer_per_lead )')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    [user.id]
  );

  // Stats live in a separate view, so they're fetched alongside and joined by
  // link id rather than nested in the query above.
  const { data: stats } = useSupabaseQuery(
    () => supabase
      .from('link_stats')
      .select('link_id, clicks, views, conversions, conversion_value')
      .eq('user_id', user.id),
    [user.id]
  );

  const statsById = Object.fromEntries((stats ?? []).map(s => [s.link_id, s]));
  const links = data ?? [];

  return (
    <section>
      <BackLink onBack={onBack} />
      <h2 style={{ marginTop: '1rem' }}>My links</h2>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && links.length === 0 && (
        <p>You haven't generated any tracking links yet. Open a request to create one.</p>
      )}

      {links.map(link => {
        const offer = link.offers;
        const stat = statsById[link.id];

        return (
          <article key={link.id} style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #8884' }}>
            <header>
              <h3 style={{ marginBottom: '0.25rem' }}>{offer?.title ?? 'Request removed'}</h3>
              <p style={{ margin: 0 }}>
                <small>{offer?.category} · ${offer?.offer_per_lead ?? 0} per lead</small>
              </p>
            </header>

            <LinkShare
              url={trackingUrl(link.tracking_code)}
              qrLabel={`QR code for ${offer?.title ?? 'your link'}`}
            />

            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8rem, 1fr))', gap: '0.5rem 1.5rem', marginTop: '1.5rem' }}>
              <div>
                <dt><small>Clicks</small></dt>
                <dd style={{ margin: 0, fontSize: '1.5rem' }}>{stat?.clicks ?? 0}</dd>
              </div>
              <div>
                <dt><small>Landing views</small></dt>
                <dd style={{ margin: 0, fontSize: '1.5rem' }}>{stat?.views ?? 0}</dd>
              </div>
              <div>
                <dt><small>Leads</small></dt>
                <dd style={{ margin: 0, fontSize: '1.5rem' }}>{stat?.conversions ?? 0}</dd>
              </div>
              <div>
                <dt><small>Earned</small></dt>
                <dd style={{ margin: 0, fontSize: '1.5rem' }}>
                  ${((stat?.conversions ?? 0) * (offer?.offer_per_lead ?? 0)).toLocaleString()}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </section>
  );
}
