<?php
require_once __DIR__ . '/oauth_config.php';

if (MICROSOFT_CLIENT_ID === '' || MICROSOFT_CLIENT_SECRET === '') {
    http_response_code(500);
    echo 'Microsoft SSO nicht konfiguriert.';
    exit;
}

session_start();
$state = bin2hex(random_bytes(16));
$_SESSION['ms_oauth_state'] = $state;
if (isset($_GET['return_url'])) {
    $_SESSION['oauth_return_url'] = $_GET['return_url'];
}

$redirectUri = OAUTH_BASE_URL . '/oauth_microsoft_callback.php';
$scope = urlencode('openid email profile');
$authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
  . '?response_type=code'
  . '&client_id=' . urlencode(MICROSOFT_CLIENT_ID)
  . '&redirect_uri=' . urlencode($redirectUri)
  . '&scope=' . $scope
  . '&state=' . urlencode($state);

header('Location: ' . $authUrl);
exit;
