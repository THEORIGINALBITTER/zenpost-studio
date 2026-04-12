<?php
require_once __DIR__ . '/oauth_helpers.php';

if (GOOGLE_CLIENT_ID === '' || GOOGLE_CLIENT_SECRET === '') {
    http_response_code(500);
    echo 'Google SSO nicht konfiguriert.';
    exit;
}

session_start();
$state = $_GET['state'] ?? '';
if (!$state || $state !== ($_SESSION['google_oauth_state'] ?? '')) {
    http_response_code(400);
    echo 'Ungültiger State.';
    exit;
}
$code = $_GET['code'] ?? '';
if (!$code) {
    http_response_code(400);
    echo 'Code fehlt.';
    exit;
}

$redirectUri = OAUTH_BASE_URL . '/oauth_google_callback.php';

$tokenUrl = 'https://oauth2.googleapis.com/token';
$postData = http_build_query([
    'code' => $code,
    'client_id' => GOOGLE_CLIENT_ID,
    'client_secret' => GOOGLE_CLIENT_SECRET,
    'redirect_uri' => $redirectUri,
    'grant_type' => 'authorization_code',
]);

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$tokenRes = curl_exec($ch);
$tokenJson = json_decode($tokenRes ?? '', true);
$accessToken = $tokenJson['access_token'] ?? '';
if (!$accessToken) {
    http_response_code(400);
    echo 'Token Fehler.';
    exit;
}

// Fetch user info
$ch = curl_init('https://www.googleapis.com/oauth2/v2/userinfo');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$userRes = curl_exec($ch);
$userJson = json_decode($userRes ?? '', true);
$email = $userJson['email'] ?? '';
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
