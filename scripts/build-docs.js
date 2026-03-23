#!/usr/bin/env node
/**
 * ZenPost Docs — Static Site Builder
 * Converts docs/*.md into a fully styled static HTML site.
 *
 * Usage:  node scripts/build-docs.js
 * Output: docs-dist/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS_SRC = join(ROOT, 'docs');
const DIST = join(ROOT, 'docs-dist');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SITE = {
  title: 'ZenPost Studio – Guide',
  description: 'Dokumentation, Workflows und Referenz für ZenPost Studio — KI-gestütztes Content-Tool für Desktop und Web.',
  url: 'https://zenpostapp.denisbitter.de/docs',
  author: 'Denis Bitter',
  github: 'https://github.com/THEORIGINALBITTER/zenpost-studio',
  twitterHandle: '@THEORIGINALBITTER',
  logo: 'ZenPost',
  logoSub: 'Docs',
};

// ─── MARKED CONFIG ────────────────────────────────────────────────────────────
marked.setOptions({ gfm: true, breaks: false });

// Custom renderer: open external links in new tab, add anchor links to headings
const renderer = new marked.Renderer();

renderer.link = ({ href, title, text }) => {
  const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
  const titleAttr = title ? ` title="${title}"` : '';
  if (isExternal) {
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text} <span class="ext-icon">↗</span></a>`;
  }
  // Internal: rewrite .md links to .html
  const resolved = href ? href.replace(/\.md(#.*)?$/, (_, hash) => `.html${hash ?? ''}`) : '#';
  return `<a href="${resolved}"${titleAttr}>${text}</a>`;
};

renderer.heading = ({ text, depth }) => {
  const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  return `<h${depth} id="${slug}"><a class="anchor" href="#${slug}">#</a>${text}</h${depth}>\n`;
};

renderer.code = ({ text, lang }) => {
  const langClass = lang ? ` class="language-${lang}"` : '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre><code${langClass}>${escaped}</code></pre>\n`;
};

marked.use({ renderer });

// ─── SIDEBAR PARSER ───────────────────────────────────────────────────────────
function parseSidebar(sidebarPath) {
  const content = readFileSync(sidebarPath, 'utf-8');
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('<!--') || !line.trim()) continue;

    const sectionMatch = line.match(/^- \*\*(.+)\*\*$/);
    if (sectionMatch) {
      current = { title: sectionMatch[1], items: [] };
      sections.push(current);
      continue;
    }

    const itemMatch = line.match(/^\s+- \[(.+?)\]\((.+?)\)$/);
    if (itemMatch && current) {
      current.items.push({ label: itemMatch[1], href: itemMatch[2] });
    }

    // External link (no section)
    const extMatch = line.match(/^- \[(.+?)\]\((https?:\/\/.+?)\)$/);
    if (extMatch) {
      if (!current) { current = { title: 'Links', items: [] }; sections.push(current); }
      current.items.push({ label: extMatch[1], href: extMatch[2], external: true });
    }
  }

  return sections;
}

// ─── NAVIGATION HTML ──────────────────────────────────────────────────────────
function buildNav(sections, activePath) {
  return sections.map(section => {
    const items = section.items.map(item => {
      if (item.external) {
        return `<li><a href="${item.href}" target="_blank" rel="noopener noreferrer" class="nav-link">${item.label} <span class="ext-icon">↗</span></a></li>`;
      }
      const href = item.href.replace(/\.md$/, '.html');
      const isActive = activePath === item.href || activePath === item.href.replace(/\.md$/, '.html');
      return `<li><a href="${relativeToRoot(activePath, href)}" class="nav-link${isActive ? ' active' : ''}">${item.label}</a></li>`;
    }).join('\n          ');

    return `
        <div class="nav-section">
          <div class="nav-section-title">${section.title}</div>
          <ul>${items}</ul>
        </div>`;
  }).join('\n');
}

function relativeToRoot(from, to) {
  // Simple relative path — since all files are in flat or one-level subdirs
  // We'll just use root-relative paths (easier for subdir files)
  return '/' + to;
}

// ─── BREADCRUMB ───────────────────────────────────────────────────────────────
function buildBreadcrumb(sections, activePath) {
  for (const section of sections) {
    for (const item of section.items) {
      const itemPath = item.href.replace(/\.md$/, '.html');
      if (activePath === item.href || itemPath === activePath) {
        return `<nav class="breadcrumb"><a href="/">Docs</a> <span>›</span> <span>${section.title}</span> <span>›</span> <span>${item.label}</span></nav>`;
      }
    }
  }
  return '';
}

// ─── PREV / NEXT ──────────────────────────────────────────────────────────────
function buildPrevNext(sections, activePath) {
  const all = sections.flatMap(s => s.items.filter(i => !i.external));
  const idx = all.findIndex(i => i.href === activePath || i.href.replace(/\.md$/, '.html') === activePath);
  if (idx === -1) return '';

  const prev = all[idx - 1];
  const next = all[idx + 1];

  const prevHtml = prev
    ? `<a class="prev-next prev" href="/${prev.href.replace(/\.md$/, '.html')}">← ${prev.label}</a>`
    : '<span></span>';
  const nextHtml = next
    ? `<a class="prev-next next" href="/${next.href.replace(/\.md$/, '.html')}">${next.label} →</a>`
    : '<span></span>';

  return `<div class="prev-next-nav">${prevHtml}${nextHtml}</div>`;
}

// ─── HTML TEMPLATE ────────────────────────────────────────────────────────────
function buildPage({ title, description, content, nav, breadcrumb, prevNext, slug }) {
  const fullTitle = title === SITE.title ? title : `${title} — ${SITE.title}`;
  const canonicalUrl = `${SITE.url}/${slug}`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fullTitle}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="${SITE.author}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${fullTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="${SITE.title}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${fullTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:creator" content="${SITE.twitterHandle}" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet" />

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-dark:      #0d0d0d;
      --bg-sidebar:   #111111;
      --bg-paper:     linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%);
      --bg-header:    #151515;
      --gold:         #AC8E66;
      --gold-dim:     rgba(172,142,102,0.35);
      --gold-faint:   rgba(172,142,102,0.08);
      --text-dark:    #1a1a1a;
      --text-mid:     #444;
      --text-muted:   #888;
      --text-light:   #d0cbb8;
      --text-sidebar: #c8c0b0;
      --border:       rgba(172,142,102,0.25);
      --code-bg:      #1e1e1e;
      --font:         'IBM Plex Mono', monospace;
      --sidebar-w:    260px;
      --header-h:     56px;
    }

    html { font-size: 15px; scroll-behavior: smooth; }

    body {
      font-family: var(--font);
      background: var(--bg-dark);
      color: var(--text-dark);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── HEADER ── */
    .site-header {
      position: fixed; top: 0; left: 0; right: 0;
      height: var(--header-h);
      background: var(--bg-header);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center;
      padding: 0 24px;
      z-index: 100;
      gap: 16px;
    }
    .site-logo {
      font-size: 14px; font-weight: 600; color: var(--gold);
      text-decoration: none; letter-spacing: 0.06em;
      display: flex; align-items: baseline; gap: 6px;
    }
    .site-logo span { font-weight: 300; color: var(--text-light); font-size: 11px; }
    .header-links { margin-left: auto; display: flex; gap: 20px; align-items: center; }
    .header-links a {
      font-size: 10px; color: var(--text-muted); text-decoration: none;
      letter-spacing: 0.08em; transition: color 0.15s;
    }
    .header-links a:hover { color: var(--gold); }

    /* ── LAYOUT ── */
    .layout {
      display: flex;
      margin-top: var(--header-h);
      min-height: calc(100vh - var(--header-h));
    }

    /* ── SIDEBAR ── */
    .sidebar {
      width: var(--sidebar-w);
      flex-shrink: 0;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      padding: 28px 0 60px;
      position: fixed;
      top: var(--header-h);
      bottom: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #2a2a2a transparent;
    }
    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

    .nav-section { margin-bottom: 20px; }
    .nav-section-title {
      font-size: 9px; font-weight: 600; color: var(--gold);
      letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0 20px 6px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 4px;
    }
    .nav-section ul { list-style: none; }
    .nav-link {
      display: block;
      font-size: 11px; color: var(--text-sidebar);
      text-decoration: none;
      padding: 6px 20px;
      transition: color 0.15s, background 0.15s;
      border-left: 2px solid transparent;
    }
    .nav-link:hover { color: var(--gold); background: var(--gold-faint); }
    .nav-link.active {
      color: var(--gold); background: var(--gold-faint);
      border-left-color: var(--gold);
    }
    .ext-icon { font-size: 9px; opacity: 0.5; margin-left: 2px; }

    /* ── MAIN CONTENT ── */
    .main {
      margin-left: var(--sidebar-w);
      flex: 1;
      min-width: 0;
      background: var(--bg-paper);
      min-height: calc(100vh - var(--header-h));
    }

    .content-inner {
      max-width: 820px;
      margin: 0 auto;
      padding: 48px 56px 80px;
    }

    /* ── BREADCRUMB ── */
    .breadcrumb {
      font-size: 10px; color: var(--text-muted);
      margin-bottom: 32px;
      display: flex; gap: 6px; align-items: center;
    }
    .breadcrumb a { color: var(--gold); text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { opacity: 0.5; }

    /* ── MARKDOWN CONTENT ── */
    .doc-content h1 {
      font-size: 22px; font-weight: 600; color: #111;
      margin-bottom: 12px; letter-spacing: 0.01em;
    }
    .doc-content h2 {
      font-size: 15px; font-weight: 600; color: #1a1a1a;
      margin-top: 40px; margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }
    .doc-content h3 {
      font-size: 12px; font-weight: 600; color: #2a2a2a;
      margin-top: 28px; margin-bottom: 10px;
    }
    .doc-content h4 {
      font-size: 11px; font-weight: 500; color: var(--text-mid);
      margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .doc-content p {
      font-size: 13px; line-height: 1.8; color: var(--text-mid);
      margin-bottom: 16px;
    }
    .doc-content a { color: var(--gold); text-decoration: underline; text-decoration-color: var(--gold-dim); }
    .doc-content a:hover { text-decoration-color: var(--gold); }
    .doc-content ul, .doc-content ol {
      margin: 12px 0 16px 20px; font-size: 13px; line-height: 1.8; color: var(--text-mid);
    }
    .doc-content li { margin-bottom: 4px; }

    .doc-content table {
      width: 100%; border-collapse: collapse;
      font-size: 12px; margin: 20px 0;
      border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
    }
    .doc-content th {
      background: rgba(172,142,102,0.12); color: #1a1a1a;
      font-weight: 600; font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.08em; padding: 10px 14px; text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .doc-content td {
      padding: 9px 14px; border-bottom: 1px solid rgba(172,142,102,0.1);
      color: var(--text-mid); vertical-align: top;
    }
    .doc-content tr:last-child td { border-bottom: none; }
    .doc-content tr:hover td { background: rgba(172,142,102,0.04); }

    .doc-content pre {
      background: var(--code-bg); border-radius: 8px;
      padding: 18px 20px; margin: 18px 0;
      overflow-x: auto; border: 1px solid #2a2a2a;
    }
    .doc-content code {
      font-family: var(--font); font-size: 12px; line-height: 1.7;
      color: #d0cbb8;
    }
    .doc-content p code, .doc-content li code {
      background: rgba(0,0,0,0.08); border: 1px solid var(--border);
      border-radius: 3px; padding: 1px 5px;
      font-size: 11px; color: #333;
    }
    .doc-content blockquote {
      border-left: 3px solid var(--gold); margin: 20px 0;
      padding: 12px 18px; background: var(--gold-faint);
      border-radius: 0 6px 6px 0;
    }
    .doc-content blockquote p { margin: 0; font-style: italic; }

    .doc-content hr {
      border: none; border-top: 1px solid var(--border);
      margin: 36px 0;
    }

    .anchor {
      color: var(--gold-dim); text-decoration: none; margin-right: 6px;
      font-size: 0.8em; opacity: 0;
      transition: opacity 0.15s;
    }
    h1:hover .anchor, h2:hover .anchor, h3:hover .anchor { opacity: 1; }

    /* ── PREV / NEXT ── */
    .prev-next-nav {
      display: flex; justify-content: space-between;
      margin-top: 56px; padding-top: 24px;
      border-top: 1px solid var(--border);
    }
    .prev-next {
      font-size: 11px; color: var(--gold); text-decoration: none;
      padding: 8px 14px; border: 1px solid var(--border);
      border-radius: 6px; transition: all 0.15s;
      background: rgba(255,255,255,0.4);
    }
    .prev-next:hover { background: var(--gold-faint); border-color: var(--gold); }

    /* ── FOOTER ── */
    .site-footer {
      background: var(--bg-header); border-top: 1px solid var(--border);
      padding: 20px 56px;
      margin-left: var(--sidebar-w);
      display: flex; justify-content: space-between; align-items: center;
    }
    .site-footer p { font-size: 10px; color: var(--text-muted); }
    .site-footer a { color: var(--gold); text-decoration: none; }
    .site-footer a:hover { text-decoration: underline; }

    /* ── MOBILE ── */
    .menu-toggle {
      display: none; background: none; border: none;
      color: var(--text-light); font-size: 18px; cursor: pointer; padding: 4px;
    }
    @media (max-width: 768px) {
      :root { --sidebar-w: 0px; }
      .menu-toggle { display: block; }
      .sidebar {
        transform: translateX(-100%); transition: transform 0.25s ease;
        width: 260px; z-index: 90;
      }
      .sidebar.open { transform: translateX(0); }
      .content-inner { padding: 32px 24px 60px; }
      .site-footer { margin-left: 0; flex-direction: column; gap: 8px; text-align: center; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')" aria-label="Menü">☰</button>
    <a href="/" class="site-logo">${SITE.logo} <span>${SITE.logoSub}</span></a>
    <nav class="header-links">
      <a href="${SITE.github}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      <a href="https://zenpostapp.denisbitter.de" target="_blank" rel="noopener noreferrer">App ↗</a>
    </nav>
  </header>

  <div class="layout">

    <!-- Sidebar -->
    <aside class="sidebar">
      ${nav}
    </aside>

    <!-- Main -->
    <main class="main">
      <div class="content-inner">
        ${breadcrumb}
        <article class="doc-content">
          ${content}
        </article>
        ${prevNext}
      </div>
    </main>

  </div>

  <!-- Footer -->
  <footer class="site-footer">
    <p>© ${new Date().getFullYear()} <a href="https://denisbitter.de">Denis Bitter</a> · ZenPost Studio</p>
    <p><a href="${SITE.github}" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="${SITE.github}/issues" target="_blank" rel="noopener noreferrer">Issue melden</a></p>
  </footer>

  <script>
    // Close sidebar on link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.remove('open');
      });
    });
  </script>

</body>
</html>`;
}

// ─── SITEMAP ──────────────────────────────────────────────────────────────────
function buildSitemap(pages) {
  const urls = pages.map(p => `
  <url>
    <loc>${SITE.url}/${p.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>${p.slug === 'index.html' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// ─── EXTRACT TITLE + DESCRIPTION FROM MARKDOWN ───────────────────────────────
function extractMeta(mdContent) {
  const lines = mdContent.split('\n');
  let title = '';
  let description = '';

  for (const line of lines) {
    if (!title && line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
    } else if (title && !description && line.trim() && !line.startsWith('#')) {
      description = line.trim().replace(/[*_`\[\]]/g, '').substring(0, 160);
      break;
    }
  }

  return { title: title || 'ZenPost Docs', description: description || SITE.description };
}

// ─── COPY ASSETS ──────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(extname(entry).toLowerCase())) {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ─── MAIN BUILD ───────────────────────────────────────────────────────────────
function build() {
  console.log('🔨 Building ZenPost Docs...\n');

  // Create dist dir
  mkdirSync(DIST, { recursive: true });

  // Parse sidebar
  const sidebarPath = join(DOCS_SRC, '_sidebar.md');
  const sections = parseSidebar(sidebarPath);

  // Collect all pages to build
  const pages = [];
  const allItems = sections.flatMap(s => s.items.filter(i => !i.external));

  for (const item of allItems) {
    const mdPath = join(DOCS_SRC, item.href);
    if (!existsSync(mdPath)) {
      console.warn(`  ⚠  Skipping missing file: ${item.href}`);
      continue;
    }

    const slug = item.href.replace(/\.md$/, '.html');
    const mdContent = readFileSync(mdPath, 'utf-8');
    const { title, description } = extractMeta(mdContent);
    pages.push({ item, slug, mdPath, mdContent, title, description });
  }

  // Build each page
  for (const page of pages) {
    const htmlContent = marked.parse(page.mdContent);
    const nav = buildNav(sections, page.item.href);
    const breadcrumb = buildBreadcrumb(sections, page.item.href);
    const prevNext = buildPrevNext(sections, page.item.href);

    const html = buildPage({
      title: page.title,
      description: page.description,
      content: htmlContent,
      nav,
      breadcrumb,
      prevNext,
      slug: page.slug,
    });

    // Ensure subdirectory exists
    const outPath = join(DIST, page.slug);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf-8');
    console.log(`  ✓  ${page.slug}`);
  }

  // Build index.html → redirect to README
  const indexRedirect = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="0; url=/README.html" />
<title>ZenPost Docs</title>
</head><body></body></html>`;
  writeFileSync(join(DIST, 'index.html'), indexRedirect);
  console.log(`  ✓  index.html`);

  // Sitemap
  const sitemap = buildSitemap(pages);
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
  console.log(`  ✓  sitemap.xml`);

  // robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`;
  writeFileSync(join(DIST, 'robots.txt'), robots);
  console.log(`  ✓  robots.txt`);

  // Copy image assets
  copyDir(join(DOCS_SRC, '_assets'), join(DIST, '_assets'));

  console.log(`\n✅ Done — ${pages.length} pages built to docs-dist/`);
  console.log(`   Deploy: rsync -avz docs-dist/ user@server:/path/to/docs/\n`);
}

build();
