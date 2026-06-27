import { useState } from 'react';
import { supabase } from './supabase.js';

export default function Auth() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else if (mode === 'signup') {
      setMessage('Check your email to confirm your account.');
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 400, margin: '6rem auto', padding: '0 1rem' }}>
      <article>
        <header>
          <h1>Open Marketing Platform</h1>
          <p>{mode === 'signin' ? 'Sign in to your account' : 'Create an account'}</p>
        </header>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <footer>
          <p>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <a
              href="#"
              onClick={e => { e.preventDefault(); setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null); }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </a>
          </p>
        </footer>
      </article>
    </main>
  );
}
