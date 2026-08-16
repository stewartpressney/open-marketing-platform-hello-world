import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { trackingUrl } from '../tracking.js';
import QrCode from '../components/QrCode.jsx';
import CopyButton from '../components/CopyButton.jsx';

const STATUS_TEXT = {
  pending: 'Your application is awaiting a decision from the business.',
  approved: 'Approved — this link and QR code are yours. Traffic through them is credited to you.',
  rejected: 'This application was not accepted.',
};

// Applicant-side panel on a request: apply, then track the outcome.
// Rendered only for users who do not own the request.
export default function ApplyPanel({ offerId, user }) {
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  // Holds the row after a local insert so the panel updates without refetching.
  const [created, setCreated] = useState(null);

  const { data: existing, loading } = useSupabaseQuery(
    () => supabase
      .from('applications')
      .select('id, status, tracking_code, pitch')
      .eq('offer_id', offerId)
      .eq('applicant_id', user.id)
      .maybeSingle(),
    [offerId, user.id]
  );

  const application = created ?? existing;

  const apply = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error } = await supabase
      .from('applications')
      .insert({ offer_id: offerId, applicant_id: user.id, pitch: pitch || null })
      .select('id, status, tracking_code, pitch')
      .single();

    if (error) setError(error.message);
    else setCreated(data);

    setSubmitting(false);
  };

  if (loading) return null;

  if (!application) {
    return (
      <section style={{ marginTop: '2rem' }}>
        <h3>Apply to this request</h3>
        <form onSubmit={apply}>
          <label>
            Why you're a good fit <small>(optional)</small>
            <textarea
              value={pitch}
              onChange={e => setPitch(e.target.value)}
              rows={3}
              placeholder="Audience, channels, and what you'd run."
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Apply'}
          </button>
        </form>
      </section>
    );
  }

  const link = application.tracking_code ? trackingUrl(application.tracking_code) : null;

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3>Your application</h3>
      <p><strong>{application.status}</strong> — {STATUS_TEXT[application.status]}</p>

      {link && (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1rem' }}>
          <QrCode value={link} label="QR code for your tracking link" />
          <div style={{ flex: '1 1 20rem', minWidth: 0 }}>
            <label>
              Your tracking link
              <input type="text" value={link} readOnly onFocus={e => e.target.select()} />
            </label>
            <CopyButton text={link} label="Copy link" />
          </div>
        </div>
      )}
    </section>
  );
}
