import { useState } from 'react';
import { supabase } from './supabase.js';
import CreateRequest from './offers/CreateRequest.jsx';
import RequestList from './offers/RequestList.jsx';
import RequestDetail from './offers/RequestDetail.jsx';
import AccountSettings from './account/AccountSettings.jsx';
import MyLinks from './links/MyLinks.jsx';

export default function Dashboard({ user }) {
  // A single view name rather than one flag per screen: the views are mutually
  // exclusive, and independent booleans let two of them be "open" at once, so
  // going back from one would land on another instead of the list.
  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  // Incrementing listKey forces RequestList to remount after a new request
  // is submitted, triggering a fresh fetch without prop drilling a refetch callback.
  const [listKey, setListKey] = useState(0);

  const signOut = () => supabase.auth.signOut();

  const showList = () => {
    setView('list');
    setSelectedId(null);
  };

  const openRequest = (id) => {
    setSelectedId(id);
    setView('detail');
  };

  function renderContent() {
    if (view === 'detail' && selectedId) {
      return <RequestDetail id={selectedId} user={user} onBack={showList} />;
    }
    if (view === 'form') {
      return (
        <CreateRequest
          user={user}
          onBack={showList}
          onCreated={() => {
            setListKey(k => k + 1);
            showList();
          }}
        />
      );
    }
    if (view === 'account') {
      return <AccountSettings user={user} onBack={showList} />;
    }
    if (view === 'links') {
      return <MyLinks user={user} onBack={showList} />;
    }
    return (
      <RequestList
        key={listKey}
        onView={openRequest}
        onNewRequest={() => setView('form')}
      />
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: '2rem auto', padding: '0 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={showList}>Open Marketing Platform</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setView('links')}>My links</button>
          <button onClick={() => setView('account')}>My account</button>
          <button onClick={signOut}>Sign out</button>
        </span>
      </header>
      {renderContent()}
    </main>
  );
}
