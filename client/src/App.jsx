import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  // Suppress rendering until the initial session is resolved, preventing
  // a flash of the sign-in screen for already-authenticated users.
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    // getSession resolves the persisted session synchronously from localStorage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // onAuthStateChange handles events that arrive asynchronously, including
    // PASSWORD_RECOVERY which fires when the user clicks a password-reset email
    // link and lands back on the app. It cannot be detected via getSession because
    // Supabase delivers it through the URL hash after the redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      } else {
        setRecoveryMode(false);
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (recoveryMode) return <Auth initialMode="reset" />;
  return user ? <Dashboard user={user} /> : <Auth />;
}
