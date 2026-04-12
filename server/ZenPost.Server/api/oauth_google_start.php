<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/oauth_config.php';

if (GOOGLE_CLIENT_ID === '' || GOOGLE_CLIENT_SECRET === '') {
    http_response_code(500);
    echo 'Google SSO nicht konfiguriert.';
    exit;
}

session_start();
$state = bin2hex(random_bytes(16));
$_SESSION['google_oauth_state'] = $state;
if (isset($_GET['return_url'])) {
    $_SESSION['oauth_return_url'] = $_GET['return_url'];
}
if (isset($_GET['session_key'])) {
    $_SESSION['sso_session_key'] = preg_replace('/[^a-zA-Z0-9\-]/', '', $_GET['session_key']);
}

$redirectUri = OAUTH_BASE_URL . '/oauth_google_callback.php';
$scope = urlencode('openid email profile');
$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  . '?response_type=code'
  . '&client_id=' . urlencode(GOOGLE_CLIENT_ID)
  . '&redirect_uri=' . urlencode($redirectUri)
  . '&scope=' . $scope
  . '&state=' . urlencode($state)
  . '&access_type=offline'
  . '&prompt=consent';

header('Location: ' . $authUrl);
exit;
