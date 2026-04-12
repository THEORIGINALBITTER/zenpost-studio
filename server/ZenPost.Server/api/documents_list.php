<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$projectId = (int)($_GET['projectId'] ?? 0);
if ($projectId <= 0) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"projectId fehlt"]); exit; }

$stmt = $conn->prepare("
  SELECT id, file_name, mime_type, size_bytes, created_at
  FROM zenpost_documents
  WHERE project_id = ? AND user_id = ?
  ORDER BY created_at DESC
");
$stmt->bind_param("ii", $projectId, $userId);
$stmt->execute();
$res = $stmt->get_result();

$docs = [];
while ($row = $res->fetch_assoc()) {
  $docs[] = $row;
}
echo json_encode(["success"=>true, "documents"=>$docs], JSON_UNESCAPED_UNICODE);
