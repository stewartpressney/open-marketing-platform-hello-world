import { useState } from 'react';
import { supabase } from './supabase.js';

const TITLES = {
  signin: 'Sign in to your account',
  signup: 'Create an account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
};

const SUBMIT_LABELS = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Send reset link',
  reset: 'Set new password',
};

export default function Auth({ initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if ((mode === 'signup' || mode === 'reset') && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account.');
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setMessage('Password reset link sent — check your email.');
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      // On success, onAuthStateChange fires SIGNED_IN → App transitions to Dashboard
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 400, margin: '6rem auto', padding: '0 1rem' }}>
      <article>
        <header>
          <h1>Open Marketing Platform</h1>
          <p>{TITLES[mode]}</p>
        </header>
        <form onSubmit={handleSubmit}>
          {mode !== 'reset' && (
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
          )}
          {mode !== 'forgot' && (
            <label>
              {mode === 'reset' ? 'New password' : 'Password'}
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </label>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : SUBMIT_LABELS[mode]}
          </button>
        </form>
        <footer>
          {mode === 'signin' && (
            <>
              <p>
                <a href="#" onClick={e => { e.preventDefault(); switchMode('forgot'); }}>
                  Forgot your password?
                </a>
              </p>
              <p>
                Don't have an account?{' '}
                <a href="#" onClick={e => { e.preventDefault(); switchMode('signup'); }}>
                  Sign up
                </a>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <a href="#" onClick={e => { e.preventDefault(); switchMode('signin'); }}>
                Sign in
              </a>
            </p>
          )}
          {mode === 'forgot' && (
            <p>
              <a href="#" onClick={e => { e.preventDefault(); switchMode('signin'); }}>
                Back to sign in
              </a>
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}
