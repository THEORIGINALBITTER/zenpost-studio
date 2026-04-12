<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$id = intval($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); exit; }

$stmt = $conn->prepare("
  SELECT file_name, mime_type, data
  FROM zenpost_documents
  WHERE id = ? AND user_id = ?
");
$stmt->bind_param("ii", $id, $userId);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) { http_response_code(404); exit; }

$row = $res->fetch_assoc();
header("Content-Type: " . $row['mime_type']);
header("Content-Disposition: attachment; filename=\"" . $row['file_name'] . "\"");
echo $row['data'];
