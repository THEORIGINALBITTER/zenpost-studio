<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"id fehlt"]); exit; }

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
  UPDATE zenpost_documents
  SET file_name=?, mime_type=?, size_bytes=?, data=?, updated_at=NOW()
  WHERE id=? AND user_id=?
");
$stmt->bind_param("ssibii", $name, $mime, $size, $data, $id, $userId);
$stmt->send_long_data(3, $data);
$stmt->execute();

if ($stmt->affected_rows === 0) {
  http_response_code(404);
  echo json_encode(["success"=>false,"message"=>"Dokument nicht gefunden"]);
  exit;
}

echo json_encode(["success"=>true, "id"=>$id], JSON_UNESCAPED_UNICODE);
