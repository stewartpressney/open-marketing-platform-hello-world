import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { installSnippet, CONVERSION_SNIPPET } from '../tracking.js';
import CopyButton from '../components/CopyButton.jsx';

const codeBlockStyle = {
  overflowX: 'auto',
  padding: '0.75rem',
  border: '1px solid #8884',
  borderRadius: '4px',
  whiteSpace: 'pre',
};

// The account's tracking pixel: one site key, one snippet, all campaigns.
//
// The site row is created on demand the first time this section is opened, so
// there is nothing to set up before an account can start tracking. The key
// itself is minted by a database trigger, never chosen by the client.
export default function TrackingPixel({ user }) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOrCreate() {
      const { data: existing, error: readError } = await supabase
        .from('sites')
        .select('id, site_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (readError) {
        setError(readError.message);
        setLoading(false);
        return;
      }

      if (existing) {
        setSite(existing);
        setLoading(false);
        return;
      }

      // site_key is omitted deliberately — the trigger fills it in.
      const { data: created, error: insertError } = await supabase
        .from('sites')
        .insert({ user_id: user.id })
        .select('id, site_key')
        .single();

      if (cancelled) return;

      if (insertError) setError(insertError.message);
      else setSite(created);
      setLoading(false);
    }

    loadOrCreate();
    return () => { cancelled = true; };
  }, [user.id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!site) return null;

  const snippet = installSnippet(site.site_key);

  return (
    <>
      <p>
        Add this to your website to see which platform members are sending you
        traffic. One snippet covers every request you post — attribution comes
        from the link each approved applicant shares, so there is nothing to
        change when you approve someone new.
      </p>

      <label>
        Site key
        <input type="text" value={site.site_key} readOnly onFocus={e => e.target.select()} />
      </label>

      <h4 style={{ marginTop: '1.5rem' }}>1. Install on every page</h4>
      <p><small>Paste this just before the closing <code>&lt;/body&gt;</code> tag.</small></p>
      <pre style={codeBlockStyle}><code>{snippet}</code></pre>
      <CopyButton text={snippet} label="Copy snippet" />

      <h4 style={{ marginTop: '1.5rem' }}>2. Record a lead</h4>
      <p>
        <small>
          Call this on your thank-you or signup-complete page. <code>value</code> is
          optional and records what the lead was worth to you.
        </small>
      </p>
      <pre style={codeBlockStyle}><code>{CONVERSION_SNIPPET}</code></pre>
      <CopyButton text={CONVERSION_SNIPPET} label="Copy conversion call" />

      <p style={{ marginTop: '1.5rem' }}>
        <small>
          Treat the site key as public — it ships in your page source. It only
          allows recording events against your account, and events are only
          credited to applicants you have approved.
        </small>
      </p>
    </>
  );
}
