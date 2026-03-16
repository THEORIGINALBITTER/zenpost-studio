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
