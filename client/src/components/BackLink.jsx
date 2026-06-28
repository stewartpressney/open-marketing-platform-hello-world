// Shared back-navigation link used by CreateRequest and RequestDetail.
// Uses href="#" + preventDefault so the browser never navigates away —
// all routing in this app is state-based, not URL-based.
export default function BackLink({ onBack, label = '← Back to open requests' }) {
  return (
    <nav>
      <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>{label}</a>
    </nav>
  );
}
