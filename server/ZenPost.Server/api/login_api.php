<?php
// login_api.php – Auth per E-Mail + Passwort (stage02)

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

$email    = trim($input['email']);
$password = $input['password'];

$stmt = $conn->prepare("SELECT id, password_hash FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
if (!$res || $res->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["success"=>false,"message"=>"E-Mail nicht gefunden."]);
    exit;
}
$user = $res->fetch_assoc();

if (!password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(["success"=>false,"message"=>"Passwort falsch."]);
    exit;
}

$token = bin2hex(random_bytes(16));
$stmt2 = $conn->prepare("INSERT INTO user_sessions (user_id, session_token, created_at) VALUES (?, ?, NOW())");
$stmt2->bind_param("is", $user['id'], $token);
$stmt2->execute();

echo json_encode([
    "success"=>true,
    "userId"=>(int)$user['id'],
    "token"=>$token
], JSON_UNESCAPED_UNICODE);
