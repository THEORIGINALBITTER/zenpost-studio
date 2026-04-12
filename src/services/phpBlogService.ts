/**
 * PHP Blog Upload Service
 * Uploads blog posts via HTTP POST to a user-deployed PHP script.
 * Works in both Web and Desktop (Tauri).
 */

export interface PhpBlogConfig {
  apiUrl: string;   // e.g. https://myserver.de/zenpost/upload.php
  apiKey: string;   // secret key matching the PHP script
}

export interface PhpBlogUploadPayload {
  filename: string;           // e.g. 2026-03-16-my-post.md
  content: string;            // full markdown content with frontmatter
  manifest?: unknown;         // updated manifest.json content (optional)
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
    const response = await fetch(config.apiUrl, {
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
    const response = await fetch(config.apiUrl, {
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
    const response = await fetch(config.apiUrl, {
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
export function getPhpUploadScript(apiKey = 'DEIN_GEHEIMER_KEY'): string {
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

define('API_KEY', '${apiKey}');

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

// ── GET: manifest.json zurückgeben (kein Auth nötig — öffentliche Daten) ────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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

// ── Manifest-only update (e.g. post deletion) ───────────────────────────────
if (!isset($body['filename']) && !isset($body['content']) && isset($body['manifest'])) {
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
export function downloadPhpUploadScript(apiKey?: string): void {
  const content = getPhpUploadScript(apiKey);
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zenpost-upload.php';
  a.click();
  URL.revokeObjectURL(url);
}
