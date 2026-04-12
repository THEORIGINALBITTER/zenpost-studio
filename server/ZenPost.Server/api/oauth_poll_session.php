<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/db_zenpost.php';

$sessionKey = preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['session_key'] ?? '');
if (!$sessionKey) {
    echo json_encode(["success" => false]);
    exit;
}

$stmt = $conn->prepare("
    SELECT token, email, consumed
    FROM zenpost_sso_sessions
    WHERE session_key = ?
      AND consumed = 0
      AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
");
$stmt->bind_param("s", $sessionKey);
$stmt->execute();
$res = $stmt->get_result();

if (!$res || $res->num_rows === 0) {
    echo json_encode(["success" => false]);
    exit;
}

$row = $res->fetch_assoc();

// Als verbraucht markieren — Token wird nur einmal ausgegeben
$upd = $conn->prepare("UPDATE zenpost_sso_sessions SET consumed = 1 WHERE session_key = ?");
$upd->bind_param("s", $sessionKey);
$upd->execute();

echo json_encode([
    "success" => true,
    "token"   => $row['token'],
    "email"   => $row['email'],
], JSON_UNESCAPED_UNICODE);
