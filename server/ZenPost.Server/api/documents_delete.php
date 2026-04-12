<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/auth.php';
$userId = require_auth($conn);

$input = json_decode(file_get_contents('php://input'), true);
$id = (int)($input['id'] ?? 0);
if ($id <= 0) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"id fehlt"]); exit; }

$stmt = $conn->prepare("DELETE FROM zenpost_documents WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $id, $userId);
$stmt->execute();

echo json_encode(["success"=>true]);
