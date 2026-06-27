import { useState } from 'react';
import { supabase } from '../supabase.js';

const CATEGORIES = ['Retail', 'Food & Drink', 'Events', 'Services', 'Health & Beauty', 'Other'];

const EMPTY = {
  title: '',
  category: '',
  description: '',
  target_link: '',
  offer_per_lead: '',
  total_budget: '',
  date: '',
};

export default function CreateRequest({ user, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.from('offers').insert({
      user_id: user.id,
      title: form.title,
      category: form.category,
      description: form.description,
      target_link: form.target_link || null,
      offer_per_lead: form.offer_per_lead ? parseFloat(form.offer_per_lead) : null,
      total_budget: form.total_budget ? parseFloat(form.total_budget) : null,
      date: form.date,
    });

    if (error) {
      setError(error.message);
    } else {
      setForm(EMPTY);
      onCreated?.();
    }

    setLoading(false);
  };

  return (
    <section>
      <h2>New Request for Creative</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input type="text" value={form.title} onChange={set('title')} required />
        </label>
        <label>
          Category
          <select value={form.category} onChange={set('category')} required>
            <option value="">Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={set('description')} rows={3} />
        </label>
        <label>
          Target link
          <input type="url" value={form.target_link} onChange={set('target_link')} placeholder="https://example.com/landing-page" />
        </label>
        <label>
          Offer per lead — <strong>${form.offer_per_lead || 0}</strong>
          <input type="range" value={form.offer_per_lead || 0} onChange={set('offer_per_lead')} min="0" max="500" step="1" />
        </label>
        <label>
          Total campaign budget — <strong>${Number(form.total_budget || 0).toLocaleString()}</strong>
          <input type="range" value={form.total_budget || 0} onChange={set('total_budget')} min="0" max="50000" step="500" />
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={set('date')} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </section>
  );
}
