#!/usr/bin/env node
/**
 * ZenPost Docs — Static Site Builder
 * Converts docs/*.md into a fully styled static HTML site.
 *
 * Features: Search, Accordion nav, Dark/Light mode
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
  url: 'https://zenpostdocs.denisbitter.de',
  author: 'Denis Bitter',
  github: 'https://github.com/THEORIGINALBITTER/zenpost-studio',
  twitterHandle: '@THEORIGINALBITTER',
  logo: 'ZenPost',
  logoSub: 'Docs',
};

// ─── MARKED CONFIG ────────────────────────────────────────────────────────────
marked.setOptions({ gfm: true, breaks: false });

const renderer = new marked.Renderer();

renderer.link = ({ href, title, text }) => {
  const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
  const titleAttr = title ? ` title="${title}"` : '';
  if (isExternal) {
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text} <span class="ext-icon">↗</span></a>`;
  }
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
      const isExt = /^https?:\/\//.test(itemMatch[2]);
      current.items.push({ label: itemMatch[1], href: itemMatch[2], ...(isExt && { external: true }) });
    }

    // Top-level external links (not indented)
    const extMatch = line.match(/^- \[(.+?)\]\((https?:\/\/.+?)\)$/);
    if (extMatch) {
      if (!current) { current = { title: 'Links', items: [] }; sections.push(current); }
      current.items.push({ label: extMatch[1], href: extMatch[2], external: true });
    }
  }

  return sections;
}

// ─── NAVIGATION HTML (Accordion) ──────────────────────────────────────────────
function buildNav(sections, activePath) {
  return sections.map(section => {
    const hasActive = section.items.some(item => {
      const href = item.href.replace(/\.md$/, '.html');
      return activePath === item.href || activePath === href;
    });

    const items = section.items.map(item => {
      if (item.external) {
        return `<li><a href="${item.href}" target="_blank" rel="noopener noreferrer" class="nav-link">${item.label} <span class="ext-icon">↗</span></a></li>`;
      }
      const href = item.href.replace(/\.md$/, '.html');
      const isActive = activePath === item.href || activePath === href;
      return `<li><a href="/${href}" class="nav-link${isActive ? ' active' : ''}">${item.label}</a></li>`;
    }).join('\n          ');

    const openAttr = hasActive ? ' open' : '';
    const sectionId = section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return `
        <details class="nav-section" id="sec-${sectionId}"${openAttr}>
          <summary class="nav-section-title">${section.title}<span class="nav-arrow">›</span></summary>
          <ul>${items}</ul>
        </details>`;
  }).join('\n');
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
<html lang="de" data-theme="light">
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

  <!-- Styles — edit docs/_theme/styles.css, then run: npm run build:docs -->
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>

  <!-- Header -->
  <header class="site-header">
    <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')" aria-label="Menü">☰</button>
    <a href="/" class="site-logo">${SITE.logo} <span>${SITE.logoSub}</span></a>

    <!-- Search -->
    <div class="search-wrap">
      <span class="search-icon">⌕</span>
      <input
        type="text"
        class="search-input"
        id="searchInput"
        placeholder="Suchen…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Dokumentation durchsuchen"
      />
      <span class="search-shortcut">/</span>
      <div class="search-results" id="searchResults"></div>
    </div>

    <div class="header-right">
      <nav class="header-links">
        <a href="https://zenpost.denisbitter.de" target="_blank" rel="noopener noreferrer">App ↗</a>
        <a href="${SITE.github}/releases" target="_blank" rel="noopener noreferrer">Download ↗</a>
        <a href="${SITE.github}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
      </nav>
      <button class="theme-toggle" id="themeToggle" aria-label="Farbschema wechseln">
        <span class="icon-dark">◑ Dark</span>
        <span class="icon-light">◑ Light</span>
      </button>
    </div>
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
    // ── DARK / LIGHT MODE ──────────────────────────────────────────────────────
    (function () {
      var saved = localStorage.getItem('zen-docs-theme') || 'light';
      document.documentElement.setAttribute('data-theme', saved);
    })();

    document.getElementById('themeToggle').addEventListener('click', function () {
      var html = document.documentElement;
      var current = html.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('zen-docs-theme', next);
    });

    // ── SEARCH ────────────────────────────────────────────────────────────────
    var searchIndex = null;
    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');

    function loadIndex(cb) {
      if (searchIndex) { cb(); return; }
      fetch('/search-index.json')
        .then(function(r) { return r.json(); })
        .then(function(data) { searchIndex = data; cb(); })
        .catch(function() { searchIndex = []; cb(); });
    }

    function highlight(text, query) {
      if (!query) return text;
      var qi = text.toLowerCase().indexOf(query.toLowerCase());
      if (qi === -1) return text;
      return text.substring(0, qi) + '<em>' + text.substring(qi, qi + query.length) + '</em>' + text.substring(qi + query.length);
    }

    function snippet(text, query, len) {
      len = len || 120;
      var idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return text.substring(0, len) + (text.length > len ? '…' : '');
      var start = Math.max(0, idx - 40);
      var end = Math.min(text.length, idx + len - 40);
      return (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
    }

    function doSearch(q) {
      q = q.trim();
      if (!q || q.length < 2) {
        searchResults.classList.remove('visible');
        searchResults.innerHTML = '';
        return;
      }
      loadIndex(function () {
        var ql = q.toLowerCase();
        var matches = searchIndex.filter(function(p) {
          return p.title.toLowerCase().includes(ql) || p.text.toLowerCase().includes(ql);
        }).slice(0, 8);

        if (!matches.length) {
          searchResults.innerHTML = '<div class="search-no-results">Keine Ergebnisse für „' + q + '"</div>';
          searchResults.classList.add('visible');
          return;
        }

        searchResults.innerHTML = matches.map(function(p) {
          var snip = snippet(p.text, q);
          return '<a class="search-result-item" href="/' + p.slug + '">' +
            '<span class="search-result-section">' + p.section + '</span>' +
            '<span class="search-result-title">' + highlight(p.title, q) + '</span>' +
            '<span class="search-result-snippet">' + highlight(snip, q) + '</span>' +
            '</a>';
        }).join('');
        searchResults.classList.add('visible');
      });
    }

    searchInput.addEventListener('input', function() { doSearch(this.value); });
    searchInput.addEventListener('focus', function() { if (this.value.trim().length >= 2) searchResults.classList.add('visible'); });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-wrap')) {
        searchResults.classList.remove('visible');
      }
    });

    // Keyboard shortcut: / to focus search
    document.addEventListener('keydown', function(e) {
      if (e.key === '/' && document.activeElement !== searchInput && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        searchResults.classList.remove('visible');
        searchInput.blur();
      }
    });

    // Navigate results with arrow keys
    searchInput.addEventListener('keydown', function(e) {
      var items = searchResults.querySelectorAll('.search-result-item');
      var active = searchResults.querySelector('.search-result-item:focus');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!active && items[0]) { items[0].focus(); }
        else if (active) {
          var next = active.nextElementSibling;
          if (next) next.focus();
        }
      }
    });

    // ── SIDEBAR MOBILE ────────────────────────────────────────────────────────
    document.querySelectorAll('.nav-link').forEach(function(link) {
      link.addEventListener('click', function() {
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

// ─── STRIP MARKDOWN TO PLAIN TEXT (for search index) ─────────────────────────
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, '')       // code blocks
    .replace(/`[^`]+`/g, '')              // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')      // images
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')   // links → text
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/[*_]{1,3}(.+?)[*_]{1,3}/g, '$1') // bold/italic
    .replace(/^[-*+]\s+/gm, '')           // list bullets
    .replace(/^\d+\.\s+/gm, '')           // numbered lists
    .replace(/^>\s+/gm, '')               // blockquotes
    .replace(/\|.*?\|/g, ' ')             // tables
    .replace(/[-=]{3,}/g, '')             // hr / table separator
    .replace(/\s+/g, ' ')
    .trim();
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

  mkdirSync(DIST, { recursive: true });

  const sidebarPath = join(DOCS_SRC, '_sidebar.md');
  const sections = parseSidebar(sidebarPath);

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

    // Find section name for this item
    const section = sections.find(s => s.items.some(i => i.href === item.href));
    const sectionTitle = section ? section.title : '';

    pages.push({ item, slug, mdPath, mdContent, title, description, sectionTitle });
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

    const outPath = join(DIST, page.slug);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf-8');
    console.log(`  ✓  ${page.slug}`);
  }

  // index.html → redirect to README
  const indexRedirect = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta http-equiv="refresh" content="0; url=/README.html" />
<title>ZenPost Docs</title>
</head><body></body></html>`;
  writeFileSync(join(DIST, 'index.html'), indexRedirect);
  console.log(`  ✓  index.html`);

  // Search index JSON
  const searchIndex = pages.map(p => ({
    title: p.title,
    slug: p.slug,
    section: p.sectionTitle,
    text: stripMarkdown(p.mdContent).substring(0, 2000),
  }));
  writeFileSync(join(DIST, 'search-index.json'), JSON.stringify(searchIndex));
  console.log(`  ✓  search-index.json (${searchIndex.length} pages)`);

  // Sitemap
  writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(pages));
  console.log(`  ✓  sitemap.xml`);

  // robots.txt
  writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
  console.log(`  ✓  robots.txt`);

  // .htaccess
  const htaccess = `# ZenPost Docs — Apache config

# Clean URLs: /ai/overview → /ai/overview.html
RewriteEngine On
RewriteBase /

# Skip real files and directories
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Append .html if no extension
RewriteCond %{REQUEST_URI} !\\.(html|xml|txt|css|js|json|png|jpg|webp|svg|gif)$
RewriteRule ^(.+)$ $1.html [L]

# 404 → custom page
ErrorDocument 404 /index.html

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html             "access plus 1 hour"
  ExpiresByType application/json      "access plus 1 hour"
  ExpiresByType text/css              "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/png             "access plus 1 year"
  ExpiresByType image/jpeg            "access plus 1 year"
  ExpiresByType image/webp            "access plus 1 year"
  ExpiresByType image/svg+xml        "access plus 1 year"
</IfModule>

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`;
  writeFileSync(join(DIST, '.htaccess'), htaccess);
  console.log(`  ✓  .htaccess`);

  // Copy stylesheet
  const cssSource = join(DOCS_SRC, '_theme', 'styles.css');
  if (existsSync(cssSource)) {
    copyFileSync(cssSource, join(DIST, 'styles.css'));
    console.log(`  ✓  styles.css`);
  }

  // Copy image assets
  copyDir(join(DOCS_SRC, '_assets'), join(DIST, '_assets'));

  console.log(`\n✅ Done — ${pages.length} pages built to docs-dist/`);
  console.log(`   Deploy: rsync -avz docs-dist/ user@server:/path/\n`);
}

build();
