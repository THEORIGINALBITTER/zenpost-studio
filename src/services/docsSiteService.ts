/**
 * Docs Site Service
 * Generates a self-contained index.html for GitHub Pages documentation sites.
 */

export interface DocsSiteConfig {
  projectName: string;
  tagline: string;
  accentColor: string;
  githubPagesUrl: string;
  pages: Array<{ label: string; file: string; slug: string; section?: string }>;
  /** New pages to create as stub .md files (written by App1 before generating) */
  newPages?: Array<{ relPath: string; title: string; section?: string }>;
}

export interface DocsSiteFile {
  name: string;
  content: string;
}

function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toLabel(name: string): string {
  return name
    .replace(/\.(md|mdx)$/i, '')
    .replace(/^\d+[-_]/, '')       // strip leading numbers like "01-"
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Derive section label from relPath — folder directly under docs/ */
function sectionFromPath(relPath: string): string {
  // relPath is like "docs/api/endpoints.md" or "docs/intro.md"
  const parts = relPath.replace(/^docs\//, '').split('/');
  if (parts.length <= 1) return ''; // root level, no section
  return parts.slice(0, -1).map(toLabel).join(' / ');
}

export function buildPages(
  selectedFiles: Array<{ name: string; relPath: string }>,
): DocsSiteConfig['pages'] {
  const slugCounts: Record<string, number> = {};
  return selectedFiles.map((f) => {
    const label = toLabel(f.name);
    let slug = toSlug(label);
    slugCounts[slug] = (slugCounts[slug] ?? 0) + 1;
    if (slugCounts[slug] > 1) slug = `${slug}-${slugCounts[slug]}`;
    const section = sectionFromPath(f.relPath);
    return { label, file: f.relPath, slug, section };
  });
}

export function generateDocsSite(
  config: DocsSiteConfig,
  markdownFiles: Array<{ name: string; content: string }>,
): DocsSiteFile[] {
  const filesMap: Record<string, string> = {};
  for (const f of markdownFiles) {
    if (config.pages.some((p) => p.file === f.name)) {
      filesMap[f.name] = f.content.length > 120_000
        ? f.content.slice(0, 120_000) + '\n\n*[Inhalt gekürzt — Datei zu groß]*'
        : f.content;
    }
  }

  const pagesJson = JSON.stringify(config.pages);
  const filesJson = JSON.stringify(filesMap);
  const footerLink = config.githubPagesUrl
    ? `<a class="footer-link" href="${config.githubPagesUrl}" target="_blank" rel="noreferrer">🌐 ${config.githubPagesUrl}</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(config.projectName)} · Docs</title>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"><\/script>
  <style>
    :root {
      --accent: ${config.accentColor};
      --accent-soft: ${config.accentColor}22;
      --bg: #faf9f7;
      --sidebar-bg: #f0ede6;
      --sidebar-border: rgba(0,0,0,0.09);
      --text: #1a1a1a;
      --muted: #777;
      --border: rgba(0,0,0,0.1);
      --font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
      --font-mono: 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font-body); background: var(--bg); color: var(--text); display: flex; flex-direction: column; min-height: 100vh; }

    /* ── Header ── */
    header {
      background: #111;
      border-bottom: 2px solid var(--accent);
      padding: 0 24px;
      height: 54px;
      display: flex;
      align-items: center;
      gap: 14px;
      position: sticky;
      top: 0;
      z-index: 200;
    }
    .brand { font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--accent); white-space: nowrap; }
    .tagline { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-spacer { flex: 1; }
    #mobile-btn {
      display: none;
      background: none;
      border: 1px solid #333;
      color: #aaa;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 16px;
    }

    /* ── Layout ── */
    .layout { display: flex; flex: 1; }

    /* ── Sidebar ── */
    aside {
      width: 230px;
      flex-shrink: 0;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--sidebar-border);
      position: sticky;
      top: 54px;
      height: calc(100vh - 54px);
      overflow-y: auto;
      padding: 20px 0 40px;
      transition: transform 0.25s ease;
    }
    .nav-section {
      font-family: var(--font-mono);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--muted);
      padding: 16px 18px 6px;
      margin-top: 4px;
    }
    .nav-section:first-child { padding-top: 0; margin-top: 0; }
    nav a {
      display: block;
      padding: 9px 18px;
      font-size: 13px;
      color: var(--text);
      text-decoration: none;
      border-left: 3px solid transparent;
      transition: all 0.15s;
    }
    nav a.indented { padding-left: 28px; }
    nav a:hover { background: var(--accent-soft); color: var(--accent); }
    nav a.active { background: var(--accent-soft); border-left-color: var(--accent); color: var(--accent); font-weight: 600; }

    /* ── Main content ── */
    main {
      flex: 1;
      padding: 44px 52px;
      max-width: 880px;
      min-width: 0;
    }
    main h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; line-height: 1.2; }
    main h2 { font-size: 20px; font-weight: 600; margin: 40px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    main h3 { font-size: 16px; font-weight: 600; margin: 28px 0 8px; }
    main h4 { font-size: 14px; font-weight: 600; margin: 20px 0 6px; }
    main p { line-height: 1.75; margin-bottom: 16px; color: #333; }
    main a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
    main code {
      font-family: var(--font-mono);
      font-size: 12px;
      background: rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.08);
      padding: 2px 5px;
      border-radius: 4px;
      color: #5a3e1e;
    }
    main pre {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 18px 20px;
      overflow-x: auto;
      margin-bottom: 20px;
    }
    main pre code { background: none; border: none; color: #e8dece; font-size: 13px; padding: 0; }
    main ul, main ol { padding-left: 24px; margin-bottom: 16px; }
    main li { line-height: 1.75; margin-bottom: 4px; }
    main li p { margin-bottom: 4px; }
    main blockquote {
      border-left: 3px solid var(--accent);
      background: var(--accent-soft);
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
      color: #444;
    }
    main table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    main th, main td { padding: 9px 14px; border: 1px solid var(--border); text-align: left; }
    main th { background: var(--sidebar-bg); font-weight: 600; }
    main hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
    main img { max-width: 100%; border-radius: 6px; }

    /* ── Empty / Loading ── */
    .msg { font-family: var(--font-mono); font-size: 12px; color: var(--muted); padding: 48px 0; }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--muted);
      font-family: var(--font-mono);
      border-top: 1px solid var(--border);
    }
    .footer-link { color: var(--accent); text-decoration: none; }
    .footer-link:hover { text-decoration: underline; }

    /* ── Mobile ── */
    @media (max-width: 700px) {
      aside { position: fixed; top: 54px; left: 0; bottom: 0; z-index: 100; transform: translateX(-100%); width: 260px; }
      aside.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(0,0,0,0.15); }
      main { padding: 28px 20px; }
      #mobile-btn { display: block; }
      .tagline { display: none; }
    }
    @media print { aside { display: none; } main { max-width: 100%; padding: 0; } }
  </style>
</head>
<body>
  <header>
    <span class="brand">${escHtml(config.projectName)}</span>
    ${config.tagline ? `<span class="tagline">${escHtml(config.tagline)}</span>` : ''}
    <span class="header-spacer"></span>
    <button id="mobile-btn" onclick="document.querySelector('aside').classList.toggle('open')">☰</button>
  </header>

  <div class="layout">
    <aside id="sidebar">
      <nav id="nav"></nav>
    </aside>

    <main id="content">
      <div class="msg">Lade Dokumentation…</div>
    </main>
  </div>

  ${config.githubPagesUrl || true ? `<footer>${footerLink}<span style="margin-left:8px">Erstellt mit ZenPost Studio · Doc Studio</span></footer>` : ''}

  <script>
    const PAGES = ${pagesJson};
    const FILES = ${filesJson};

    marked.setOptions({ gfm: true, breaks: true });

    // Build nav with sections
    var nav = document.getElementById('nav');
    var currentSection = null;
    PAGES.forEach(function(page) {
      var section = page.section || '';
      if (section !== currentSection) {
        currentSection = section;
        var heading = document.createElement('div');
        heading.className = 'nav-section';
        heading.textContent = section || 'Dokumentation';
        nav.appendChild(heading);
      }
      var a = document.createElement('a');
      a.href = '#' + page.slug;
      a.textContent = page.label;
      a.dataset.slug = page.slug;
      if (section) a.classList.add('indented');
      nav.appendChild(a);
    });

    function render(slug) {
      var page = PAGES.find(function(p) { return p.slug === slug; }) || PAGES[0];
      if (!page) {
        document.getElementById('content').innerHTML = '<div class="msg">Keine Seiten verfügbar.</div>';
        return;
      }
      document.querySelectorAll('#nav a').forEach(function(a) {
        a.classList.toggle('active', a.dataset.slug === page.slug);
      });
      if (window.location.hash !== '#' + page.slug) {
        history.replaceState(null, '', '#' + page.slug);
      }
      var content = FILES[page.file];
      if (!content) {
        document.getElementById('content').innerHTML = '<div class="msg">Inhalt nicht verfügbar: ' + page.file + '</div>';
        return;
      }
      document.getElementById('content').innerHTML = marked.parse(content);
      window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', function() {
      render(window.location.hash.slice(1));
    });

    var initialSlug = window.location.hash.slice(1);
    render(initialSlug || (PAGES[0] && PAGES[0].slug) || '');
  <\/script>
</body>
</html>`;

  return [
    { name: 'docs/index.html', content: html },
    { name: 'docs/.nojekyll', content: '' },
  ];
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
