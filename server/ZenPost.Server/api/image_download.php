<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/db_zenpost.php';

// Token aus URL-Parameter (für <img src> Verwendung wo keine Custom-Header möglich sind)
$token = trim($_GET['token'] ?? '');
if (!$token) { http_response_code(401); exit; }

// Token validieren
$stmt = $conn->prepare("SELECT user_id FROM user_sessions WHERE session_token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) { http_response_code(401); exit; }
$row = $res->fetch_assoc();
$userId = (int)$row['user_id'];

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); exit; }

$stmt2 = $conn->prepare("
  SELECT file_name, mime_type, data
  FROM zenpost_documents
  WHERE id = ? AND user_id = ?
");
$stmt2->bind_param("ii", $id, $userId);
$stmt2->execute();
$res2 = $stmt2->get_result();
if ($res2->num_rows === 0) { http_response_code(404); exit; }

$doc = $res2->fetch_assoc();

// Nur Bilder erlauben
if (!str_starts_with($doc['mime_type'], 'image/')) { http_response_code(403); exit; }

header("Content-Type: " . $doc['mime_type']);
header("Cache-Control: private, max-age=3600");
echo $doc['data'];
