import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a QR code for a URL as an <img>.
//
// toDataURL is async, so the image is held in state rather than computed
// during render. Generating client-side keeps the tracking link off any
// third-party QR service, which would otherwise see every campaign URL.
export default function QrCode({ value, size = 160, label }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(url => { if (!cancelled) setDataUrl(url); })
      .catch(err => { if (!cancelled) setError(err.message); });

    return () => { cancelled = true; };
  }, [value, size]);

  if (error) return <p role="alert">Could not render QR code: {error}</p>;
  if (!dataUrl) return <div style={{ width: size, height: size }} aria-hidden="true" />;

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={label ?? `QR code for ${value}`}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  );
}
