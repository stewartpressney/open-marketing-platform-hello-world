import { useState } from 'react';
import { supabase } from './supabase.js';

export default function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      setStatus('Connected to Supabase.');
    } catch (err) {
      setStatus(`Supabase: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <article>
        <header>
          <h1>Open Marketing Platform</h1>
          <p>React + Vite + <a href="https://supabase.com">Supabase</a> + <a href="https://oat.ink">Oat</a></p>
        </header>
        <button onClick={checkConnection} disabled={loading}>
          {loading ? 'Checking…' : 'Test Supabase connection'}
        </button>
        {status && (
          <p role="alert" style={{ marginTop: '1rem' }}>
            {status}
          </p>
        )}
      </article>
    </main>
  );
}
