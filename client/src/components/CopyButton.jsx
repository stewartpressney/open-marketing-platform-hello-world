import { useEffect, useState } from 'react';

// Copy-to-clipboard button that confirms in place for a moment.
//
// navigator.clipboard is unavailable on insecure origins, so failures are
// surfaced rather than silently swallowed — a copy button that does nothing
// is worse than one that says it couldn't.
export default function CopyButton({ text, label = 'Copy' }) {
  const [state, setState] = useState('idle');

  // Reset the confirmation without leaking a timer if the button unmounts
  // (for example when the user navigates away right after copying).
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button type="button" onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C to copy' : label}
    </button>
  );
}
