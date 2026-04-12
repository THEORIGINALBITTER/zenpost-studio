<?php
require_once __DIR__ . '/oauth_helpers.php';
require_once __DIR__ . '/oauth_apple_helpers.php';

session_start();
$state = $_POST['state'] ?? '';
if (!$state || $state !== ($_SESSION['apple_oauth_state'] ?? '')) {
    http_response_code(400);
    echo 'Ungültiger State.';
    exit;
}

$code = $_POST['code'] ?? '';
if (!$code) {
    http_response_code(400);
    echo 'Code fehlt.';
    exit;
}

$redirectUri = OAUTH_BASE_URL . '/oauth_apple_callback.php';
$clientSecret = apple_create_client_secret();

$tokenUrl = 'https://appleid.apple.com/auth/token';
$postData = http_build_query([
    'client_id' => APPLE_CLIENT_ID,
    'client_secret' => $clientSecret,
    'code' => $code,
    'grant_type' => 'authorization_code',
    'redirect_uri' => $redirectUri,
]);

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$tokenRes = curl_exec($ch);
$tokenJson = json_decode($tokenRes ?? '', true);
$idToken = $tokenJson['id_token'] ?? '';
if (!$idToken) {
    http_response_code(400);
    echo 'Token Fehler.';
    exit;
}

// Decode JWT payload (no signature verification here)
$parts = explode('.', $idToken);
$payload = $parts[1] ?? '';
$payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
$payload = strtr($payload, '-_', '+/');
$payloadJson = json_decode(base64_decode($payload) ?: '', true);
$email = $payloadJson['email'] ?? '';

if (!$email) {
    http_response_code(400);
    echo 'Keine E-Mail erhalten.';
    exit;
}

$userId = oauth_create_or_get_user($conn, $email);
$token = oauth_create_session($conn, $userId);
$returnUrl = $_SESSION['oauth_return_url'] ?? null;
$sessionKey = $_SESSION['sso_session_key'] ?? null;
oauth_finish_redirect($token, $email, $returnUrl, $sessionKey);
