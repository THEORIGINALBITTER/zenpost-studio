<?php
// save_articles_zenpost.php
// Nimmt ZenPost JSON entgegen und schreibt/updatet in Articles per Slug

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
    echo json_encode(["success" => false, "message" => "config.php fehlt. Bitte setup.php ausfuehren."]);
    exit;
}
$config = require $configPath;

$dbHost = trim((string)($config['db_host'] ?? ''));
$dbName = trim((string)($config['db_name'] ?? ''));
$dbUser = trim((string)($config['db_user'] ?? ''));
$dbPass = (string)($config['db_pass'] ?? '');

if ($dbHost === '' || $dbName === '' || $dbUser === '') {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Config unvollstaendig. setup.php ausfuehren."]);
    exit;
}

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Fehler: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

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

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Ungueltiges JSON"]);
    exit;
}

$slug = trim($input['slug'] ?? '');
$title = trim($input['title'] ?? '');
$subtitle = trim($input['subtitle'] ?? '');
$publishDate = trim($input['date'] ?? ($input['publishDate'] ?? date('Y-m-d')));
$imageUrl = trim($input['image'] ?? ($input['imageUrl'] ?? ''));

if ($slug === '' || $title === '') {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Slug und Title sind erforderlich."]);
    exit;
}

// Content normalisieren:
// 1) Wenn blocks kommt -> {"blocks":[...]}
// 2) Sonst markdown/text als {"format":"markdown","content":"..."}
$contentJson = '';
if (isset($input['blocks']) && is_array($input['blocks'])) {
    $contentJson = json_encode(["blocks" => $input['blocks']], JSON_UNESCAPED_UNICODE);
} else {
    $contentText = trim($input['content'] ?? '');
    $contentJson = json_encode(
        ["format" => "markdown", "content" => $contentText],
        JSON_UNESCAPED_UNICODE
    );
}

$stmtCheck = $conn->prepare("SELECT Id FROM Articles WHERE Slug = ?");
if (!$stmtCheck) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
    exit;
}
$stmtCheck->bind_param("s", $slug);
$stmtCheck->execute();
$resultCheck = $stmtCheck->get_result();

if ($resultCheck && $resultCheck->num_rows > 0) {
    $stmt = $conn->prepare("
        UPDATE Articles
        SET Title = ?, Subtitle = ?, PublishDate = ?, ImageUrl = ?, Content = ?, UpdatedAt = CURRENT_TIMESTAMP
        WHERE Slug = ?
    ");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit;
    }
    $stmt->bind_param("ssssss", $title, $subtitle, $publishDate, $imageUrl, $contentJson, $slug);
    $ok = $stmt->execute();
    if ($ok) {
        echo json_encode(["success" => true, "mode" => "update", "message" => "Artikel aktualisiert."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Update fehlgeschlagen: " . $stmt->error]);
    }
} else {
    $stmt = $conn->prepare("
        INSERT INTO Articles (Slug, Title, Subtitle, PublishDate, ImageUrl, Content)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Prepare failed: " . $conn->error]);
        exit;
    }
    $stmt->bind_param("ssssss", $slug, $title, $subtitle, $publishDate, $imageUrl, $contentJson);
    $ok = $stmt->execute();
    if ($ok) {
        echo json_encode(["success" => true, "mode" => "insert", "message" => "Artikel gespeichert."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Insert fehlgeschlagen: " . $stmt->error]);
    }
}

$stmt->close();
$stmtCheck->close();
$conn->close();

