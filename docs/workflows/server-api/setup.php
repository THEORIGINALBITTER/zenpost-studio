<?php
// setup.php
// Einfaches Setup fuer Einsteiger: DB-Daten eingeben -> config.php schreiben.

header('Content-Type: text/html; charset=utf-8');

$baseDir = __DIR__;
$configPath = $baseDir . DIRECTORY_SEPARATOR . 'config.php';
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $dbHost = trim($_POST['db_host'] ?? '');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');
    $apiKeyEnabled = isset($_POST['api_key_enabled']) && $_POST['api_key_enabled'] === '1';
    $apiKey = trim($_POST['api_key'] ?? '');

    if ($dbHost === '' || $dbName === '' || $dbUser === '') {
        $error = 'Bitte DB Host, DB Name und DB User ausfuellen.';
    } elseif ($apiKeyEnabled && $apiKey === '') {
        $error = 'API Key ist aktiviert, aber leer.';
    } else {
        $configContent = "<?php\nreturn [\n"
            . "    'db_host' => " . var_export($dbHost, true) . ",\n"
            . "    'db_name' => " . var_export($dbName, true) . ",\n"
            . "    'db_user' => " . var_export($dbUser, true) . ",\n"
            . "    'db_pass' => " . var_export($dbPass, true) . ",\n"
            . "    'api_key_enabled' => " . ($apiKeyEnabled ? 'true' : 'false') . ",\n"
            . "    'api_key' => " . var_export($apiKey, true) . ",\n"
            . "];\n";

        if (@file_put_contents($configPath, $configContent) === false) {
            $error = 'config.php konnte nicht geschrieben werden. Bitte Dateirechte pruefen.';
        } else {
            $message = 'Setup gespeichert. Jetzt in ZenPost API testen und Test-Insert senden.';
        }
    }
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZenPost API Setup</title>
  <style>
    body { font-family: monospace; background:#111; color:#eee; padding:24px; }
    .card { max-width:720px; margin:0 auto; background:#1b1b1b; border:1px solid #444; border-radius:10px; padding:18px; }
    h1 { font-size:18px; margin:0 0 14px; color:#d8be92; }
    label { display:block; margin:12px 0 6px; font-size:12px; color:#bbb; }
    input[type=text], input[type=password] { width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #555; background:#0f0f0f; color:#eee; }
    .row { margin-top:10px; }
    .msg { margin:10px 0; padding:10px; border-radius:8px; }
    .ok { background:#14321a; border:1px solid #2f7a40; color:#a5e2b3; }
    .err { background:#3a1616; border:1px solid #8f2c2c; color:#ffb3b3; }
    button { margin-top:16px; padding:10px 14px; border-radius:8px; border:1px solid #666; background:#222; color:#d8be92; cursor:pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h1>ZenPost API Setup</h1>
    <p>Einfach-Modus: Nur Datenbank eintragen und speichern.</p>
    <?php if ($message): ?><div class="msg ok"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <?php if ($error): ?><div class="msg err"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <form method="post">
      <label>DB Host</label>
      <input type="text" name="db_host" placeholder="db501....hosting-data.io" required />

      <label>DB Name</label>
      <input type="text" name="db_name" placeholder="dbs...." required />

      <label>DB User</label>
      <input type="text" name="db_user" placeholder="dbu...." required />

      <label>DB Passwort</label>
      <input type="password" name="db_pass" placeholder="********" />

      <div class="row">
        <label>
          <input type="checkbox" name="api_key_enabled" value="1" />
          API-Key Schutz aktivieren (Advanced)
        </label>
      </div>

      <label>API Key (nur wenn aktiviert)</label>
      <input type="text" name="api_key" placeholder="dein-langer-api-key" />

      <button type="submit">Setup speichern</button>
    </form>
  </div>
</body>
</html>

