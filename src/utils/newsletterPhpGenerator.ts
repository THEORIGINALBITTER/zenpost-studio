import JSZip from 'jszip';

// ── Config ────────────────────────────────────────────────

export type EmailMethod    = 'php-mail' | 'smtp';
export type SmtpEncryption = 'tls' | 'ssl';
export type StorageMethod  = 'json' | 'sqlite' | 'mysql';

export interface PhpGenConfig {
  emailMethod: EmailMethod;
  fromEmail: string;
  fromName: string;
  // SMTP only
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpEncryption: SmtpEncryption;
  // Storage
  storageMethod: StorageMethod;
  sqlitePath: string;   // für sqlite, z.B. ../data/subscribers.sqlite
  // MySQL only
  dbHost: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  // API
  apiKey: string;
  siteUrl: string;    // Blog-URL für CORS + Redirect
  apiBaseUrl: string; // URL wo PHP-Dateien liegen
}

export const defaultPhpGenConfig: PhpGenConfig = {
  emailMethod: 'php-mail',
  fromEmail: '',
  fromName: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpEncryption: 'tls',
  storageMethod: 'mysql',
  sqlitePath: '../data/subscribers.sqlite',
  dbHost: 'localhost',
  dbName: '',
  dbUser: '',
  dbPass: '',
  apiKey: '',
  siteUrl: '',
  apiBaseUrl: '',
};

export function deriveNotifyEndpoint(config: PhpGenConfig): string {
  return config.apiBaseUrl.replace(/\/$/, '') + '/newsletter-notify.php';
}

// ── Mailer helpers ────────────────────────────────────────

function mailerRequires(c: PhpGenConfig): string {
  if (c.emailMethod !== 'smtp') return '';
  return `use PHPMailer\\PHPMailer\\PHPMailer;
use PHPMailer\\PHPMailer\\Exception;

require_once __DIR__ . '/libs/PHPMailer/Exception.php';
require_once __DIR__ . '/libs/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/libs/PHPMailer/SMTP.php';

`;
}

function mailerFn(c: PhpGenConfig): string {
  if (c.emailMethod === 'smtp') {
    const enc = c.smtpEncryption === 'ssl'
      ? 'PHPMailer::ENCRYPTION_SMIME'
      : 'PHPMailer::ENCRYPTION_STARTTLS';
    return `
function zenSendMail(string $to, string $subject, string $htmlBody, string $altBody): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = '${c.smtpHost}';
        $mail->SMTPAuth   = true;
        $mail->Username   = '${c.smtpUser}';
        $mail->Password   = '${c.smtpPass}';
        $mail->SMTPSecure = ${enc};
        $mail->Port       = ${c.smtpPort};
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom('${c.fromEmail}', '${c.fromName}');
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody;
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('zenSendMail error: ' . $mail->ErrorInfo);
        return false;
    }
}
`;
  }
  return `
function zenSendMail(string $to, string $subject, string $htmlBody, string $altBody): bool {
    $headers  = 'From: ${c.fromName} <${c.fromEmail}>' . "\\r\\n";
    $headers .= 'Reply-To: ${c.fromEmail}' . "\\r\\n";
    $headers .= 'MIME-Version: 1.0' . "\\r\\n";
    $headers .= 'Content-Type: text/html; charset=UTF-8' . "\\r\\n";
    return mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $htmlBody, $headers);
}
`;
}

// ── CORS block ────────────────────────────────────────────

function corsBlock(c: PhpGenConfig): string {
  const siteUrl = c.siteUrl.replace(/\/$/, '');
  return `// ── CORS ──────────────────────────────────────────────────
$allowed_origins = [
    '${siteUrl}',
    'http://localhost:5002',
    'http://localhost:5003',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
`;
}

// ── Storage abstraction (storage.php) ────────────────────

function generateStoragePhp(c: PhpGenConfig): string {
  const header = `<?php
/* ═══════════════════════════════════════════════════════════
   ZenPost Newsletter — Datenspeicher
   Methode: ${c.storageMethod === 'json' ? 'JSON-Datei (kein Datenbankserver nötig)' : c.storageMethod === 'sqlite' ? 'SQLite (eine Datei, kein Datenbankserver)' : 'MySQL/MariaDB'}
   Generiert von ZenPost Studio
   ═══════════════════════════════════════════════════════════ */

`;

  if (c.storageMethod === 'json') {
    return header + `
define('SUBS_FILE', __DIR__ . '/subscribers.json');

function _loadSubs(): array {
    if (!file_exists(SUBS_FILE)) return [];
    return json_decode(file_get_contents(SUBS_FILE), true) ?? [];
}

function _saveSubs(array $subs): void {
    $fp = fopen(SUBS_FILE, 'c');
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    fwrite($fp, json_encode(array_values($subs), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    flock($fp, LOCK_UN);
    fclose($fp);
}

function findSubscriberByEmail(string $email): ?array {
    foreach (_loadSubs() as $s) {
        if ($s['email'] === $email) return $s;
    }
    return null;
}

function addSubscriber(string $email, string $token): bool {
    $subs   = _loadSubs();
    $subs[] = [
        'email'        => $email,
        'token'        => $token,
        'confirmed'    => false,
        'confirmed_at' => null,
        'created_at'   => date('c'),
    ];
    _saveSubs($subs);
    return true;
}

function confirmSubscriberByToken(string $token): bool {
    $subs  = _loadSubs();
    $found = false;
    foreach ($subs as &$s) {
        if ($s['token'] === $token && !$s['confirmed']) {
            $s['confirmed']    = true;
            $s['confirmed_at'] = date('c');
            $found = true;
            break;
        }
    }
    if ($found) _saveSubs($subs);
    return $found;
}

function deleteSubscriber(string $email, string $token): void {
    _saveSubs(array_filter(
        _loadSubs(),
        fn($s) => !($s['email'] === $email && $s['token'] === $token)
    ));
}

function getConfirmedSubscribers(): array {
    return array_values(array_filter(_loadSubs(), fn($s) => $s['confirmed'] === true));
}
`;
  }

  if (c.storageMethod === 'sqlite') {
    const sqlitePath = c.sqlitePath || '../data/subscribers.sqlite';
    return header + `
define('SQLITE_FILE', __DIR__ . '/${sqlitePath}');

function _getDb(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = dirname(SQLITE_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $pdo = new PDO('sqlite:' . SQLITE_FILE);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        email        TEXT NOT NULL UNIQUE,
        token        TEXT NOT NULL UNIQUE,
        confirmed    INTEGER NOT NULL DEFAULT 0,
        confirmed_at TEXT DEFAULT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime(\\'now\\'))
    )');
    return $pdo;
}

function findSubscriberByEmail(string $email): ?array {
    $s = _getDb()->prepare('SELECT confirmed FROM newsletter_subscribers WHERE email = ?');
    $s->execute([$email]);
    $r = $s->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
}

function addSubscriber(string $email, string $token): bool {
    try {
        _getDb()->prepare('INSERT INTO newsletter_subscribers (email, token) VALUES (?, ?)')->execute([$email, $token]);
        return true;
    } catch (\\Exception $e) {
        return false;
    }
}

function confirmSubscriberByToken(string $token): bool {
    $s = _getDb()->prepare("UPDATE newsletter_subscribers SET confirmed=1, confirmed_at=datetime('now') WHERE token=? AND confirmed=0");
    $s->execute([$token]);
    return $s->rowCount() > 0;
}

function deleteSubscriber(string $email, string $token): void {
    _getDb()->prepare('DELETE FROM newsletter_subscribers WHERE email=? AND token=?')->execute([$email, $token]);
}

function getConfirmedSubscribers(): array {
    return _getDb()->query('SELECT email, token FROM newsletter_subscribers WHERE confirmed=1')->fetchAll(PDO::FETCH_ASSOC);
}
`;
  }

  // MySQL
  return header + `
function _getConn(): mysqli {
    static $conn = null;
    if ($conn) return $conn;
    $conn = new mysqli('${c.dbHost}', '${c.dbUser}', '${c.dbPass}', '${c.dbName}');
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB Verbindungsfehler']);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function findSubscriberByEmail(string $email): ?array {
    $stmt = _getConn()->prepare('SELECT confirmed FROM newsletter_subscribers WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function addSubscriber(string $email, string $token): bool {
    $stmt = _getConn()->prepare('INSERT INTO newsletter_subscribers (email, token) VALUES (?, ?)');
    $stmt->bind_param('ss', $email, $token);
    $ok = $stmt->execute();
    $stmt->close();
    return $ok;
}

function confirmSubscriberByToken(string $token): bool {
    $stmt = _getConn()->prepare('UPDATE newsletter_subscribers SET confirmed=1, confirmed_at=NOW() WHERE token=? AND confirmed=0');
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $changed = $stmt->affected_rows;
    $stmt->close();
    return $changed > 0;
}

function deleteSubscriber(string $email, string $token): void {
    $stmt = _getConn()->prepare('DELETE FROM newsletter_subscribers WHERE email=? AND token=?');
    $stmt->bind_param('ss', $email, $token);
    $stmt->execute();
    $stmt->close();
}

function getConfirmedSubscribers(): array {
    $result = _getConn()->query('SELECT email, token FROM newsletter_subscribers WHERE confirmed=1');
    return $result->fetch_all(MYSQLI_ASSOC);
}
`;
}

// ── Endpoint files (storage-agnostic) ────────────────────

function generateSubscribePhp(c: PhpGenConfig): string {
  const apiBase   = c.apiBaseUrl.replace(/\/$/, '');
  const confirmUrl = `${apiBase}/newsletter-confirm.php`;

  return `<?php
/* ═══════════════════════════════════════════════════════════
   ZenPost Newsletter — Anmelden (Double Opt-In)
   Generiert von ZenPost Studio
   ═══════════════════════════════════════════════════════════ */

${mailerRequires(c)}require_once __DIR__ . '/storage.php';

${corsBlock(c)}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Gültige E-Mail-Adresse erforderlich.']);
    exit;
}

$existing = findSubscriberByEmail($email);
if ($existing) {
    echo json_encode(['success' => true, 'message' => $existing['confirmed']
        ? 'Du bist bereits angemeldet.'
        : 'Bitte bestätige deine E-Mail-Adresse (Check dein Postfach).']);
    exit;
}

$token = bin2hex(random_bytes(32));
if (!addSubscriber($email, $token)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Fehler beim Speichern.']);
    exit;
}

// ── Bestätigungs-E-Mail ────────────────────────────────────
${mailerFn(c)}
$link    = '${confirmUrl}?token=' . urlencode($token);
$subject = 'Bitte bestätige deine Anmeldung';

$html = '<!DOCTYPE html><html lang="de">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:\\'IBM Plex Mono\\',\\'Courier New\\',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#161616;border:0.5px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#161616;border-bottom:0.5px solid #2a2a2a;padding:28px 40px;">
          <span style="color:#AC8E66;font-size:12px;">◆ Newsletter · Anmeldung bestätigen</span>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:300;color:#E8E8E8;">Bitte bestätige deine Anmeldung</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9A9A9A;line-height:1.7;font-weight:300;">Klicke auf den Button um deine Newsletter-Anmeldung abzuschließen.</p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#AC8E66;border-radius:6px;">
              <a href="' . htmlspecialchars($link, ENT_QUOTES) . '"
                 style="display:inline-block;padding:12px 28px;font-family:\\'IBM Plex Mono\\',monospace;font-size:12px;color:#0f0f0f;text-decoration:none;">
                Anmeldung bestätigen →
              </a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#0f0f0f;border-top:0.5px solid #2a2a2a;padding:20px 40px;">
          <p style="margin:0;font-size:10px;color:#444;line-height:1.6;">Falls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';

$alt = "Bitte bestätige deine Newsletter-Anmeldung:\\n\\n" . $link . "\\n\\nFalls du dich nicht angemeldet hast, ignoriere diese E-Mail.";

if (!zenSendMail($email, $subject, $html, $alt)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'E-Mail konnte nicht gesendet werden.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.']);
`;
}

function generateConfirmPhp(c: PhpGenConfig): string {
  const siteUrl = c.siteUrl.replace(/\/$/, '');
  return `<?php
/* ═══════════════════════════════════════════════════════════
   ZenPost Newsletter — Anmeldung bestätigen
   Generiert von ZenPost Studio
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/storage.php';

$token = trim($_GET['token'] ?? '');

if (strlen($token) !== 64 || !ctype_xdigit($token)) {
    http_response_code(400);
    echo '<p>Ungültiger Bestätigungslink.</p>';
    exit;
}

if (!confirmSubscriberByToken($token)) {
    header('Location: ${siteUrl}');
    exit;
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Anmeldung bestätigt</title>
<style>
  body { margin:0; padding:0; background:#0f0f0f; font-family:'IBM Plex Mono','Courier New',monospace; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .box { background:#161616; border:0.5px solid #2a2a2a; border-radius:12px; padding:48px 40px; max-width:480px; text-align:center; }
  h1 { margin:0 0 12px; font-size:20px; font-weight:300; color:#E8E8E8; }
  p  { margin:0 0 28px; font-size:13px; color:#9A9A9A; line-height:1.7; font-weight:300; }
  a  { display:inline-block; padding:10px 24px; background:#AC8E66; color:#0f0f0f; border-radius:6px; text-decoration:none; font-size:11px; }
</style>
<meta http-equiv="refresh" content="4;url=${siteUrl}">
</head>
<body>
  <div class="box">
    <div style="font-size:28px;margin-bottom:16px;color:#AC8E66;">◆</div>
    <h1>Anmeldung bestätigt!</h1>
    <p>Du erhältst ab sofort eine Benachrichtigung bei neuen Posts.</p>
    <a href="${siteUrl}">Zum Blog →</a>
  </div>
</body>
</html>
`;
}

function generateUnsubscribePhp(c: PhpGenConfig): string {
  const siteUrl = c.siteUrl.replace(/\/$/, '');
  return `<?php
/* ═══════════════════════════════════════════════════════════
   ZenPost Newsletter — Abmelden
   Generiert von ZenPost Studio
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/storage.php';

$email = trim($_GET['email'] ?? '');
$token = trim($_GET['token'] ?? '');

if (!$email || !$token) {
    http_response_code(400);
    echo '<p>Ungültiger Link.</p>';
    exit;
}

deleteSubscriber($email, $token);
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<title>Abgemeldet</title>
<style>
  body { margin:0; padding:0; background:#0f0f0f; font-family:'IBM Plex Mono','Courier New',monospace; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .box { background:#161616; border:0.5px solid #2a2a2a; border-radius:12px; padding:48px 40px; max-width:480px; text-align:center; }
  h1 { margin:0 0 12px; font-size:20px; font-weight:300; color:#E8E8E8; }
  p  { margin:0 0 28px; font-size:13px; color:#9A9A9A; line-height:1.7; font-weight:300; }
  a  { display:inline-block; padding:10px 24px; background:#AC8E66; color:#0f0f0f; border-radius:6px; text-decoration:none; font-size:11px; }
</style>
</head>
<body>
  <div class="box">
    <h1>Erfolgreich abgemeldet</h1>
    <p>Du wirst keine weiteren E-Mails erhalten.</p>
    <a href="${siteUrl}">Zum Blog →</a>
  </div>
</body>
</html>
`;
}

function generateNotifyPhp(c: PhpGenConfig): string {
  const siteUrl  = c.siteUrl.replace(/\/$/, '');
  const apiBase  = c.apiBaseUrl.replace(/\/$/, '');
  return `<?php
/* ═══════════════════════════════════════════════════════════
   ZenPost Newsletter — Benachrichtigung bei neuem Post
   Wird automatisch von ZenPost Studio nach dem Publish ausgelöst.
   Generiert von ZenPost Studio
   ═══════════════════════════════════════════════════════════ */

${mailerRequires(c)}require_once __DIR__ . '/storage.php';

// ── CORS ──────────────────────────────────────────────────
$allowed_origins = [
    '${siteUrl}',
    'http://localhost:5002',
    'http://localhost:5003',
    'http://localhost:1420',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

// ── Auth ──────────────────────────────────────────────────
define('NEWSLETTER_API_KEY', '${c.apiKey}');
$key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($key !== NEWSLETTER_API_KEY) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$data     = json_decode(file_get_contents('php://input'), true);
$title    = trim($data['title']    ?? '');
$subtitle = trim($data['subtitle'] ?? '');
$slug     = trim($data['slug']     ?? '');
$siteUrl  = rtrim(trim($data['siteUrl'] ?? ''), '/');

if (!$title || !$slug || !$siteUrl) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'title, slug und siteUrl erforderlich']);
    exit;
}

$postUrl     = $siteUrl . '/#/post/' . urlencode($slug);
$subscribers = getConfirmedSubscribers();

if (empty($subscribers)) {
    echo json_encode(['success' => true, 'sent' => 0, 'message' => 'Keine bestätigten Subscriber.']);
    exit;
}

${mailerFn(c)}
$sent   = 0;
$errors = 0;

foreach ($subscribers as $sub) {
    $unsubUrl = '${apiBase}/newsletter-unsubscribe.php'
        . '?email=' . urlencode($sub['email'])
        . '&token=' . urlencode($sub['token']);

    $html = '<!DOCTYPE html><html lang="de">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:\\'IBM Plex Mono\\',\\'Courier New\\',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#161616;border:0.5px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#161616;border-bottom:0.5px solid #2a2a2a;padding:28px 40px;">
          <span style="color:#AC8E66;font-size:12px;">◆ Newsletter · Neuer Post</span>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 8px;font-size:10px;color:#AC8E66;letter-spacing:2px;text-transform:uppercase;">Neuer Post</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:300;color:#E8E8E8;line-height:1.25;">'
    . htmlspecialchars($title) . '</h1>'
    . ($subtitle ? '<p style="margin:0 0 28px;font-size:14px;color:#9A9A9A;line-height:1.7;">' . htmlspecialchars($subtitle) . '</p>' : '<p style="margin:0 0 28px;"></p>') . '
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#AC8E66;border-radius:6px;">
              <a href="' . htmlspecialchars($postUrl, ENT_QUOTES) . '"
                 style="display:inline-block;padding:12px 28px;font-family:\\'IBM Plex Mono\\',monospace;font-size:12px;color:#0f0f0f;text-decoration:none;">
                Post lesen →
              </a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#0f0f0f;border-top:0.5px solid #2a2a2a;padding:20px 40px;">
          <p style="margin:0;font-size:10px;color:#444;line-height:1.6;">
            Du erhältst diese E-Mail weil du diesen Newsletter abonniert hast.<br/>
            <a href="' . htmlspecialchars($unsubUrl, ENT_QUOTES) . '" style="color:#AC8E66;">Abmelden</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';

    $alt = $title . "\\n\\n"
        . ($subtitle ? $subtitle . "\\n\\n" : '')
        . "Post lesen: " . $postUrl . "\\n\\n"
        . "Abmelden: " . $unsubUrl;

    if (zenSendMail($sub['email'], 'Neuer Post: ' . $title, $html, $alt)) {
        $sent++;
    } else {
        $errors++;
    }
}

echo json_encode(['success' => true, 'sent' => $sent, 'errors' => $errors]);
`;
}

function generateSetupSql(): string {
  return `-- ═══════════════════════════════════════════════════════════
-- ZenPost Newsletter — MySQL Setup
-- Generiert von ZenPost Studio
--
-- Anleitung:
-- 1. phpMyAdmin öffnen
-- 2. Deine Datenbank auswählen
-- 3. Tab "SQL" klicken
-- 4. Diesen Code einfügen und ausführen
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS \`newsletter_subscribers\` (
  \`id\`           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  \`email\`        VARCHAR(255)    NOT NULL,
  \`token\`        VARCHAR(64)     NOT NULL,
  \`confirmed\`    TINYINT(1)      NOT NULL DEFAULT 0,
  \`confirmed_at\` DATETIME        DEFAULT NULL,
  \`created_at\`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`email\` (\`email\`),
  UNIQUE KEY \`token\` (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
}

function generateReadme(c: PhpGenConfig): string {
  const notifyEndpoint = deriveNotifyEndpoint(c);

  const storageInfo = {
    json:   '  JSON-Datei (subscribers.json) — wird automatisch erstellt\n  Kein Setup nötig!',
    sqlite: `  SQLite-Datei (${c.sqlitePath}) — wird automatisch erstellt\n  Kein Setup nötig! Stelle sicher dass PHP Schreibrechte hat.`,
    mysql:  '  MySQL/MariaDB\n  → setup.sql in phpMyAdmin ausführen (Schritt 1)',
  }[c.storageMethod];

  const setupStep = c.storageMethod === 'mysql'
    ? `SCHRITT 1 — DATENBANK EINRICHTEN
──────────────────────────────────
  1. phpMyAdmin öffnen
  2. Deine Datenbank auswählen → Tab "SQL"
  3. Inhalt von setup.sql einfügen und ausführen

SCHRITT 2 — DATEIEN HOCHLADEN`
    : `SCHRITT 1 — DATEIEN HOCHLADEN`;

  const smtpNote = c.emailMethod === 'smtp'
    ? `\nPHPMailer (für SMTP) installieren:\n  1. Download: https://github.com/PHPMailer/PHPMailer/releases\n  2. Folgende Dateien in den "libs/PHPMailer/" Unterordner:\n     libs/PHPMailer/Exception.php\n     libs/PHPMailer/PHPMailer.php\n     libs/PHPMailer/SMTP.php\n`
    : '';

  return `ZenPost Newsletter Backend
Generiert von ZenPost Studio
══════════════════════════════════════════════════

DATEIEN IM PAKET
─────────────────
  storage.php                Datenspeicher-Abstraktion
  newsletter-subscribe.php   Double Opt-In Anmeldung
  newsletter-confirm.php     E-Mail-Bestätigung
  newsletter-unsubscribe.php Abmeldung
  newsletter-notify.php      Wird von ZenPost Studio aufgerufen
${c.storageMethod === 'mysql' ? '  setup.sql                  MySQL Tabelle erstellen\n' : ''}  README.txt                 Diese Datei

DATENSPEICHER
──────────────
${storageInfo}

${setupStep}
───────────────────────────────────────
  Alle PHP-Dateien in diesen Ordner hochladen:
  ${c.apiBaseUrl}
${smtpNote}
NÄCHSTER SCHRITT — NEWSLETTER-FORMULAR IM BLOG
────────────────────────────────────────────────
  Subscribe-Endpunkt für dein Blog-Formular:
  ${c.apiBaseUrl.replace(/\/$/, '')}/newsletter-subscribe.php

  (POST-Request mit JSON: { "email": "user@example.com" })

ZENPOST STUDIO — BEREITS KONFIGURIERT
───────────────────────────────────────
  Notify-Endpunkt: ${notifyEndpoint}
  API Key:         ${c.apiKey}

  Nach dem Publish wird automatisch eine E-Mail an alle
  bestätigten Subscriber gesendet.

══════════════════════════════════════════════════
E-Mail: ${c.emailMethod === 'smtp' ? 'SMTP (' + c.smtpHost + ')' : 'PHP mail() — Shared Hosting'}
Absender: ${c.fromName} <${c.fromEmail}>
Speicher: ${c.storageMethod === 'json' ? 'JSON-Datei' : c.storageMethod === 'sqlite' ? 'SQLite' : 'MySQL @ ' + c.dbHost}
══════════════════════════════════════════════════
`;
}

// ── Main export ───────────────────────────────────────────

export async function generateAndDownloadPhpBackend(config: PhpGenConfig): Promise<void> {
  const zip = new JSZip();

  zip.file('storage.php',                generateStoragePhp(config));
  zip.file('newsletter-subscribe.php',   generateSubscribePhp(config));
  zip.file('newsletter-confirm.php',     generateConfirmPhp(config));
  zip.file('newsletter-unsubscribe.php', generateUnsubscribePhp(config));
  zip.file('newsletter-notify.php',      generateNotifyPhp(config));
  if (config.storageMethod === 'mysql') {
    zip.file('setup.sql', generateSetupSql());
  }
  zip.file('README.txt', generateReadme(config));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'zenpost-newsletter-backend.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
