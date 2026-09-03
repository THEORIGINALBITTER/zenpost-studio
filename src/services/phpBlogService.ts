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

export function getPhpUploadScript(apiKey = 'DEIN_GEHEIMER_KEY', mode: PhpUploadMode = 'blog'): string {
  const phpApiKey = apiKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  if (mode === 'docs' || mode === 'blog') {
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

function read_blog_manifest(): array {
    if (!file_exists(BLOG_MANIFEST_PATH)) {
        return ['site' => [], 'posts' => []];
    }
    $raw = file_get_contents(BLOG_MANIFEST_PATH);
    $json = json_decode((string)$raw, true);
    return is_array($json) ? $json : ['site' => [], 'posts' => []];
}

function write_manifest(array $manifest): bool {
    if (!is_dir(DOCS_DIR)) mkdir(DOCS_DIR, 0755, true);
    return file_put_contents(MANIFEST_PATH, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) !== false;
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
        if (docs_file_count() > 0 || file_exists(MANIFEST_PATH)) {
            echo json_encode(read_manifest(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            echo json_encode(read_blog_manifest(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
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
    if (isset($body['manifest']['posts']) && !isset($body['manifest']['documents']) && docs_file_count() === 0) {
        if (file_put_contents(BLOG_MANIFEST_PATH, json_encode($body['manifest'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
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

$isBlogPayload = isset($body['manifest']) && is_array($body['manifest']) && isset($body['manifest']['posts']) && !isset($body['manifest']['documents']) && docs_file_count() === 0;
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
        file_put_contents(BLOG_MANIFEST_PATH, json_encode($body['manifest'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
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

  return `<?php
/**
 * ZenPost Blog Upload Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * WICHTIG: Lade diese Datei direkt in dein Blog-Hauptverzeichnis hoch!
 *
 *   RICHTIG:  /zenpostapp/zenpost-upload.php       ← hier hochladen
 *   FALSCH:   /zenpostapp/php/zenpost-upload.php   ← NICHT in Unterordner!
 *
 * Die Posts werden automatisch in posts/ neben diesem Skript gespeichert:
 *   /zenpostapp/posts/mein-post.md
 *
 * Voraussetzungen: PHP 7.4+, Schreibrechte auf dem Server
 * ─────────────────────────────────────────────────────────────────────────────
 */

define('API_KEY', '${phpApiKey}');

// POSTS_DIR: Pfad zum posts/-Ordner.
// Standard: posts/ im selben Verzeichnis wie dieses Skript.
// Nur ändern wenn du eine andere Struktur willst.
define('POSTS_DIR', __DIR__ . '/posts/');
define('MANIFEST_PATH', __DIR__ . '/manifest.json');
define('ASSETS_DIR', __DIR__ . '/_assets/');

// ── CORS ────────────────────────────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── GET: Manifest oder einzelnen Post zurückgeben (kein Auth nötig) ─────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug !== '') {
        // Optional: Slug nur in sicherem Format erlauben
        if (!preg_match('/^[a-z0-9\\-_]+$/', $slug)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid slug']);
            exit;
        }

        $postPath = POSTS_DIR . $slug . '.md';
        if (!file_exists($postPath)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Post not found']);
            exit;
        }

        $markdown = file_get_contents($postPath);
        if ($markdown === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Could not read post']);
            exit;
        }

        $title = $slug;
        $subtitle = '';
        if (file_exists(MANIFEST_PATH)) {
            $manifestRaw = file_get_contents(MANIFEST_PATH);
            $manifest = json_decode((string)$manifestRaw, true);
            if (is_array($manifest) && isset($manifest['posts']) && is_array($manifest['posts'])) {
                foreach ($manifest['posts'] as $entry) {
                    if (is_array($entry) && (($entry['slug'] ?? '') === $slug)) {
                        $title = trim((string)($entry['title'] ?? $title));
                        $subtitle = trim((string)($entry['subtitle'] ?? ''));
                        break;
                    }
                }
            }
        }

        echo json_encode([
            'success' => true,
            'slug' => $slug,
            'title' => $title,
            'subtitle' => $subtitle,
            'markdown' => $markdown,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Default GET: manifest zurückgeben
    if (file_exists(MANIFEST_PATH)) {
        echo file_get_contents(MANIFEST_PATH);
    } else {
        echo json_encode(['site' => [], 'posts' => []]);
    }
    exit;
}

// ── Method check ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Auth ────────────────────────────────────────────────────────────────────
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ── Parse body ──────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON body']);
    exit;
}

// Optional fields for future integrations (currently informational):
// - thought: short thought/intent string from external apps
// - placeholder: { word, status, focus } visual placeholder hints
// They are accepted and can be stored inside manifest entries by the client.

// ── Image Upload ─────────────────────────────────────────────────────────────
if (isset($body['imageData'])) {
    $imageData = trim((string)($body['imageData'] ?? ''));
    $fileName  = trim((string)($body['fileName']  ?? ''));

    if (!preg_match('/^data:image\\/(png|jpe?g|webp|gif);base64,(.+)$/i', $imageData, $im)) {
        http_response_code(422);
        echo json_encode(['error' => 'Invalid image data (only png/jpg/webp/gif)']);
        exit;
    }
    $ext    = strtolower($im[1] === 'jpeg' ? 'jpg' : $im[1]);
    $binary = base64_decode(preg_replace('/\\s+/', '', $im[2]), true);
    if ($binary === false) {
        http_response_code(422);
        echo json_encode(['error' => 'Base64 decode failed']);
        exit;
    }
    $safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $fileName);
    $safeName = trim($safeName, '-_.');
    if ($safeName === '') { $safeName = 'cover-' . gmdate('Ymd-His'); }
    if (!preg_match('/\\.(png|jpe?g|webp|gif)$/i', $safeName)) { $safeName .= '.' . $ext; }

    if (!is_dir(ASSETS_DIR)) { mkdir(ASSETS_DIR, 0755, true); }
    $targetPath = ASSETS_DIR . $safeName;
    if (file_exists($targetPath)) {
        $safeName   = pathinfo($safeName, PATHINFO_FILENAME) . '-' . gmdate('His') . '.' . $ext;
        $targetPath = ASSETS_DIR . $safeName;
    }
    if (@file_put_contents($targetPath, $binary) === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write image file']);
        exit;
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? '';
    $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
    $url = ($host !== '' ? $scheme . '://' . $host : '') . $scriptDir . '/_assets/' . rawurlencode($safeName);
    echo json_encode(['success' => true, 'url' => $url, 'fileName' => $safeName]);
    exit;
}

// ── Delete post files that dropped out of the manifest ──────────────────────
function zenpost_delete_removed_posts(array $newManifest): void {
    if (!file_exists(MANIFEST_PATH)) return;
    $raw = file_get_contents(MANIFEST_PATH);
    $old = json_decode((string)$raw, true);
    if (!is_array($old) || !isset($old['posts']) || !is_array($old['posts'])) return;

    $newSlugs = [];
    foreach (($newManifest['posts'] ?? []) as $post) {
        if (isset($post['slug'])) $newSlugs[$post['slug']] = true;
    }

    foreach ($old['posts'] as $post) {
        $slug = $post['slug'] ?? null;
        if (!$slug || isset($newSlugs[$slug])) continue;
        if (!preg_match('/^[a-z0-9\\-_]+$/', $slug)) continue;
        $postPath = POSTS_DIR . $slug . '.md';
        if (file_exists($postPath)) unlink($postPath);
    }
}

// ── Manifest-only update (e.g. post deletion) ───────────────────────────────
if (!isset($body['filename']) && !isset($body['content']) && isset($body['manifest'])) {
    zenpost_delete_removed_posts($body['manifest']);
    file_put_contents(MANIFEST_PATH, json_encode($body['manifest'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

$filename = $body['filename'] ?? null;
$content  = $body['content']  ?? null;

if (!$filename || !$content) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing filename or content']);
    exit;
}

// ── Sanitize filename ───────────────────────────────────────────────────────
$filename = basename($filename);
if (!preg_match('/^[a-z0-9\\-_]+\\.md$/', $filename)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid filename (only lowercase letters, numbers, hyphens allowed)']);
    exit;
}

// ── Save post ───────────────────────────────────────────────────────────────
if (!is_dir(POSTS_DIR)) {
    mkdir(POSTS_DIR, 0755, true);
}

if (file_put_contents(POSTS_DIR . $filename, $content) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not write file (check server permissions)']);
    exit;
}

// ── Update manifest.json (optional) ─────────────────────────────────────────
if (isset($body['manifest'])) {
    zenpost_delete_removed_posts($body['manifest']);
    file_put_contents(MANIFEST_PATH, json_encode($body['manifest'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

echo json_encode(['success' => true, 'filename' => $filename]);
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
