import { useEffect, useRef } from 'react';

export default function MixedLatex({ text }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !text) return;

    // Split on <br> tags into separate lines, render as HTML
    const html = text
      .split(/<br\s*\/?>/gi)
      .map(line => `<div>${line}</div>`)
      .join('');

    ref.current.innerHTML = html;

    // Let MathJax typeset the content
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, [text]);

  if (!text) return null;
  return <div ref={ref} />;
}
