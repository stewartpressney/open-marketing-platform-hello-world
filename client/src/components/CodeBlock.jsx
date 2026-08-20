import CopyButton from './CopyButton.jsx';

// A copyable snippet. Pre-formatted rather than wrapped: install snippets are
// whitespace-sensitive to read, so the block scrolls horizontally instead of
// reflowing on narrow screens.
const codeBlockStyle = {
  overflowX: 'auto',
  padding: '0.75rem',
  border: '1px solid #8884',
  borderRadius: '4px',
  whiteSpace: 'pre',
};

export default function CodeBlock({ code, copyLabel = 'Copy' }) {
  return (
    <>
      <pre style={codeBlockStyle}><code>{code}</code></pre>
      <CopyButton text={code} label={copyLabel} />
    </>
  );
}
