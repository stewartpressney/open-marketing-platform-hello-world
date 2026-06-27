import { supabase } from './supabase.js';
import CreateRequest from './offers/CreateRequest.jsx';

export default function Dashboard({ user }) {
  const signOut = () => supabase.auth.signOut();

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Open Marketing Platform</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <small>{user.email}</small>
          <button onClick={signOut}>Sign out</button>
        </span>
      </header>
      <CreateRequest user={user} />
    </main>
  );
}
