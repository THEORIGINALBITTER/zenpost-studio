<?php
require_once __DIR__ . '/oauth_config.php';

if (APPLE_CLIENT_ID === '' || APPLE_TEAM_ID === '' || APPLE_KEY_ID === '' || APPLE_PRIVATE_KEY === '') {
    http_response_code(500);
    echo 'Apple SSO nicht konfiguriert.';
    exit;
}

session_start();
$state = bin2hex(random_bytes(16));
$_SESSION['apple_oauth_state'] = $state;
if (isset($_GET['return_url'])) {
    $_SESSION['oauth_return_url'] = $_GET['return_url'];
}
if (isset($_GET['session_key'])) {
    $_SESSION['sso_session_key'] = preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['session_key']);
}

$redirectUri = OAUTH_BASE_URL . '/oauth_apple_callback.php';
$scope = urlencode('name email');
$authUrl = 'https://appleid.apple.com/auth/authorize'
  . '?response_type=code'
  . '&client_id=' . urlencode(APPLE_CLIENT_ID)
  . '&redirect_uri=' . urlencode($redirectUri)
  . '&scope=' . $scope
  . '&response_mode=form_post'
  . '&state=' . urlencode($state);

header('Location: ' . $authUrl);
exit;
