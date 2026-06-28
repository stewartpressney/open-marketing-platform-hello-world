import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { supabase } from '../supabase.js';
import BackLink from '../components/BackLink.jsx';

export default function RequestDetail({ id, onBack }) {
  // .single() tells Supabase to expect exactly one row and return it directly
  // rather than an array. It errors if the row is missing, which surfaces cleanly.
  const { data: request, loading, error } = useSupabaseQuery(
    () => supabase.from('offers').select('*').eq('id', id).single(),
    [id] // re-fetch if the id prop changes
  );

  if (loading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!request) return null;

  return (
    <article>
      <header>
        <BackLink onBack={onBack} />
        <h2 style={{ marginTop: '1rem', marginBottom: '0.25rem' }}>{request.title}</h2>
        <p style={{ margin: 0 }}><strong>{request.category}</strong></p>
      </header>

      <section style={{ marginTop: '1.5rem' }}>
        {request.description && (
          <p>{request.description}</p>
        )}

        <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1.5rem', marginTop: '1rem' }}>
          <dt>Offer per lead</dt>
          <dd>${request.offer_per_lead ?? 0}</dd>

          <dt>Total budget</dt>
          <dd>{request.total_budget ? `$${Number(request.total_budget).toLocaleString()}` : '—'}</dd>

          {request.target_link && (
            <>
              <dt>Target link</dt>
              <dd><a href={request.target_link} target="_blank" rel="noreferrer">{request.target_link}</a></dd>
            </>
          )}
        </dl>
      </section>

      {request.target_link && (
        <footer style={{ marginTop: '2rem' }}>
          <a href={request.target_link} target="_blank" rel="noreferrer">
            <button>Visit target page</button>
          </a>
        </footer>
      )}
    </article>
  );
}
