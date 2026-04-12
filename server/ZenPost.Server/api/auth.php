<?php
// auth.php – Auth helper via user_sessions token

function require_auth($conn) {
    $headers = getallheaders();
    $token = $headers['X-Auth-Token'] ?? $headers['x-auth-token'] ?? null;
    if (!$token) {
        http_response_code(401);
        echo json_encode(["success"=>false,"message"=>"Missing auth token"]);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT user_id
        FROM user_sessions
        WHERE session_token = ?
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $res = $stmt->get_result();
    if (!$res || $res->num_rows === 0) {
        http_response_code(401);
        echo json_encode(["success"=>false,"message"=>"Invalid session"]);
        exit;
    }
    $row = $res->fetch_assoc();
    $stmt->close();
    return (int)$row['user_id'];
}
