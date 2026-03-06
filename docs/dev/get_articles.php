<?php
/**
 * get_articles.php
 * ZenPost Studio – Server Article List/Detail Endpoint
 *
 * GET /get_articles.php         → returns JSON array of all articles (metadata only)
 * GET /get_articles.php?slug=xx → returns JSON object with full article incl. blocks
 *
 * Adjust $storageDir to match the directory where save_articles.php writes its JSON files.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Configuration ──────────────────────────────────────────────────────────────
// Same directory that save_articles.php uses to store article JSON files.
$storageDir = __DIR__ . '/articles';

// Optional: require API key (same as save_articles.php)
$requiredApiKey = ''; // Leave empty to disable auth check

// ── Auth ───────────────────────────────────────────────────────────────────────
if ($requiredApiKey !== '') {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $providedKey = '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        $providedKey = trim($m[1]);
    }
    if ($providedKey !== $requiredApiKey) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

// ── Storage check ──────────────────────────────────────────────────────────────
if (!is_dir($storageDir)) {
    http_response_code(404);
    echo json_encode(['error' => 'Storage directory not found']);
    exit;
}

// ── Single article (slug parameter) ───────────────────────────────────────────
$slug = isset($_GET['slug']) ? preg_replace('/[^a-z0-9\-_]/', '', strtolower($_GET['slug'])) : '';

if ($slug !== '') {
    $file = $storageDir . '/' . $slug . '.json';
    if (!file_exists($file)) {
        http_response_code(404);
        echo json_encode(['error' => 'Article not found']);
        exit;
    }
    $data = json_decode(file_get_contents($file), true);
    echo json_encode($data);
    exit;
}

// ── Article list (metadata only, no blocks) ────────────────────────────────────
$articles = [];
foreach (glob($storageDir . '/*.json') as $file) {
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) continue;
    $articles[] = [
        'slug'     => $data['slug']     ?? basename($file, '.json'),
        'title'    => $data['title']    ?? '',
        'subtitle' => $data['subtitle'] ?? '',
        'date'     => $data['date']     ?? '',
        'image'    => $data['image']    ?? '',
    ];
}

// Sort newest first
usort($articles, fn($a, $b) => strcmp($b['date'], $a['date']));

echo json_encode($articles);
