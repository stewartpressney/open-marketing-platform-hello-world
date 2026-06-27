import { supabase } from './supabase.js';

export default function Dashboard({ user }) {
  const signOut = () => supabase.auth.signOut();

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <article>
        <header>
          <h1>Dashboard</h1>
          <p>Welcome, {user.email}</p>
        </header>
        <p>Your marketing platform dashboard will be built here.</p>
        <button onClick={signOut}>Sign out</button>
      </article>
    </main>
  );
}
