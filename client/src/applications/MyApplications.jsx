import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { trackingUrl } from '../tracking.js';
import BackLink from '../components/BackLink.jsx';
import QrCode from '../components/QrCode.jsx';
import CopyButton from '../components/CopyButton.jsx';

// Everything the applicant needs for the campaigns they've been approved for:
// the unique link, its QR code, and how that traffic is performing.
export default function MyApplications({ user, onBack }) {
  const { data, loading, error } = useSupabaseQuery(
    () => supabase
      .from('applications')
      .select('id, status, tracking_code, created_at, offers ( id, title, category, offer_per_lead )')
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false }),
    [user.id]
  );

  // Stats live in a separate view, so they're fetched alongside and joined by
  // application id rather than nested in the query above.
  const { data: stats } = useSupabaseQuery(
    () => supabase
      .from('application_stats')
      .select('application_id, clicks, views, conversions, conversion_value')
      .eq('applicant_id', user.id),
    [user.id]
  );

  const statsById = Object.fromEntries((stats ?? []).map(s => [s.application_id, s]));
  const applications = data ?? [];

  return (
    <section>
      <BackLink onBack={onBack} />
      <h2 style={{ marginTop: '1rem' }}>My applications</h2>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <p>You haven't applied to any requests yet.</p>
      )}

      {applications.map(application => {
        const offer = application.offers;
        const link = application.tracking_code ? trackingUrl(application.tracking_code) : null;
        const stat = statsById[application.id];

        return (
          <article key={application.id} style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #8884' }}>
            <header>
              <h3 style={{ marginBottom: '0.25rem' }}>{offer?.title ?? 'Request removed'}</h3>
              <p style={{ margin: 0 }}>
                <small>{offer?.category} · ${offer?.offer_per_lead ?? 0} per lead · <strong>{application.status}</strong></small>
              </p>
            </header>

            {application.status === 'pending' && (
              <p>Waiting on the business to review your application.</p>
            )}

            {application.status === 'rejected' && (
              <p>This application was not accepted.</p>
            )}

            {link && (
              <>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1rem' }}>
                  <QrCode value={link} label={`QR code for ${offer?.title ?? 'your link'}`} />
                  <div style={{ flex: '1 1 20rem', minWidth: 0 }}>
                    <label>
                      Tracking link
                      <input type="text" value={link} readOnly onFocus={e => e.target.select()} />
                    </label>
                    <CopyButton text={link} label="Copy link" />
                  </div>
                </div>

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
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
