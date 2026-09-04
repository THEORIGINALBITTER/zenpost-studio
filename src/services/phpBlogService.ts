/**
 * PHP Blog Upload Service
 * Uploads blog posts via HTTP POST to a user-deployed PHP script.
 * Works in both Web and Desktop (Tauri).
 */

export interface PhpBlogConfig {
  apiUrl: string;   // e.g. https://myserver.de/zenpost/upload.php
  apiKey: string;   // secret key matching the PHP script
}

export function normalizePhpUploadUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  const withoutSlash = withProtocol.replace(/\/$/, '');
  return /\.php(?:$|\?)/i.test(withoutSlash) ? withoutSlash : `${withoutSlash}/zenpost-upload.php`;
}

export interface PhpBlogUploadPayload {
  filename: string;           // e.g. 2026-03-16-my-post.md
  content: string;            // full markdown content with frontmatter
  manifest?: unknown;         // updated manifest.json content (optional)
  thought?: string;           // optional thought summary for external app flows
  placeholder?: {
    word?: string;
    status?: string;
    focus?: string;
  };
}

/**
 * Uploads a cover image (base64) to the blog server's _assets/ folder.
 * Returns the public URL on success, or null on failure.
 */
export async function phpBlogImageUpload(
  imageData: string,  // data:image/... base64
  fileName: string,
  config: PhpBlogConfig,
): Promise<string | null> {
  try {
    const response = await fetch(normalizePhpUploadUrl(config.apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apiKey },
      body: JSON.stringify({ imageData, fileName }),
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = (await response.json() as { error?: string }).error ?? ''; } catch { /* ignore */ }
      console.error(`[phpBlogImageUpload] HTTP ${response.status}${errBody ? `: ${errBody}` : ''}`);
      return null;
    }
    const json = await response.json() as { success?: boolean; url?: string };
    if (!json.success || !json.url) {
      console.error('[phpBlogImageUpload] Unexpected response:', json);
      return null;
    }
    return json.url;
  } catch (e) {
    console.error('[phpBlogImageUpload] Network/fetch error:', e);
    return null;
  }
}

/**
 * Updates only manifest.json on the server (e.g. after deleting a post).
 * Requires a PHP script that supports manifest-only updates (no filename/content).
 * Returns an error string on failure, null on success.
 */
export async function phpBlogManifestUpdate(
  manifest: unknown,
  config: PhpBlogConfig,
): Promise<string | null> {
  try {
    const response = await fetch(normalizePhpUploadUrl(config.apiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apiKey },
      body: JSON.stringify({ manifest }),
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json() as { error?: string }).error ?? ''; } catch { /* ignore */ }
      return `Server Fehler ${response.status}${detail ? `: ${detail}` : ''}`;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Uploads a blog post to a PHP upload endpoint.
 * Returns an error string on failure, null on success.
 */
export async function phpBlogUpload(
  payload: PhpBlogUploadPayload,
  config: PhpBlogConfig,
): Promise<string | null> {
  try {
    const response = await fetch(normalizePhpUploadUrl(config.apiUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json() as { error?: string }).error ?? ''; } catch { /* ignore */ }
      return `Server Fehler ${response.status}${detail ? `: ${detail}` : ''}`;
    }

    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export interface PhpBlogNewsletterPayload {
  title: string;
  subtitle?: string;
  slug: string;
  siteUrl: string;
}

/**
 * Triggers newsletter notification after successful blog post upload.
 * Silently fails — newsletter error should not block publishing.
 */
export async function phpBlogNewsletterNotify(
  payload: PhpBlogNewsletterPayload,
  config: { apiUrl: string; apiKey: string },
): Promise<void> {
  try {
    await fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': config.apiKey },
      body: JSON.stringify(payload),
    });
  } catch { /* silent — newsletter failure must not block publishing */ }
}

/**
 * Returns the content of the ZenPost PHP upload script.
 * User downloads this, configures the API_KEY, and uploads to their server.
 */
export type PhpUploadMode = 'blog' | 'docs';

// `mode` is kept for call-site compatibility but no longer branches the
// output: the generated script auto-detects docs vs. blog at runtime
// (via docs_file_count()), so there is only one template.
export function getPhpUploadScript(apiKey = 'DEIN_GEHEIMER_KEY', _mode: PhpUploadMode = 'blog'): string {
  const phpApiKey = apiKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `<?php
/**
 * ZenPost Upload Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * Lade diese Datei direkt in das Site-/Blog-Hauptverzeichnis hoch.
 *
 * Docs-Struktur:
 *   /zenpost-upload.php
 *   /docs/manifest.json
 *   /docs/*.md
 *
 * Blog-Struktur:
 *   /zenpost-upload.php
 *   /manifest.json
 *   /posts/*.md
 *
 * Wenn docs/*.md existiert, arbeitet der Endpoint im Docs-Modus.
 * Sonst arbeitet er im klassischen Blog-Modus.
 *
 * Voraussetzungen: PHP 7.4+, Schreibrechte auf docs/ oder posts/
 * ─────────────────────────────────────────────────────────────────────────────
 */

define('API_KEY', '${phpApiKey}');
define('DOCS_DIR', __DIR__ . '/docs/');
define('MANIFEST_PATH', DOCS_DIR . 'manifest.json');
define('POSTS_DIR', __DIR__ . '/posts/');
define('BLOG_MANIFEST_PATH', __DIR__ . '/manifest.json');
define('ASSETS_DIR', DOCS_DIR . '_assets/');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function default_manifest(): array {
    return [
        'content' => ['format' => 'markdown', 'directory' => 'docs'],
        'documents' => [],
    ];
}

function docs_file_count(): int {
    if (!is_dir(DOCS_DIR)) return 0;
    $count = 0;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(DOCS_DIR, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if (!$file->isFile()) continue;
        $relPath = str_replace('\\\\', '/', substr($file->getPathname(), strlen(DOCS_DIR)));
        if (substr($relPath, -3) !== '.md') continue;
        if (preg_match('/(^|\\/)(README|TODO|memo)\\.md$/i', $relPath)) continue;
        if (strpos($relPath, '_assets/') === 0) continue;
        $count += 1;
    }
    return $count;
}

function read_manifest(): array {
    if (!file_exists(MANIFEST_PATH)) return scan_docs(default_manifest());
    $raw = file_get_contents(MANIFEST_PATH);
    $json = json_decode((string)$raw, true);
    return is_array($json) ? scan_docs($json) : scan_docs(default_manifest());
}

// Rebuilds posts[] from the actual posts/ folder on disk, keeping metadata
// (title, subtitle, tags, date, ...) for slugs that are already tracked and
// adding a minimal entry for any .md file that exists but isn't listed. This
// is what makes the manifest recover on its own instead of trusting whatever
// was last written — including recovering from a manifest that was
// overwritten with the wrong shape entirely (e.g. {documents:[...]} instead
// of {posts:[...]}, which silently discards every previously tracked post).
function scan_posts_from_disk(array $manifest): array {
    $existingPosts = isset($manifest['posts']) && is_array($manifest['posts']) ? $manifest['posts'] : [];
    $existingBySlug = [];
    foreach ($existingPosts as $post) {
        if (is_array($post) && isset($post['slug'])) $existingBySlug[$post['slug']] = $post;
    }

    if (!isset($manifest['site']) || !is_array($manifest['site'])) {
        $manifest['site'] = [];
    }
    // Drop a stale 'content'/'documents' shape left over from a wrongly
    // formatted write — this endpoint's blog manifest is {site, posts}.
    unset($manifest['content'], $manifest['documents']);

    if (!is_dir(POSTS_DIR)) {
        $manifest['posts'] = [];
        return $manifest;
    }

    $files = [];
    foreach (scandir(POSTS_DIR) ?: [] as $entry) {
        if (substr($entry, -3) !== '.md') continue;
        $files[] = $entry;
    }
    sort($files, SORT_NATURAL);

    $posts = [];
    foreach ($files as $fileName) {
        $slug = preg_replace('/\\.md$/', '', $fileName);
        if (isset($existingBySlug[$slug])) {
            $posts[] = $existingBySlug[$slug];
            continue;
        }
        // Also match by localFileName, in case the slug differs from the
        // filename stem (some entries store a human title as slug).
        $matched = null;
        foreach ($existingBySlug as $candidate) {
            if (($candidate['localFileName'] ?? '') === $fileName) { $matched = $candidate; break; }
        }
        if ($matched !== null) {
            $posts[] = $matched;
            continue;
        }
        $posts[] = [
            'slug' => $slug,
            'title' => title_from_markdown(POSTS_DIR . $fileName),
            'date' => gmdate('Y-m-d', filemtime(POSTS_DIR . $fileName) ?: time()),
            'localFileName' => $fileName,
        ];
    }

    $manifest['posts'] = $posts;
    return $manifest;
}

function read_blog_manifest(): array {
    if (!file_exists(BLOG_MANIFEST_PATH)) {
        return scan_posts_from_disk(['site' => [], 'posts' => []]);
    }
    $raw = file_get_contents(BLOG_MANIFEST_PATH);
    $json = json_decode((string)$raw, true);
    $base = is_array($json) ? $json : ['site' => [], 'posts' => []];
    $rescanned = scan_posts_from_disk($base);
    // Persist the self-healed manifest so the file recovers too, not just
    // this response.
    @file_put_contents(BLOG_MANIFEST_PATH, json_encode($rescanned, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return $rescanned;
}

// Deliberately does NOT create DOCS_DIR — writing here is only valid once
// docs/ already exists (see safe_doc_path()/the caller checks below). A
// docs-shaped save arriving for a site that was never actually set up as a
// docs site (e.g. a client with a stale/misconfigured siteType) should fail
// loudly here instead of silently creating docs/ and, from that point on,
// permanently starving posts/ of new content.
function write_manifest(array $manifest): bool {
    if (!is_dir(DOCS_DIR)) return false;
    return file_put_contents(MANIFEST_PATH, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false;
}

// Writes the blog manifest (root manifest.json), refusing a payload that is
// clearly docs-shaped (documents[] but no posts[]) — that shape overwriting
// this file is exactly the bug that silently dropped every tracked post
// after a site got its siteType misconfigured client-side.
function write_blog_manifest(array $manifest): bool {
    if (isset($manifest['documents']) && !isset($manifest['posts'])) {
        return false;
    }
    return file_put_contents(BLOG_MANIFEST_PATH, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false;
}

function delete_docs_removed_from_manifest(array $newManifest): void {
    if (!file_exists(MANIFEST_PATH)) return;
    $raw = file_get_contents(MANIFEST_PATH);
    $old = json_decode((string)$raw, true);
    if (!is_array($old) || !isset($old['documents']) || !is_array($old['documents'])) return;

    $newPaths = [];
    foreach (($newManifest['documents'] ?? []) as $doc) {
        if (isset($doc['path'])) $newPaths[$doc['path']] = true;
    }

    foreach ($old['documents'] as $doc) {
        $path = $doc['path'] ?? null;
        if (!$path || isset($newPaths[$path])) continue;
        $safePath = safe_doc_path((string)$path);
        if ($safePath !== null && file_exists(DOCS_DIR . $safePath)) {
            unlink(DOCS_DIR . $safePath);
        }
    }
}

function title_from_markdown(string $path): string {
    $raw = file_get_contents($path);
    if (is_string($raw) && preg_match('/^#\\s+(.+)$/m', $raw, $m)) {
        return trim((string)$m[1]);
    }
    return preg_replace('/\\.md$/', '', basename($path));
}

function scan_docs(array $manifest): array {
    if (!isset($manifest['documents']) || !is_array($manifest['documents'])) {
        $manifest['documents'] = [];
    }
    if (!isset($manifest['content']) || !is_array($manifest['content'])) {
        $manifest['content'] = ['format' => 'markdown', 'directory' => 'docs'];
    }

    $existingByPath = [];
    foreach ($manifest['documents'] as $doc) {
        if (isset($doc['path'])) $existingByPath[$doc['path']] = $doc;
    }

    if (!is_dir(DOCS_DIR)) {
        $manifest['documents'] = [];
        return $manifest;
    }

    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(DOCS_DIR, FilesystemIterator::SKIP_DOTS));
    $paths = [];
    foreach ($iterator as $file) {
        if (!$file->isFile()) continue;
        $relPath = str_replace('\\\\', '/', substr($file->getPathname(), strlen(DOCS_DIR)));
        if (substr($relPath, -3) !== '.md') continue;
        if (preg_match('/(^|\\/)(README|TODO|memo)\\.md$/i', $relPath)) continue;
        if (strpos($relPath, '_assets/') === 0) continue;
        $paths[] = $relPath;
    }
    sort($paths, SORT_NATURAL);

    $order = 10;
    $index = 0;
    $roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    $documents = [];
    foreach ($paths as $relPath) {
        $id = preg_replace('/\\.md$/', '', basename($relPath));
        $existing = $existingByPath[$relPath] ?? null;
        $documents[] = [
            'id' => $existing['id'] ?? $id,
            'path' => $relPath,
            'title' => title_from_markdown(DOCS_DIR . $relPath),
            'type' => $existing['type'] ?? 'memo',
            'section' => $existing['section'] ?? 'fundament',
            'showOnHome' => $existing['showOnHome'] ?? true,
            'number' => $existing['number'] ?? ($index === 0 ? '01-0' : '01-' . ($roman[$index] ?? (string)$index)),
            'order' => $existing['order'] ?? $order,
        ];
        $order += 10;
        $index += 1;
    }

    $manifest['documents'] = $documents;
    return $manifest;
}

function safe_doc_path(string $value): ?string {
    $value = str_replace('\\\\', '/', trim($value));
    $value = ltrim($value, '/');
    if ($value === '' || strtolower($value) === 'manifest.json' || substr($value, -3) !== '.md') return null;
    if (strpos($value, "\\0") !== false) return null;
    foreach (explode('/', $value) as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..') return null;
    }
    return $value;
}

function resolve_doc_file(string $requested): ?string {
    $direct = safe_doc_path($requested);
    if ($direct !== null) return $direct;

    $slug = preg_replace('/\\.md$/', '', trim($requested));
    if ($slug === '') return null;
    $manifest = read_manifest();
    foreach (($manifest['documents'] ?? []) as $entry) {
        if (!is_array($entry)) continue;
        $path = (string)($entry['path'] ?? '');
        $id = (string)($entry['id'] ?? '');
        $stem = preg_replace('/\\.md$/', '', basename($path));
        if ($id === $slug || $stem === $slug) return safe_doc_path($path);
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $requested = trim((string)($_GET['file'] ?? $_GET['slug'] ?? ''));
    if ($requested === '') {
        // Always report both shapes, each freshly self-healed from its own
        // folder on disk. Previously this picked ONE shape based on whether
        // docs/ happened to contain any file at all — a single doc/*.md
        // (even a stray one, or one from before a site type was corrected)
        // flipped the whole endpoint into "docs mode" and made every
        // tracked blog post in posts/ invisible to callers reading this
        // response, even though write_blog_manifest() kept them intact.
        // Returning both means a client can never lose visibility into one
        // folder just because the other has content.
        $docsManifest = read_manifest();
        $blogManifest = read_blog_manifest();
        $combined = $blogManifest;
        $combined['documents'] = $docsManifest['documents'] ?? [];
        $combined['content'] = $docsManifest['content'] ?? ['format' => 'markdown', 'directory' => 'docs'];
        echo json_encode($combined, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $relPath = resolve_doc_file($requested);
    if ($relPath === null || !file_exists(DOCS_DIR . $relPath)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Document not found']);
        exit;
    }

    $markdown = file_get_contents(DOCS_DIR . $relPath);
    $manifest = read_manifest();
    $title = preg_replace('/\\.md$/', '', basename($relPath));
    foreach (($manifest['documents'] ?? []) as $entry) {
        if (is_array($entry) && (($entry['path'] ?? '') === $relPath)) {
            $title = trim((string)($entry['homeTitle'] ?? $entry['title'] ?? $title));
            break;
        }
    }

    echo json_encode([
        'success' => true,
        'file' => $relPath,
        'title' => $title,
        'markdown' => $markdown,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

if (isset($body['imageData'])) {
    $imageData = trim((string)($body['imageData'] ?? ''));
    $fileName = trim((string)($body['fileName'] ?? ''));
    if (!preg_match('/^data:image\\/(png|jpe?g|webp|gif);base64,(.+)$/i', $imageData, $im)) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid image data']);
        exit;
    }
    $ext = strtolower($im[1] === 'jpeg' ? 'jpg' : $im[1]);
    $binary = base64_decode(preg_replace('/\\s+/', '', $im[2]), true);
    if ($binary === false) {
        http_response_code(422);
        echo json_encode(['error' => 'Base64 decode failed']);
        exit;
    }
    $safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $fileName);
    $safeName = trim($safeName, '-_.');
    if ($safeName === '') $safeName = 'cover-' . gmdate('Ymd-His') . '.' . $ext;
    if (!preg_match('/\\.(png|jpe?g|webp|gif)$/i', $safeName)) $safeName .= '.' . $ext;
    if (!is_dir(ASSETS_DIR)) mkdir(ASSETS_DIR, 0755, true);
    if (file_put_contents(ASSETS_DIR . $safeName, $binary) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write image file']);
        exit;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
    $url = ($host !== '' ? $scheme . '://' . $host : '') . $scriptDir . '/docs/_assets/' . rawurlencode($safeName);
    echo json_encode(['success' => true, 'url' => $url, 'fileName' => $safeName]);
    exit;
}

if (!isset($body['filename']) && !isset($body['content']) && isset($body['manifest'])) {
    if (!is_array($body['manifest'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write manifest']);
        exit;
    }
    // Routed purely by payload shape — a blog payload (posts, no documents)
    // always goes to the blog manifest, regardless of whether docs/ happens
    // to contain files. Gating this on docs_file_count() used to mean a
    // single stray file in docs/ would silently reroute every future blog
    // save into docs/ too, starving posts/ of new content.
    if (isset($body['manifest']['posts']) && !isset($body['manifest']['documents'])) {
        if (!write_blog_manifest($body['manifest'])) {
            http_response_code(500);
            echo json_encode(['error' => 'Could not write manifest']);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    delete_docs_removed_from_manifest($body['manifest']);
    if (!write_manifest($body['manifest'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write manifest']);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

$isBlogPayload = isset($body['manifest']) && is_array($body['manifest']) && isset($body['manifest']['posts']) && !isset($body['manifest']['documents']);
if ($isBlogPayload) {
    $filename = isset($body['filename']) ? basename((string)$body['filename']) : '';
    $content = $body['content'] ?? null;
    if (!preg_match('/^[a-zA-Z0-9_\\- ]+\\.md$/', $filename) || !is_string($content)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing or invalid filename/content']);
        exit;
    }
    if (!is_dir(POSTS_DIR)) mkdir(POSTS_DIR, 0755, true);
    if (file_put_contents(POSTS_DIR . $filename, $content) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write post']);
        exit;
    }
    if (isset($body['manifest']) && is_array($body['manifest'])) {
        write_blog_manifest($body['manifest']);
    }
    echo json_encode(['success' => true, 'filename' => $filename], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$filename = isset($body['filename']) ? safe_doc_path((string)$body['filename']) : null;
$content = $body['content'] ?? null;
if ($filename === null || !is_string($content)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid filename/content']);
    exit;
}

// Only ever writes into an ALREADY existing docs/ — never creates it from
// scratch. Reaching this fallback usually means the payload didn't match
// the blog shape (posts[] manifest); if that happened because a site was
// never actually meant to be a docs site, this fails loudly instead of
// quietly establishing docs/ and rerouting all future saves into it.
if (!is_dir(DOCS_DIR)) {
    http_response_code(409);
    echo json_encode(['error' => 'This site has no docs/ folder yet. If this should be a blog post, check the client is sending a posts[]-shaped manifest.']);
    exit;
}
$targetPath = DOCS_DIR . $filename;
$targetDir = dirname($targetPath);
if (!is_dir($targetDir)) mkdir($targetDir, 0755, true);
if (file_put_contents($targetPath, $content) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not write document']);
    exit;
}

if (isset($body['manifest']) && is_array($body['manifest'])) {
    write_manifest($body['manifest']);
}

echo json_encode(['success' => true, 'filename' => $filename], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/**
 * Returns .htaccess content that adds CORS headers for JSON files.
 * Needed so the Tauri/browser app can fetch manifest.json cross-origin.
 */
export function getHtaccessContent(): string {
  return `# ZenPost Blog — CORS für JSON und Markdown
<IfModule mod_headers.c>
  <FilesMatch "\\.(json|md)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
  </FilesMatch>
</IfModule>
`;
}

/**
 * Triggers a browser download of the PHP upload script (single file fallback).
 */
export function downloadPhpUploadScript(apiKey?: string, mode: PhpUploadMode = 'blog'): void {
  const content = getPhpUploadScript(apiKey, mode);
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zenpost-upload.php';
  a.click();
  URL.revokeObjectURL(url);
}
