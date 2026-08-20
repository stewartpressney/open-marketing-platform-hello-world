import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { trackingUrl } from '../tracking.js';
import LinkShare from '../components/LinkShare.jsx';

// Link generation for a request. Shown to every signed-in user, including the
// request's own owner — there is no approval step, so anyone can mint a link
// and start driving traffic immediately.
//
// One link per user per request: if a link already exists, it is shown rather
// than a second one being created.
export default function LinkPanel({ offerId, user }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  // Holds the row after a local insert so the panel updates without refetching.
  const [created, setCreated] = useState(null);

  const { data: existing, loading } = useSupabaseQuery(
    () => supabase
      .from('links')
      .select('id, tracking_code, created_at')
      .eq('offer_id', offerId)
      .eq('user_id', user.id)
      .maybeSingle(),
    [offerId, user.id]
  );

  const link = created ?? existing;

  const generate = async () => {
    setError(null);
    setGenerating(true);

    // tracking_code is omitted deliberately — a database trigger mints it, so
    // the client cannot choose its own code.
    const { data, error } = await supabase
      .from('links')
      .insert({ offer_id: offerId, user_id: user.id })
      .select('id, tracking_code, created_at')
      .single();

    if (error) setError(error.message);
    else setCreated(data);

    setGenerating(false);
  };

  if (loading) return null;

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3>Your tracking link</h3>

      {!link && (
        <>
          <p>
            Generate a unique link and QR code for this request. Every click and
            lead they bring in is credited to you.
          </p>
          {error && <p role="alert">{error}</p>}
          <button onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate link'}
          </button>
        </>
      )}

      {link && <LinkShare url={trackingUrl(link.tracking_code)} label="Your tracking link" />}
    </section>
  );
}
