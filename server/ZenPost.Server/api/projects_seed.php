<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

// Wenn User schon Projekte hat, gib das erste zurück
$stmt = $conn->prepare("
  SELECT id, name, created_at, updated_at
  FROM zenpost_project
  WHERE user_id = ?
  ORDER BY created_at ASC
  LIMIT 1
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
  $row = $res->fetch_assoc();
  echo json_encode(["success"=>true, "project"=>$row], JSON_UNESCAPED_UNICODE);
  exit;
}

// Ansonsten ein neues Projekt anlegen
$name = "Mein erstes Projekt";
$stmt2 = $conn->prepare("
  INSERT INTO zenpost_project (user_id, name, created_at, updated_at)
  VALUES (?, ?, NOW(), NOW())
");
$stmt2->bind_param("is", $userId, $name);
$stmt2->execute();

echo json_encode([
  "success"=>true,
  "project"=>[
    "id"=>$stmt2->insert_id,
    "name"=>$name
  ]
], JSON_UNESCAPED_UNICODE);
