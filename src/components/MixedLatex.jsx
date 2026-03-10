import { useEffect, useRef } from 'react';
import katex from 'katex';

function renderSegment(text, displayMode) {
  const span = document.createElement(displayMode ? 'div' : 'span');
  if (displayMode) span.className = 'math-block text-center my-2';
  try {
    katex.render(text, span, { throwOnError: false, displayMode });
  } catch {
    span.textContent = text;
  }
  return span;
}

// Renders a plain-text segment, detecting \begin{...}...\end{...} blocks
// and rendering them as display math, while leaving surrounding text as text.
function renderPlainText(segment, container) {
  // Split on \begin{env}...\end{env} blocks (greedy per environment name)
  const envRegex = /(\\begin\{([^}]+)\}[\s\S]*?\\end\{\2\})/;
  let remaining = segment;

  while (remaining) {
    const match = remaining.match(envRegex);
    if (!match) {
      // No more LaTeX environments; render the rest as plain text with line breaks
      renderLines(remaining, container);
      break;
    }

    // Text before the environment
    const before = remaining.slice(0, match.index);
    if (before) renderLines(before, container);

    // The environment block itself — render as display math
    container.appendChild(renderSegment(match[1], true));

    // Continue with whatever comes after the environment
    remaining = remaining.slice(match.index + match[1].length);
  }
}

// Renders a plain string, converting real newlines into <br> elements.
function renderLines(str, container) {
  const lines = str.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line) {
      const span = document.createElement('span');
      span.textContent = line;
      container.appendChild(span);
    }
    if (i < lines.length - 1) {
      container.appendChild(document.createElement('br'));
    }
  });
}

export default function MixedLatex({ text }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !text) return;
    ref.current.innerHTML = '';

    // Pre-process: convert HTML <br> variants to real newlines
    let processed = text.replace(/<br\s*\/?>/gi, '\n');

    // Split on $$...$$ (display) and $...$ (inline)
    const parts = processed.split(/(\$\$[\s\S]*?\$\$)/);

    for (const part of parts) {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        ref.current.appendChild(renderSegment(math, true));
      } else {
        // Split inline math
        const inlineParts = part.split(/(\$[^$]+?\$)/);
        for (const ip of inlineParts) {
          if (ip.startsWith('$') && ip.endsWith('$') && ip.length > 2) {
            const math = ip.slice(1, -1);
            ref.current.appendChild(renderSegment(math, false));
          } else if (ip) {
            // Handle \begin{...}...\end{...} blocks in plain text
            renderPlainText(ip, ref.current);
          }
        }
      }
    }
  }, [text]);

  if (!text) return null;
  return <div ref={ref} />;
}
