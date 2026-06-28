import { useState } from 'react';
import { supabase } from './supabase.js';
import CreateRequest from './offers/CreateRequest.jsx';
import RequestList from './offers/RequestList.jsx';
import RequestDetail from './offers/RequestDetail.jsx';
import AccountSettings from './account/AccountSettings.jsx';

export default function Dashboard({ user }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  // Incrementing listKey forces RequestList to remount after a new request
  // is submitted, triggering a fresh fetch without prop drilling a refetch callback.
  const [listKey, setListKey] = useState(0);

  const signOut = () => supabase.auth.signOut();

  // Four mutually exclusive views: detail, form, account, or list.
  // Only one renders at a time — no nested or overlapping states.
  function renderContent() {
    if (selectedId) {
      return <RequestDetail id={selectedId} onBack={() => setSelectedId(null)} />;
    }
    if (showForm) {
      return (
        <CreateRequest
          user={user}
          onBack={() => setShowForm(false)}
          onCreated={() => {
            setListKey(k => k + 1);
            setShowForm(false);
          }}
        />
      );
    }
    if (showAccount) {
      return <AccountSettings user={user} onBack={() => setShowAccount(false)} />;
    }
    return (
      <RequestList
        key={listKey}
        onView={setSelectedId}
        onNewRequest={() => setShowForm(true)}
      />
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Open Marketing Platform</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowAccount(true)}>My account</button>
          <button onClick={signOut}>Sign out</button>
        </span>
      </header>
      {renderContent()}
    </main>
  );
}
