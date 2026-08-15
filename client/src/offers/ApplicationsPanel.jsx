import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';

// Owner-side panel on a request: review who has applied and decide.
//
// Approving mints the applicant's tracking code — that happens in a database
// trigger, so the code comes back on the updated row rather than being
// generated here where a client could choose it.
export default function ApplicationsPanel({ offerId }) {
  const { data, loading, error } = useSupabaseQuery(
    () => supabase
      .from('applications')
      .select('id, status, pitch, created_at, applicant_id')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false }),
    [offerId]
  );

  // Local copy so a decision updates the list immediately; seeded from the
  // fetch once it lands.
  const [applications, setApplications] = useState([]);
  const [pendingId, setPendingId] = useState(null);
  const [decisionError, setDecisionError] = useState(null);

  useEffect(() => {
    if (data) setApplications(data);
  }, [data]);

  const decide = async (id, status) => {
    setDecisionError(null);
    setPendingId(id);

    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select('id, status, pitch, created_at, applicant_id')
      .single();

    if (error) setDecisionError(error.message);
    else setApplications(list => list.map(a => (a.id === id ? updated : a)));

    setPendingId(null);
  };

  if (loading) return null;
  if (error) return <p role="alert">{error}</p>;

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3>Applications ({applications.length})</h3>

      {applications.length === 0 && <p>No one has applied to this request yet.</p>}

      {applications.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Pitch</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map(a => (
                <tr key={a.id}>
                  {/* Only the applicant's id is readable here — auth.users is
                      not exposed to the client, so there is no email to show. */}
                  <td><code>{a.applicant_id.slice(0, 8)}</code></td>
                  <td>{a.pitch || <small>No pitch provided</small>}</td>
                  <td>{a.status}</td>
                  <td>
                    {a.status === 'pending' ? (
                      <span style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => decide(a.id, 'approved')} disabled={pendingId === a.id}>
                          Approve
                        </button>
                        <button onClick={() => decide(a.id, 'rejected')} disabled={pendingId === a.id}>
                          Reject
                        </button>
                      </span>
                    ) : (
                      <small>Decided</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {decisionError && <p role="alert">{decisionError}</p>}
    </section>
  );
}
