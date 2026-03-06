<?php
// upload_image.php
// Erwartet JSON:
// {
//   "imageData": "data:image/png;base64,...",
//   "fileName": "optional-name.png"
// }
// Antwort:
// { "success": true, "url": "https://domain.de/images/zenpoststudio/datei.png", ... }

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
header("Content-Type: application/json; charset=utf-8");

$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "config.php fehlt. setup.php ausfuehren."]);
    exit;
}
$config = require $configPath;

// Optional API-Key Auth (Advanced Mode)
$apiKeyEnabled = !empty($config['api_key_enabled']);
$expectedApiKey = trim((string)($config['api_key'] ?? ''));
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = null;
if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    $token = trim($matches[1]);
}
if ($apiKeyEnabled) {
    if ($expectedApiKey === '' || $token !== $expectedApiKey) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized"]);
        exit;
    }
}

// Upload-Ziel:
// .../api/zenpost/upload_image.php -> .../images/zenpoststudio/
$targetDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'zenpoststudio';
if (!is_dir($targetDir)) {
    @mkdir($targetDir, 0775, true);
}
if (!is_dir($targetDir) || !is_writable($targetDir)) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Upload-Verzeichnis nicht beschreibbar: " . $targetDir]);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Ungueltiges JSON"]);
    exit;
}

$imageData = trim((string)($input['imageData'] ?? ''));
$fileName = trim((string)($input['fileName'] ?? ''));

if ($imageData === '' || strpos($imageData, 'data:image/') !== 0) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "imageData (data:image...) fehlt."]);
    exit;
}

if (!preg_match('/^data:image\/(png|jpe?g|webp|gif|bmp|svg\+xml);base64,(.+)$/i', $imageData, $m)) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Nur Bild-DataURLs (base64) erlaubt."]);
    exit;
}

$mimeSub = strtolower($m[1]);
$base64Payload = preg_replace('/\s+/', '', $m[2]);
$binary = base64_decode($base64Payload, true);
if ($binary === false) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Base64 Dekodierung fehlgeschlagen."]);
    exit;
}

$ext = $mimeSub;
if ($ext === 'jpeg') $ext = 'jpg';
if ($ext === 'svg+xml') $ext = 'svg';

$safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $fileName);
$safeName = trim((string)$safeName, '-_.');
if ($safeName === '') {
    $safeName = 'zenpost-image-' . gmdate('Ymd-His');
}
if (!preg_match('/\.[a-z0-9]+$/i', $safeName)) {
    $safeName .= '.' . $ext;
}

$targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;
if (file_exists($targetPath)) {
    $nameOnly = pathinfo($safeName, PATHINFO_FILENAME);
    $safeName = $nameOnly . '-' . gmdate('His') . '.' . $ext;
    $targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;
}

if (@file_put_contents($targetPath, $binary) === false) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Datei konnte nicht geschrieben werden."]);
    exit;
}

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? '';
$relativeUrl = '/images/zenpoststudio/' . rawurlencode($safeName);
$publicBase = trim((string)($config['image_public_base'] ?? ''));

if ($publicBase !== '') {
    $publicBase = rtrim($publicBase, '/');
    if (!preg_match('/^https?:\/\//i', $publicBase)) {
        $publicBase = $scheme . '://' . ltrim($publicBase, '/');
    }
    $url = $publicBase . $relativeUrl;
} else if ($host !== '') {
    $url = $scheme . '://' . $host . $relativeUrl;
} else {
    $url = $relativeUrl;
}

echo json_encode([
    "success" => true,
    "fileName" => $safeName,
    "path" => $targetPath,
    "url" => $url,
]);

