<?php
if (session_status() === PHP_SESSION_NONE) session_start();
$token = $_SESSION['zenpost_sso_token'] ?? '';
$email = $_SESSION['zenpost_sso_email'] ?? '';
$returnUrl = $_SESSION['zenpost_sso_return'] ?? '';
// Session-Daten sofort löschen — Token darf nur einmal gelesen werden
unset($_SESSION['zenpost_sso_token'], $_SESSION['zenpost_sso_email'], $_SESSION['zenpost_sso_return']);
if (!$token) {
    http_response_code(400);
    ?>
    <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>ZenCloud</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <style>
        body { font-family: 'IBM Plex Mono', monospace; background: #f6f1e7; color: #1a1a1a; padding: 24px; }
        .box { max-width: 560px; margin: 0 auto; background: #fff8ee; border: 1px solid #ccc; border-radius: 12px; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="box">
        <h4>禅 ZenCloud</h4>
        <p style="color:#B3261E; font-size: 12px;">Ungültige oder abgelaufene SSO-Session.</p>
        <p style="color:#666; font-size: 10px;">Bitte das Fenster schließen und erneut anmelden.</p>
      </div>
    </body>
    </html>
    <?php
    exit;
}
$returnLink = '';
if ($returnUrl) {
  $hash = '#zenpost_sso_token=' . urlencode($token) . '&email=' . urlencode($email);
  $returnLink = $returnUrl . $hash;
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZenCloud</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'IBM Plex Mono', monospace; background: #f6f1e7; color: #1a1a1a; padding: 24px; }
    .box { max-width: 560px; margin: 0 auto; background: #fff8ee; border: 1px solid #ccc; border-radius: 12px; padding: 20px; }
    button { margin-top: 10px; padding: 8px 12px; }
  </style>
</head>
<body>
  <div class="box">
    <h4>雲 ZenCloud Login war erfolgreich</h4>
    <p style="font-size: 11px;">Du hast dich mit der <br /> E-Mail: <span><?php echo htmlspecialchars($email); ?></span><br />erfolgreich angemeldet.</p>
    <p style="color:#666; font-size: 10px;">Du kannst dieses Fenster nun schließen.</p>
  </div>
  <script>
    try {
      if (window.opener && '<?php echo htmlspecialchars($token); ?>') {
        var targetOrigin = <?php echo json_encode($returnUrl ?: '*'); ?>;
        window.opener.postMessage({ type: 'zenpost-sso', token: '<?php echo htmlspecialchars($token); ?>', email: '<?php echo htmlspecialchars($email); ?>' }, targetOrigin);
      }
    } catch (e) {}
    <?php if ($returnLink) : ?>
    try {
      setTimeout(() => { window.location.href = <?php echo json_encode($returnLink); ?>; }, 600);
    } catch (e) {}
    <?php endif; ?>
  </script>
</body>
</html>
