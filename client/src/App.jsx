import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

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
