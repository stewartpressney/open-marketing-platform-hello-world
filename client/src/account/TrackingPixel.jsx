import { installSnippet, CONVERSION_SNIPPET } from '../tracking.js';
import { useSite } from '../hooks/useSite.js';
import CodeBlock from '../components/CodeBlock.jsx';

// The account's tracking pixel: one site key, one snippet, all campaigns.
//
// My Requests shows the same snippet per request, with setup progress for each.
export default function TrackingPixel({ user }) {
  const { site, loading, error } = useSite(user.id);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!site) return null;

  return (
    <>
      <p>
        Add this to your website to see which platform members are sending you
        traffic. One snippet covers every request you post — attribution comes
        from the link each member generates, so there is nothing to change when
        someone new starts promoting you.
      </p>

      <label>
        Site key
        <input type="text" value={site.site_key} readOnly onFocus={e => e.target.select()} />
      </label>

      <h4 style={{ marginTop: '1.5rem' }}>1. Install on every page</h4>
      <p><small>Paste this just before the closing <code>&lt;/body&gt;</code> tag.</small></p>
      <CodeBlock code={installSnippet(site.site_key)} copyLabel="Copy snippet" />

      <h4 style={{ marginTop: '1.5rem' }}>2. Record a lead</h4>
      <p>
        <small>
          Call this on your thank-you or signup-complete page. <code>value</code> is
          optional and records what the lead was worth to you.
        </small>
      </p>
      <CodeBlock code={CONVERSION_SNIPPET} copyLabel="Copy conversion call" />

      <p style={{ marginTop: '1.5rem' }}>
        <small>
          Treat the site key as public — it ships in your page source. It only
          allows recording events against your account, and events are only
          credited to links generated for your own requests.
        </small>
      </p>
    </>
  );
}
