<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$stmt = $conn->prepare("
  SELECT id, name, created_at, updated_at
  FROM zenpost_project
  WHERE user_id = ?
  ORDER BY updated_at DESC
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();

$projects = [];
while ($row = $res->fetch_assoc()) {
  $projects[] = $row;
}

echo json_encode(["success"=>true, "projects"=>$projects], JSON_UNESCAPED_UNICODE);
