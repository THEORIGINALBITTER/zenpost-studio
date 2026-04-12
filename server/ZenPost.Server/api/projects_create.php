<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? 'Mein Projekt');
if ($name === '') $name = 'Mein Projekt';

$stmt = $conn->prepare("
  INSERT INTO zenpost_project (user_id, name, created_at, updated_at)
  VALUES (?, ?, NOW(), NOW())
");
$stmt->bind_param("is", $userId, $name);
$stmt->execute();

echo json_encode([
  "success"=>true,
  "id"=>$stmt->insert_id,
  "name"=>$name
], JSON_UNESCAPED_UNICODE);
