import QrCode from './QrCode.jsx';
import CopyButton from './CopyButton.jsx';

// A tracking link presented for sharing: QR code, selectable URL, copy button.
// Used on the request page right after generating, and for every row in My Links.
export default function LinkShare({ url, label = 'Tracking link', qrLabel }) {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1rem' }}>
      <QrCode value={url} label={qrLabel ?? `QR code for ${label.toLowerCase()}`} />
      <div style={{ flex: '1 1 20rem', minWidth: 0 }}>
        <label>
          {label}
          <input type="text" value={url} readOnly onFocus={e => e.target.select()} />
        </label>
        <CopyButton text={url} label="Copy link" />
      </div>
    </div>
  );
}
