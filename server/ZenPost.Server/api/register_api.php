<?php
// register_api.php – Registrierung per E-Mail + Passwort (stage02)

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/db_zenpost.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['email']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(["success"=>false,"message"=>"Bitte E-Mail und Passwort angeben."]);
    exit;
}

$email = trim($input['email']);
$password = $input['password'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(["success"=>false,"message"=>"Ungültige E-Mail-Adresse."]);
    exit;
}

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
if ($res && $res->num_rows > 0) {
    http_response_code(409);
    echo json_encode(["success"=>false,"message"=>"E-Mail bereits registriert."]);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt2 = $conn->prepare("INSERT INTO users (email, password_hash, must_change) VALUES (?, ?, 0)");
$stmt2->bind_param("ss", $email, $hash);
$stmt2->execute();
$userId = $stmt2->insert_id;

$token = bin2hex(random_bytes(16));
$stmt3 = $conn->prepare("INSERT INTO user_sessions (user_id, session_token, created_at) VALUES (?, ?, NOW())");
$stmt3->bind_param("is", $userId, $token);
$stmt3->execute();

echo json_encode([
    "success"=>true,
    "userId"=>(int)$userId,
    "token"=>$token
], JSON_UNESCAPED_UNICODE);
