<?php
require_once __DIR__ . '/db_zenpost.php';
require_once __DIR__ . '/oauth_config.php';

function oauth_create_or_get_user(mysqli $conn, string $email): int {
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        return (int)$row['id'];
    }
    $random = bin2hex(random_bytes(16));
    $hash = password_hash($random, PASSWORD_DEFAULT);
    $stmt2 = $conn->prepare("INSERT INTO users (email, password_hash, must_change) VALUES (?, ?, 0)");
    $stmt2->bind_param("ss", $email, $hash);
    $stmt2->execute();
    return (int)$stmt2->insert_id;
}

function oauth_create_session(mysqli $conn, int $userId): string {
    $token = bin2hex(random_bytes(16));
    $stmt = $conn->prepare("INSERT INTO user_sessions (user_id, session_token, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("is", $userId, $token);
    $stmt->execute();
    return $token;
}

function oauth_sanitize_return_url(?string $url): ?string {
    if (!$url) return null;
    $url = trim($url);
    if ($url === '') return null;
    if (str_starts_with($url, 'http://localhost:') || str_starts_with($url, 'http://127.0.0.1:')) {
        return $url;
    }
    if (str_starts_with($url, 'https://denisbitter.de')) return $url;
    if (str_starts_with($url, 'https://zenpost.denisbitter.de')) return $url;
    return null;
}

function oauth_finish_redirect(string $token, string $email, ?string $returnUrl = null, ?string $sessionKey = null): void {
    // Desktop-App polling: Token in DB speichern damit die App ihn abholen kann
    if ($sessionKey) {
        global $conn;
        $conn->query("CREATE TABLE IF NOT EXISTS zenpost_sso_sessions (
            session_key VARCHAR(64) NOT NULL PRIMARY KEY,
            token VARCHAR(128) NOT NULL,
            email VARCHAR(255) NOT NULL,
            consumed TINYINT(1) DEFAULT 0,
            created_at DATETIME NOT NULL
        )");
        $stmt = $conn->prepare("INSERT INTO zenpost_sso_sessions (session_key, token, email, created_at)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE token=VALUES(token), email=VALUES(email), consumed=0, created_at=NOW()");
        $stmt->bind_param("sss", $sessionKey, $token, $email);
        $stmt->execute();
    }
    $safeReturn = oauth_sanitize_return_url($returnUrl);
    // Token nie als GET-Parameter übergeben — Session verwenden
    if (session_status() === PHP_SESSION_NONE) session_start();
    $_SESSION['zenpost_sso_token'] = $token;
    $_SESSION['zenpost_sso_email'] = $email;
    $_SESSION['zenpost_sso_return'] = $safeReturn;
    $url = OAUTH_BASE_URL . '/oauth_finish.php';
    header('Location: ' . $url);
    exit;
}
