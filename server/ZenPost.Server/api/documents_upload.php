<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$projectId = intval($_POST['projectId'] ?? 0);
if ($projectId <= 0) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"projectId fehlt"]); exit; }

if (!isset($_FILES['file'])) {
  http_response_code(400);
  echo json_encode(["success"=>false,"message"=>"Datei fehlt"]);
  exit;
}

$file = $_FILES['file'];
$mime = mime_content_type($file['tmp_name']);
$size = filesize($file['tmp_name']);
$name = $file['name'];

if ($size > 50 * 1024 * 1024) {
  http_response_code(400);
  echo json_encode(["success"=>false,"message"=>"Datei zu groß"]);
  exit;
}

$data = file_get_contents($file['tmp_name']);

$stmt = $conn->prepare("
  INSERT INTO zenpost_documents (project_id, user_id, file_name, mime_type, size_bytes, data, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
");
$stmt->bind_param("iissib", $projectId, $userId, $name, $mime, $size, $data);
$stmt->send_long_data(5, $data);
$stmt->execute();

echo json_encode([
  "success"=>true,
  "id"=>$stmt->insert_id,
  "fileName"=>$name,
  "mimeType"=>$mime,
  "sizeBytes"=>$size
], JSON_UNESCAPED_UNICODE);
