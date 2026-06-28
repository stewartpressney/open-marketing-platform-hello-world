import { useState } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.js';
import { supabase } from '../supabase.js';

const CATEGORIES = ['All', 'Retail', 'Food & Drink', 'Events', 'Services', 'Health & Beauty', 'Other'];

// Budget bands for client-side filtering. Infinity avoids a sentinel value
// for "no upper limit" and works cleanly with numeric comparisons.
const BUDGET_BANDS = [
  { label: 'Any budget', min: 0, max: Infinity },
  { label: 'Under $1,000', min: 0, max: 1000 },
  { label: '$1,000 – $5,000', min: 1000, max: 5000 },
  { label: '$5,000 – $15,000', min: 5000, max: 15000 },
  { label: '$15,000+', min: 15000, max: Infinity },
];

export default function RequestList({ onView, onNewRequest }) {
  const [category, setCategory] = useState('All');
  const [budgetBand, setBudgetBand] = useState(0);

  // Fetch all offers once on mount. Filtering is client-side because the
  // dataset is small and avoids extra round trips on every filter change.
  const { data, loading, error } = useSupabaseQuery(
    () => supabase
      .from('offers')
      .select('id, title, category, description, target_link, offer_per_lead, total_budget')
      .order('created_at', { ascending: false }),
    []
  );

  const requests = data ?? [];
  const band = BUDGET_BANDS[budgetBand];
  const filtered = requests.filter(r => {
    if (category !== 'All' && r.category !== category) return false;
    const budget = r.total_budget ?? 0;
    return budget >= band.min && budget <= band.max;
  });

  return (
    <section>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Open Requests</h2>
        <button onClick={onNewRequest}>New request</button>
      </header>

      <fieldset style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', border: 'none', padding: 0, margin: '1rem 0' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Budget
          <select value={budgetBand} onChange={e => setBudgetBand(Number(e.target.value))}>
            {BUDGET_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
          </select>
        </label>
      </fieldset>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No requests match your filters.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Offer / lead</th>
                <th>Budget</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    {r.target_link
                      ? <a href={r.target_link} target="_blank" rel="noreferrer">{r.title}</a>
                      : r.title}
                    {r.description && (
                      <div><small>{r.description}</small></div>
                    )}
                  </td>
                  <td>{r.category}</td>
                  <td>${r.offer_per_lead ?? 0}</td>
                  <td>{r.total_budget ? `$${Number(r.total_budget).toLocaleString()}` : '—'}</td>
                  <td><button onClick={() => onView(r.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
