<?php
require_once __DIR__ . '/api_bootstrap.php';
zenpost_apply_cors('GET, OPTIONS', 'Content-Type, X-Auth-Token');
zenpost_json_response_header();

// Proxies LinkedIn's /v2/me and /v2/userinfo for the web build, which cannot
// call api.linkedin.com directly from the browser (LinkedIn does not send
// CORS headers, so the preflight fails with 401 before the real request is
// ever sent). Desktop (Tauri) calls LinkedIn directly and never hits this.
//
// Uses X-Auth-Token instead of Authorization — this server's Apache/PHP-FPM
// setup strips the Authorization header before PHP sees it (same reason the
// other endpoints in this folder use X-Auth-Token, see image_download.php).
$accessToken = trim($_SERVER['HTTP_X_AUTH_TOKEN'] ?? '');
if (!$accessToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing X-Auth-Token header']);
    exit;
}

function linkedin_get(string $url, string $accessToken): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$status, $body];
}

[$status, $body] = linkedin_get('https://api.linkedin.com/v2/me', $accessToken);
$data = json_decode($body ?? '', true);
if ($status === 200 && !empty($data['id'])) {
    http_response_code(200);
    echo json_encode(['id' => $data['id']]);
    exit;
}

[$status, $body] = linkedin_get('https://api.linkedin.com/v2/userinfo', $accessToken);
$data = json_decode($body ?? '', true);
if ($status === 200 && !empty($data['sub'])) {
    http_response_code(200);
    echo json_encode(['sub' => $data['sub']]);
    exit;
}

http_response_code(502);
echo json_encode(['error' => 'LinkedIn Member-ID nicht gefunden. Fehlt evtl. das r_liteprofile oder openid Scope?']);
