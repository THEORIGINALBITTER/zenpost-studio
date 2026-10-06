import { marked } from 'marked';

/**
 * A `marked` renderer that emits `<pre class="mermaid">` for ```mermaid
 * fenced blocks (which mermaid.js then renders client-side via
 * MERMAID_SCRIPT_TAG) and falls back to the default code rendering for
 * everything else.
 */
export function createMermaidAwareRenderer() {
  const renderer = new marked.Renderer();
  const defaultCode = renderer.code.bind(renderer);
  renderer.code = (token) =>
    (token.lang || '').trim().toLowerCase() === 'mermaid'
      ? `<pre class="mermaid">${token.text}</pre>`
      : defaultCode(token);
  return renderer;
}

/** Loads mermaid.js from CDN and renders any `<pre class="mermaid">` blocks on the page. */
export const MERMAID_SCRIPT_TAG = `<script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, securityLevel: 'strict', suppressErrorRendering: true });
  </script>`;
