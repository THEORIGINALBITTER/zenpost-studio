<?php
require_once __DIR__ . '/oauth_helpers.php';

if (MICROSOFT_CLIENT_ID === '' || MICROSOFT_CLIENT_SECRET === '') {
    http_response_code(500);
    echo 'Microsoft SSO nicht konfiguriert.';
    exit;
}

session_start();
$state = $_GET['state'] ?? '';
if (!$state || $state !== ($_SESSION['ms_oauth_state'] ?? '')) {
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

$redirectUri = OAUTH_BASE_URL . '/oauth_microsoft_callback.php';

$tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
$postData = http_build_query([
    'client_id' => MICROSOFT_CLIENT_ID,
    'client_secret' => MICROSOFT_CLIENT_SECRET,
    'code' => $code,
    'redirect_uri' => $redirectUri,
    'grant_type' => 'authorization_code',
    'scope' => 'openid email profile',
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

$ch = curl_init('https://graph.microsoft.com/oidc/userinfo');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$userRes = curl_exec($ch);
$userJson = json_decode($userRes ?? '', true);
$email = $userJson['email'] ?? $userJson['preferred_username'] ?? '';
if (!$email) {
    http_response_code(400);
    echo 'Keine E-Mail erhalten.';
    exit;
}

$userId = oauth_create_or_get_user($conn, $email);
$token = oauth_create_session($conn, $userId);
$returnUrl = $_SESSION['oauth_return_url'] ?? null;
oauth_finish_redirect($token, $email, $returnUrl);
