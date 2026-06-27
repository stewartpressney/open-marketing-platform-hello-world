import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHello = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hello');
      const data = await res.json();
      setMessage(data.message);
    } catch {
      setMessage('Could not reach the Express server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      {/* Oat styles semantic HTML — no classes needed */}
      <article>
        <header>
          <h1>Hello World</h1>
          <p>React + Vite + Express + <a href="https://oat.ink">Oat</a></p>
        </header>
        <p>
          <span role="status">Vite dev server</span>{' '}
          <span role="status">Express API</span>
        </p>
        <button onClick={fetchHello} disabled={loading}>
          {loading ? 'Loading…' : 'Call Express API'}
        </button>
        {message && (
          <p role="alert" style={{ marginTop: '1rem' }}>
            {message}
          </p>
        )}
      </article>
    </main>
  );
}
