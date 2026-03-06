import { useState } from 'react';
import JSZip from 'jszip';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  type ServerConfig,
  type ZenStudioSettings,
} from '../../../../../services/zenStudioSettingsService';

export const ZenApiSettingsContent = () => {
  const [settings, setSettings] = useState<ZenStudioSettings>(() => loadZenStudioSettings());
  const [testing, setTesting] = useState(false);
  const [sendingInsert, setSendingInsert] = useState(false);
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [sendingErrorCase, setSendingErrorCase] = useState(false);
  const [buildingPackage, setBuildingPackage] = useState(false);
  const [showAdvancedTests, setShowAdvancedTests] = useState(false);
  const [healthChecking, setHealthChecking] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'success' | 'error' | 'info' | null>(null);

  const activeIdx = Math.min(settings.activeServerIndex ?? 0, (settings.servers ?? []).length - 1);
  const servers = settings.servers ?? [];
  const activeServer: ServerConfig = servers[activeIdx] ?? {
    name: 'Server A',
    contentServerApiUrl: settings.contentServerApiUrl,
    contentServerApiKey: settings.contentServerApiKey,
    contentServerApiEndpoint: settings.contentServerApiEndpoint,
    contentServerImageUploadEndpoint: settings.contentServerImageUploadEndpoint,
    contentServerPingEndpoint: settings.contentServerPingEndpoint,
    contentServerListEndpoint: settings.contentServerListEndpoint,
    contentServerDeleteEndpoint: settings.contentServerDeleteEndpoint,
    contentServerImageBaseUrl: settings.contentServerImageBaseUrl,
  };

  const switchToServer = (idx: number) => {
    const server = servers[idx];
    const next = patchZenStudioSettings({
      activeServerIndex: idx,
      contentServerApiUrl: server.contentServerApiUrl,
      contentServerApiKey: server.contentServerApiKey,
      contentServerApiEndpoint: server.contentServerApiEndpoint,
      contentServerImageUploadEndpoint: server.contentServerImageUploadEndpoint,
      contentServerPingEndpoint: server.contentServerPingEndpoint,
      contentServerListEndpoint: server.contentServerListEndpoint,
      contentServerDeleteEndpoint: server.contentServerDeleteEndpoint,
      contentServerImageBaseUrl: server.contentServerImageBaseUrl,
    });
    setSettings(next);
  };

  const addServer = () => {
    const letter = String.fromCharCode(65 + servers.length);
    const newServer: ServerConfig = {
      name: servers.length < 26 ? `Server ${letter}` : `Server ${servers.length + 1}`,
      contentServerApiUrl: null,
      contentServerApiKey: null,
      contentServerApiEndpoint: '/save_articles.php',
      contentServerImageUploadEndpoint: '/upload_images.php',
      contentServerPingEndpoint: '/ping.php',
      contentServerListEndpoint: '/articles.php',
      contentServerDeleteEndpoint: '/delete_articles.php',
      contentServerImageBaseUrl: null,
    };
    const newServers = [...servers, newServer];
    const newIdx = newServers.length - 1;
    const next = patchZenStudioSettings({
      servers: newServers,
      activeServerIndex: newIdx,
      contentServerApiUrl: null,
      contentServerApiKey: null,
      contentServerApiEndpoint: '/save_articles.php',
      contentServerImageUploadEndpoint: '/upload_images.php',
      contentServerPingEndpoint: '/ping.php',
      contentServerListEndpoint: '/articles.php',
      contentServerDeleteEndpoint: '/delete_articles.php',
      contentServerImageBaseUrl: null,
    });
    setSettings(next);
  };

  const deleteServer = (idx: number) => {
    if (servers.length <= 1) return;
    const newServers = servers.filter((_, i) => i !== idx);
    const newIdx = Math.min(activeIdx >= idx ? activeIdx - 1 : activeIdx, newServers.length - 1);
    const safeIdx = Math.max(0, newIdx);
    const activeServer = newServers[safeIdx];
    const next = patchZenStudioSettings({
      servers: newServers,
      activeServerIndex: safeIdx,
      contentServerApiUrl: activeServer.contentServerApiUrl,
      contentServerApiKey: activeServer.contentServerApiKey,
      contentServerApiEndpoint: activeServer.contentServerApiEndpoint,
      contentServerImageUploadEndpoint: activeServer.contentServerImageUploadEndpoint,
      contentServerPingEndpoint: activeServer.contentServerPingEndpoint,
      contentServerListEndpoint: activeServer.contentServerListEndpoint,
      contentServerDeleteEndpoint: activeServer.contentServerDeleteEndpoint,
      contentServerImageBaseUrl: activeServer.contentServerImageBaseUrl,
    });
    setSettings(next);
  };

  const updateServerField = (patch: Partial<ServerConfig>) => {
    const updatedServer = { ...activeServer, ...patch };
    const newServers = servers.map((s, i) => (i === activeIdx ? updatedServer : s));
    const flatPatch: Partial<ZenStudioSettings> = { servers: newServers };
    if ('contentServerApiUrl' in patch) flatPatch.contentServerApiUrl = patch.contentServerApiUrl;
    if ('contentServerApiKey' in patch) flatPatch.contentServerApiKey = patch.contentServerApiKey;
    if ('contentServerApiEndpoint' in patch) flatPatch.contentServerApiEndpoint = patch.contentServerApiEndpoint;
    if ('contentServerImageUploadEndpoint' in patch) flatPatch.contentServerImageUploadEndpoint = patch.contentServerImageUploadEndpoint;
    if ('contentServerPingEndpoint' in patch) flatPatch.contentServerPingEndpoint = patch.contentServerPingEndpoint;
    if ('contentServerListEndpoint' in patch) flatPatch.contentServerListEndpoint = patch.contentServerListEndpoint;
    if ('contentServerDeleteEndpoint' in patch) flatPatch.contentServerDeleteEndpoint = patch.contentServerDeleteEndpoint;
    if ('contentServerImageBaseUrl' in patch) flatPatch.contentServerImageBaseUrl = patch.contentServerImageBaseUrl;
    const next = patchZenStudioSettings(flatPatch);
    setSettings(next);
  };

  const setResult = (message: string, status: 'success' | 'error' | 'info') => {
    setTestResult(message);
    setTestStatus(status);
  };

  const resolveTargetUrl = (baseUrl: string | null, endpoint: string): string | null => {
    const cleanedEndpoint = endpoint.trim();
    if (!cleanedEndpoint) return null;
    if (/^https?:\/\//i.test(cleanedEndpoint)) return cleanedEndpoint;
    const cleanedBase = (baseUrl ?? '').trim();
    if (!cleanedBase) return null;
    return `${cleanedBase.replace(/\/+$/, '')}/${cleanedEndpoint.replace(/^\/+/, '')}`;
  };

  const testInsertPayload = `{
  "slug": "zenpost-api-test-001",
  "title": "ZenPost API Test Artikel",
  "subtitle": "Insert Test",
  "date": "2026-03-05",
  "imageUrl": "/images/tests/api-test.jpg",
  "content": "# API Test\\n\\nDies ist ein Insert-Test aus ZenPost."
}`;

  const testUpdatePayload = `{
  "slug": "zenpost-api-test-001",
  "title": "ZenPost API Test Artikel (Update)",
  "subtitle": "Update Test",
  "date": "2026-03-05",
  "imageUrl": "/images/tests/api-test-updated.jpg",
  "content": "# API Test Update\\n\\nDies ist ein Update-Test aus ZenPost."
}`;

  const testErrorPayload = `{
  "slug": "",
  "title": "",
  "content": "Fehlerfall ohne Pflichtfelder"
}`;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestStatus(null);
    try {
      const targetUrl = resolveTargetUrl(settings.contentServerApiUrl, settings.contentServerPingEndpoint);
      if (!targetUrl) {
        setResult('Fehler: API URL oder Ping-Endpoint fehlt.', 'error');
        return;
      }

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          ...(settings.contentServerApiKey ? { Authorization: `Bearer ${settings.contentServerApiKey}` } : {}),
        },
      });

      const text = await response.text().catch(() => '');
      if (!response.ok) {
        setResult(`Fehler ${response.status}: ${text || 'Keine Antwortdetails'}`, 'error');
        return;
      }
      setResult(`OK: ${text || 'Verbindung erfolgreich'}`, 'success');
    } catch (error) {
      setResult(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const probeEndpoint = async (
    label: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'OPTIONS' = 'GET',
    body?: string
  ) => {
    const targetUrl = resolveTargetUrl(settings.contentServerApiUrl, endpoint);
    if (!targetUrl) {
      setResult(`Health-Check fehlgeschlagen: ${label} URL fehlt.`, 'error');
      return;
    }

    const response = await fetch(targetUrl, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(settings.contentServerApiKey ? { Authorization: `Bearer ${settings.contentServerApiKey}` } : {}),
      },
      ...(body ? { body } : {}),
    });

    const text = await response.text().catch(() => '');
    if (response.ok) {
      setResult(`Health OK: ${label} (${response.status})`, 'success');
      return;
    }
    if (response.status < 500) {
      setResult(`Health erreichbar: ${label} (${response.status}) ${text ? `- ${text}` : ''}`.trim(), 'info');
      return;
    }
    setResult(`Health Fehler: ${label} (${response.status}) ${text ? `- ${text}` : ''}`.trim(), 'error');
  };

  const runHealthCheck = async (key: string, runner: () => Promise<void>) => {
    setHealthChecking(key);
    try {
      await runner();
    } catch (error) {
      setResult(`Health-Check Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setHealthChecking(null);
    }
  };

  const handleHealthPing = async () => runHealthCheck('ping', async () => {
    await probeEndpoint('Ping', settings.contentServerPingEndpoint, 'GET');
  });

  const handleHealthUpsert = async () => runHealthCheck('upsert', async () => {
    await probeEndpoint('Upsert', settings.contentServerApiEndpoint, 'OPTIONS');
  });

  const handleHealthList = async () => runHealthCheck('list', async () => {
    await probeEndpoint('List', settings.contentServerListEndpoint, 'GET');
  });

  const handleHealthDelete = async () => runHealthCheck('delete', async () => {
    await probeEndpoint('Delete', settings.contentServerDeleteEndpoint, 'OPTIONS');
  });

  const handleHealthUpload = async () => runHealthCheck('upload', async () => {
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Y3nUAAAAASUVORK5CYII=';
    const uploadPayload = JSON.stringify({
      imageData: tinyPng,
      fileName: `zenpost-health-${Date.now()}.png`,
    });
    await probeEndpoint('Upload', settings.contentServerImageUploadEndpoint, 'POST', uploadPayload);
  });

  const sendPayloadToUpsert = async (payload: string, label: string) => {
    setTestResult(null);
    setTestStatus(null);
    const targetUrl = resolveTargetUrl(settings.contentServerApiUrl, settings.contentServerApiEndpoint);
    if (!targetUrl) {
      setResult('Fehler: API URL oder Upsert-Endpoint fehlt.', 'error');
      return;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.contentServerApiKey ? { Authorization: `Bearer ${settings.contentServerApiKey}` } : {}),
      },
      body: payload,
    });

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      setResult(`${label} Fehler ${response.status}: ${text || 'Keine Antwortdetails'}`, 'error');
      return;
    }
    setResult(`${label} OK: ${text || 'Erfolgreich gesendet'}`, 'success');
  };

  const handleSendTestInsert = async () => {
    setSendingInsert(true);
    try {
      await sendPayloadToUpsert(testInsertPayload, 'Insert');
    } catch (error) {
      setResult(`Insert Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setSendingInsert(false);
    }
  };

  const handleSendTestUpdate = async () => {
    setSendingUpdate(true);
    try {
      await sendPayloadToUpsert(testUpdatePayload, 'Update');
    } catch (error) {
      setResult(`Update Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setSendingUpdate(false);
    }
  };

  const handleSendTestError = async () => {
    setSendingErrorCase(true);
    try {
      await sendPayloadToUpsert(testErrorPayload, 'Error-Fall');
    } catch (error) {
      setResult(`Error-Fall Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setSendingErrorCase(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult(`Kopiert: ${label}`, 'info');
    } catch {
      setResult(`Kopieren fehlgeschlagen: ${label}`, 'error');
    }
  };

  const buildConfigPhp = () => {
    const apiEnabled = !!(settings.contentServerApiKey && settings.contentServerApiKey.trim().length > 0);
    return `<?php\nreturn [\n    'db_host' => 'HIER_DB_HOST',\n    'db_name' => 'HIER_DB_NAME',\n    'db_user' => 'HIER_DB_USER',\n    'db_pass' => 'HIER_DB_PASS',\n    'api_key_enabled' => ${apiEnabled ? 'true' : 'false'},\n    'api_key' => '${(settings.contentServerApiKey ?? '').replace(/'/g, "\\'")}',\n    'image_public_base' => '${(settings.contentServerImageBaseUrl ?? '').replace(/'/g, "\\'")}',\n];\n`;
  };

  const buildReadme = () => `ZenPost Server API Setup\n=========================\n\n1) Alle Dateien aus diesem ZIP in /api/zenpost/ auf deinem Server hochladen.\n2) setup.php im Browser aufrufen:\n   https://deine-domain.de/api/zenpost/setup.php\n3) DB-Daten eintragen und speichern.\n4) In ZenPost API Tab eintragen:\n   URL: ${settings.contentServerApiUrl ?? 'https://deine-domain.de'}\n   Upsert: ${settings.contentServerApiEndpoint}\n   Upload: ${settings.contentServerImageUploadEndpoint}\n   Ping: ${settings.contentServerPingEndpoint}\n5) API testen + Test-Insert senden.\n`;

  const buildPingPhp = () => `<?php\nheader("Access-Control-Allow-Origin: *");\nheader("Access-Control-Allow-Methods: GET, OPTIONS");\nheader("Access-Control-Allow-Headers: Content-Type, Authorization");\nif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }\nheader("Content-Type: application/json; charset=utf-8");\n\n$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';\nif (!file_exists($configPath)) { http_response_code(500); echo json_encode(["success"=>false,"message"=>"config.php fehlt. setup.php ausfuehren."]); exit; }\n$config = require $configPath;\n$apiKeyEnabled = !empty($config['api_key_enabled']);\n$expectedApiKey = trim((string)($config['api_key'] ?? ''));\n$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';\n$token = null;\nif (preg_match('/Bearer\\s+(.+)/i', $authHeader, $m)) { $token = trim($m[1]); }\nif ($apiKeyEnabled && ($expectedApiKey === '' || $token !== $expectedApiKey)) {\n  http_response_code(401); echo json_encode(["success"=>false,"message"=>"Unauthorized"]); exit;\n}\necho json_encode(["success"=>true,"message"=>"pong","time"=>gmdate('c')]);\n`;

  const buildSavePhp = () => `<?php\nini_set('display_errors', 1);\nini_set('display_startup_errors', 1);\nerror_reporting(E_ALL);\nheader("Access-Control-Allow-Origin: *");\nheader("Access-Control-Allow-Methods: POST, OPTIONS");\nheader("Access-Control-Allow-Headers: Content-Type, Authorization");\nif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }\nheader("Content-Type: application/json; charset=utf-8");\n\n$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';\nif (!file_exists($configPath)) { http_response_code(500); echo json_encode(["success"=>false,"message"=>"config.php fehlt. setup.php ausfuehren."]); exit; }\n$config = require $configPath;\n\n$conn = new mysqli((string)$config['db_host'], (string)$config['db_user'], (string)$config['db_pass'], (string)$config['db_name']);\nif ($conn->connect_error) { http_response_code(500); echo json_encode(["success"=>false,"message"=>"DB Fehler: ".$conn->connect_error]); exit; }\n$conn->set_charset("utf8mb4");\n\n$apiKeyEnabled = !empty($config['api_key_enabled']);\n$expectedApiKey = trim((string)($config['api_key'] ?? ''));\n$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';\n$token = null;\nif (preg_match('/Bearer\\s+(.+)/i', $authHeader, $m)) { $token = trim($m[1]); }\nif ($apiKeyEnabled && ($expectedApiKey === '' || $token !== $expectedApiKey)) {\n  http_response_code(401); echo json_encode(["success"=>false,"message"=>"Unauthorized"]); exit;\n}\n\n$input = json_decode(file_get_contents('php://input'), true);\nif (!is_array($input)) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"Ungueltiges JSON"]); exit; }\n$slug = trim($input['slug'] ?? '');\n$title = trim($input['title'] ?? '');\n$subtitle = trim($input['subtitle'] ?? '');\n$publishDate = trim($input['date'] ?? ($input['publishDate'] ?? date('Y-m-d')));\n$imageUrl = trim($input['image'] ?? ($input['imageUrl'] ?? ''));\nif ($slug === '' || $title === '') { http_response_code(422); echo json_encode(["success"=>false,"message"=>"Slug und Title sind erforderlich."]); exit; }\n\nif (isset($input['blocks']) && is_array($input['blocks'])) {\n  $contentJson = json_encode(["blocks"=>$input['blocks']], JSON_UNESCAPED_UNICODE);\n} else {\n  $contentJson = json_encode(["format"=>"markdown","content"=>trim($input['content'] ?? '')], JSON_UNESCAPED_UNICODE);\n}\n\n$stmtCheck = $conn->prepare("SELECT Id FROM Articles WHERE Slug = ?");\n$stmtCheck->bind_param("s", $slug);\n$stmtCheck->execute();\n$resultCheck = $stmtCheck->get_result();\n\nif ($resultCheck && $resultCheck->num_rows > 0) {\n  $stmt = $conn->prepare("UPDATE Articles SET Title=?, Subtitle=?, PublishDate=?, ImageUrl=?, Content=?, UpdatedAt=CURRENT_TIMESTAMP WHERE Slug=?");\n  $stmt->bind_param("ssssss", $title, $subtitle, $publishDate, $imageUrl, $contentJson, $slug);\n  $ok = $stmt->execute();\n  if ($ok) { echo json_encode(["success"=>true,"mode"=>"update","message"=>"Artikel aktualisiert."]); }\n  else { http_response_code(500); echo json_encode(["success"=>false,"message"=>"Update fehlgeschlagen: ".$stmt->error]); }\n} else {\n  $stmt = $conn->prepare("INSERT INTO Articles (Slug, Title, Subtitle, PublishDate, ImageUrl, Content) VALUES (?, ?, ?, ?, ?, ?)");\n  $stmt->bind_param("ssssss", $slug, $title, $subtitle, $publishDate, $imageUrl, $contentJson);\n  $ok = $stmt->execute();\n  if ($ok) { echo json_encode(["success"=>true,"mode"=>"insert","message"=>"Artikel gespeichert."]); }\n  else { http_response_code(500); echo json_encode(["success"=>false,"message"=>"Insert fehlgeschlagen: ".$stmt->error]); }\n}\n$stmt->close();\n$stmtCheck->close();\n$conn->close();\n`;

  const buildUploadPhp = () => `<?php\nini_set('display_errors', 1);\nini_set('display_startup_errors', 1);\nerror_reporting(E_ALL);\nheader("Access-Control-Allow-Origin: *");\nheader("Access-Control-Allow-Methods: POST, OPTIONS");\nheader("Access-Control-Allow-Headers: Content-Type, Authorization");\nif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }\nheader("Content-Type: application/json; charset=utf-8");\n\n$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';\nif (!file_exists($configPath)) { http_response_code(500); echo json_encode(["success"=>false,"message"=>"config.php fehlt. setup.php ausfuehren."]); exit; }\n$config = require $configPath;\n\n$apiKeyEnabled = !empty($config['api_key_enabled']);\n$expectedApiKey = trim((string)($config['api_key'] ?? ''));\n$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';\n$token = null;\nif (preg_match('/Bearer\\s+(.+)/i', $authHeader, $m)) { $token = trim($m[1]); }\nif ($apiKeyEnabled && ($expectedApiKey === '' || $token !== $expectedApiKey)) {\n  http_response_code(401); echo json_encode(["success"=>false,"message"=>"Unauthorized"]); exit;\n}\n\n$input = json_decode(file_get_contents('php://input'), true);\nif (!is_array($input)) { http_response_code(400); echo json_encode(["success"=>false,"message"=>"Ungueltiges JSON"]); exit; }\n\n$imageData = trim((string)($input['imageData'] ?? ''));\n$fileName = trim((string)($input['fileName'] ?? ''));\nif ($imageData === '' || strpos($imageData, 'data:image/') !== 0) {\n  http_response_code(422); echo json_encode(["success"=>false,"message"=>"imageData (data:image) fehlt."]); exit;\n}\n\nif (!preg_match('/^data:image\\/(png|jpe?g|webp|gif);base64,(.+)$/i', $imageData, $m)) {\n  http_response_code(422); echo json_encode(["success"=>false,"message"=>"Nur png/jpg/webp/gif base64 erlaubt."]); exit;\n}\n\n$ext = strtolower($m[1] === 'jpeg' ? 'jpg' : $m[1]);\n$base64 = preg_replace('/\\s+/', '', $m[2]);\n$binary = base64_decode($base64, true);\nif ($binary === false) {\n  http_response_code(422); echo json_encode(["success"=>false,"message"=>"Base64 Dekodierung fehlgeschlagen."]); exit;\n}\n\n$safeName = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $fileName);\n$safeName = trim($safeName, '-_.');\nif ($safeName === '') { $safeName = 'zenpost-image-' . gmdate('Ymd-His'); }\n$existingExt = strtolower((string)pathinfo($safeName, PATHINFO_EXTENSION));\n$allowedExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'];\nif ($existingExt === '' || !in_array($existingExt, $allowedExt, true)) {\n  $safeName = preg_replace('/\\.[^.]+$/', '', $safeName);\n  $safeName .= '.' . $ext;\n}\n\n$webRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), DIRECTORY_SEPARATOR);\n$targetDir = '';\nif ($webRoot !== '') {\n  $targetDir = $webRoot . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'zenpoststudio';\n}\nif ($targetDir === '') {\n  $targetDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'zenpoststudio';\n}\nif (!is_dir($targetDir)) {\n  @mkdir($targetDir, 0775, true);\n}\nif (!is_dir($targetDir) || !is_writable($targetDir)) {\n  http_response_code(500); echo json_encode(["success"=>false,"message"=>"Upload-Verzeichnis nicht beschreibbar: ".$targetDir,"documentRoot"=>$webRoot]); exit;\n}\n\n$targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;\nif (file_exists($targetPath)) {\n  $safeName = pathinfo($safeName, PATHINFO_FILENAME) . '-' . gmdate('His') . '.' . $ext;\n  $targetPath = $targetDir . DIRECTORY_SEPARATOR . $safeName;\n}\n\nif (@file_put_contents($targetPath, $binary) === false) {\n  http_response_code(500); echo json_encode(["success"=>false,"message"=>"Datei konnte nicht geschrieben werden."]); exit;\n}\n\n$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';\n$host = $_SERVER['HTTP_HOST'] ?? '';\n$publicBase = trim((string)($config['image_public_base'] ?? ''));\nif ($publicBase === '') {\n  $publicBase = ($host !== '') ? ($scheme . '://' . $host . '/images/zenpoststudio') : '/images/zenpoststudio';\n}\n$publicBase = rtrim($publicBase, '/');\n$url = $publicBase . '/' . rawurlencode($safeName);\n\necho json_encode([\n  "success" => true,\n  "fileName" => $safeName,\n  "path" => $targetPath,\n  "url" => $url,\n  "targetDir" => $targetDir,\n  "documentRoot" => $webRoot\n]);\n`;

  const buildSetupPhp = () => `<?php\nheader('Content-Type: text/html; charset=utf-8');\n$baseDir = __DIR__;\n$configPath = $baseDir . DIRECTORY_SEPARATOR . 'config.php';\n$message = '';\n$error = '';\nif ($_SERVER['REQUEST_METHOD'] === 'POST') {\n  $dbHost = trim($_POST['db_host'] ?? '');\n  $dbName = trim($_POST['db_name'] ?? '');\n  $dbUser = trim($_POST['db_user'] ?? '');\n  $dbPass = trim($_POST['db_pass'] ?? '');\n  $apiKeyEnabled = isset($_POST['api_key_enabled']) && $_POST['api_key_enabled'] === '1';\n  $apiKey = trim($_POST['api_key'] ?? '');\n  if ($dbHost === '' || $dbName === '' || $dbUser === '') { $error = 'Bitte DB Host, DB Name und DB User ausfuellen.'; }\n  else {\n    $configContent = "<?php\\nreturn [\\n"\n      . "    'db_host' => " . var_export($dbHost, true) . ",\\n"\n      . "    'db_name' => " . var_export($dbName, true) . ",\\n"\n      . "    'db_user' => " . var_export($dbUser, true) . ",\\n"\n      . "    'db_pass' => " . var_export($dbPass, true) . ",\\n"\n      . "    'api_key_enabled' => " . ($apiKeyEnabled ? 'true' : 'false') . ",\\n"\n      . "    'api_key' => " . var_export($apiKey, true) . ",\\n"\n      . "];\\n";\n    if (@file_put_contents($configPath, $configContent) === false) { $error = 'config.php konnte nicht geschrieben werden.'; }\n    else { $message = 'Setup gespeichert.'; }\n  }\n}\n?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ZenPost API Setup</title></head>\n<body style="font-family:monospace;background:#111;color:#eee;padding:24px;">\n<div style="max-width:720px;margin:0 auto;background:#1b1b1b;border:1px solid #444;border-radius:10px;padding:18px;">\n<h1 style="font-size:18px;color:#d8be92;">ZenPost API Setup</h1>\n<?php if ($message): ?><div style="padding:8px;background:#14321a;border:1px solid #2f7a40;"><?= htmlspecialchars($message) ?></div><?php endif; ?>\n<?php if ($error): ?><div style="padding:8px;background:#3a1616;border:1px solid #8f2c2c;"><?= htmlspecialchars($error) ?></div><?php endif; ?>\n<form method="post">\n<label>DB Host</label><br><input type="text" name="db_host" style="width:100%;padding:8px;"><br>\n<label>DB Name</label><br><input type="text" name="db_name" style="width:100%;padding:8px;"><br>\n<label>DB User</label><br><input type="text" name="db_user" style="width:100%;padding:8px;"><br>\n<label>DB Passwort</label><br><input type="password" name="db_pass" style="width:100%;padding:8px;"><br>\n<label><input type="checkbox" name="api_key_enabled" value="1"> API-Key aktivieren (optional)</label><br>\n<label>API Key</label><br><input type="text" name="api_key" style="width:100%;padding:8px;"><br><br>\n<button type="submit">Setup speichern</button>\n</form></div></body></html>\n`;

  const handleDownloadServerPackage = async () => {
    setBuildingPackage(true);
    try {
      const zip = new JSZip();
      zip.file('README.txt', buildReadme());
      zip.file('config.php', buildConfigPhp());
      zip.file('setup.php', buildSetupPhp());
      zip.file('ping.php', buildPingPhp());
      zip.file('save_articles_zenpost.php', buildSavePhp());
      zip.file('upload_images.php', buildUploadPhp());
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'zenpost-server-api.zip';
      link.click();
      URL.revokeObjectURL(link.href);
      setResult('Server-Paket erzeugt: zenpost-server-api.zip', 'success');
    } catch (error) {
      setResult(`Paket erstellen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setBuildingPackage(false);
    }
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: '24px 24px' }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 24px' }}>
          <div style={stepTitleStyle}>1. Server-Paket erstellen</div>
          <button type="button" onClick={handleDownloadServerPackage} disabled={buildingPackage} style={testButtonStyle}>
            {buildingPackage ? 'Baue Paket...' : 'Server-Paket herunterladen'}
          </button>

          <div style={stepTitleStyle}>2. Server konfigurieren</div>
          <div style={hintStyle}>
            ZIP nach <code>/api/zenpost/</code> hochladen, dann <code>setup.php</code> im Browser oeffnen und DB-Daten speichern.
          </div>

          <div style={stepTitleStyle}>3. API-Daten in ZenPost eintragen</div>

          {/* Server Tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {servers.map((server, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'stretch' }}>
                <button
                  type="button"
                  onClick={() => switchToServer(idx)}
                  style={{
                    borderTop: `1px solid ${idx === activeIdx ? '#AC8E66' : '#3A3A3A'}`,
                    borderLeft: `1px solid ${idx === activeIdx ? '#AC8E66' : '#3A3A3A'}`,
                    borderBottom: `1px solid ${idx === activeIdx ? '#AC8E66' : '#3A3A3A'}`,
                    borderRight: servers.length > 1 ? 'none' : `1px solid ${idx === activeIdx ? '#AC8E66' : '#3A3A3A'}`,
                    borderRadius: servers.length > 1 ? '8px 0 0 8px' : '8px',
                    padding: '6px 10px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11px',
                    color: idx === activeIdx ? '#AC8E66' : '#666',
                    backgroundColor: idx === activeIdx ? '#1e1a14' : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    fontWeight: idx === activeIdx ? 700 : 400,
                  }}
                >
                  {server.name}
                </button>
                {servers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteServer(idx)}
                    title="Server entfernen"
                    style={{
                      border: `1px solid ${idx === activeIdx ? '#AC8E66' : '#3A3A3A'}`,
                      borderRadius: '0 8px 8px 0',
                      padding: '6px 8px',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                      lineHeight: 1,
                      color: '#888',
                      backgroundColor: idx === activeIdx ? '#1e1a14' : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addServer}
              title="Neuen Server hinzufügen"
              style={{
                border: '1px solid #AC8E66',
                borderRadius: '8px',
                padding: '6px 11px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '13px',
                lineHeight: 1,
                color: '#AC8E66',
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>

          {/* Server Name */}
          <div style={miniLabelStyle}>Server Name</div>
          <input
            type="text"
            value={activeServer.name}
            onChange={(e) => updateServerField({ name: e.target.value })}
            placeholder="Server Name"
            style={{ ...textInputStyle, fontWeight: 600 }}
          />

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666' }}>
            Simple Mode: API Key leer lassen. Advanced Mode: API Key in setup.php aktivieren und hier eintragen.
          </div>

          <div style={miniLabelStyle}>API Base URL</div>
          <input
            type="text"
            value={activeServer.contentServerApiUrl ?? ''}
            onChange={(e) => updateServerField({ contentServerApiUrl: e.target.value })}
            placeholder="https://dein-server.de"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>Upsert Endpoint</div>
          <input
            type="text"
            value={activeServer.contentServerApiEndpoint}
            onChange={(e) => updateServerField({ contentServerApiEndpoint: e.target.value })}
            placeholder="/save_articles.php"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>Upload Endpoint</div>
          <input
            type="text"
            value={activeServer.contentServerImageUploadEndpoint}
            onChange={(e) => updateServerField({ contentServerImageUploadEndpoint: e.target.value })}
            placeholder="/upload_images.php"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>Ping Endpoint</div>
          <input
            type="text"
            value={activeServer.contentServerPingEndpoint}
            onChange={(e) => updateServerField({ contentServerPingEndpoint: e.target.value })}
            placeholder="/ping.php"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>List Endpoint</div>
          <input
            type="text"
            value={activeServer.contentServerListEndpoint}
            onChange={(e) => updateServerField({ contentServerListEndpoint: e.target.value })}
            placeholder="/articles.php"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>Delete Endpoint</div>
          <input
            type="text"
            value={activeServer.contentServerDeleteEndpoint}
            onChange={(e) => updateServerField({ contentServerDeleteEndpoint: e.target.value })}
            placeholder="/delete_articles.php"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>API Key</div>
          <input
            type="password"
            value={activeServer.contentServerApiKey ?? ''}
            onChange={(e) => updateServerField({ contentServerApiKey: e.target.value })}
            placeholder="API Key"
            style={textInputStyle}
          />

          <div style={miniLabelStyle}>Image Base URL (optional)</div>
          <input
            type="text"
            value={activeServer.contentServerImageBaseUrl ?? ''}
            onChange={(e) => updateServerField({ contentServerImageBaseUrl: e.target.value })}
            placeholder="Bild-Basis URL (optional), z. B. https://denisbitter.de/images"
            style={textInputStyle}
          />
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666' }}>
            Relative Bildpfade aus Post-Metadaten werden beim Server-Export gegen diese Basis-URL aufgelöst.
          </div>

          <div style={stepTitleStyle}>4. Health Checks</div>
          <div style={buttonRowStyle}>
            <button type="button" onClick={() => { void handleHealthPing(); }} disabled={!!healthChecking} style={testButtonStyle}>
              {healthChecking === 'ping' ? 'Ping...' : 'Ping prüfen'}
            </button>
            <button type="button" onClick={() => { void handleHealthUpsert(); }} disabled={!!healthChecking} style={testButtonStyle}>
              {healthChecking === 'upsert' ? 'Upsert...' : 'Upsert prüfen'}
            </button>
            <button type="button" onClick={() => { void handleHealthUpload(); }} disabled={!!healthChecking} style={testButtonStyle}>
              {healthChecking === 'upload' ? 'Upload...' : 'Upload prüfen'}
            </button>
            <button type="button" onClick={() => { void handleHealthList(); }} disabled={!!healthChecking} style={testButtonStyle}>
              {healthChecking === 'list' ? 'List...' : 'List prüfen'}
            </button>
            <button type="button" onClick={() => { void handleHealthDelete(); }} disabled={!!healthChecking} style={testButtonStyle}>
              {healthChecking === 'delete' ? 'Delete...' : 'Delete prüfen'}
            </button>
          </div>

          <div style={stepTitleStyle}>5. End-to-End testen</div>
          <div style={buttonRowStyle}>
            <button type="button" onClick={handleTestConnection} disabled={testing} style={testButtonStyle}>
              {testing ? 'API wird getestet...' : 'API testen'}
            </button>
            <button type="button" onClick={handleSendTestInsert} disabled={sendingInsert} style={testButtonStyle}>
              {sendingInsert ? 'Sende Insert...' : 'Test-Insert senden'}
            </button>
            <button type="button" onClick={handleSendTestUpdate} disabled={sendingUpdate} style={testButtonStyle}>
              {sendingUpdate ? 'Sende Update...' : 'Test-Update senden'}
            </button>
            <button type="button" onClick={handleSendTestError} disabled={sendingErrorCase} style={testButtonStyle}>
              {sendingErrorCase ? 'Sende Error...' : 'Test-Error senden'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                ...testResultStyle,
                ...(testStatus === 'success' ? testResultSuccessStyle : {}),
                ...(testStatus === 'error' ? testResultErrorStyle : {}),
                ...(testStatus === 'info' ? testResultInfoStyle : {}),
              }}
            >
              {testResult}
            </div>
          )}

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#666' }}>
            Danach in Content AI Studio: Step 1 &rarr; Speichern &rarr; Auf Server exportieren
          </div>

          <div style={dividerStyle} />

          <button
            type="button"
            onClick={() => setShowAdvancedTests((prev) => !prev)}
            style={secondaryButtonStyle}
          >
            {showAdvancedTests ? 'Erweiterte Testdaten ausblenden' : 'Erweiterte Testdaten anzeigen'}
          </button>

          {showAdvancedTests && (
            <>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555' }}>
                Test-Payloads (optional):
              </div>

              <div style={payloadWrapStyle}>
                <div style={payloadHeaderStyle}>
                  <span>Insert Payload</span>
                  <button type="button" style={copyButtonStyle} onClick={() => void copyText(testInsertPayload, 'Insert Payload')}>
                    Kopieren
                  </button>
                </div>
                <pre style={payloadStyleCompact}>{testInsertPayload}</pre>
              </div>

              <div style={payloadWrapStyle}>
                <div style={payloadHeaderStyle}>
                  <span>Update Payload</span>
                  <button type="button" style={copyButtonStyle} onClick={() => void copyText(testUpdatePayload, 'Update Payload')}>
                    Kopieren
                  </button>
                </div>
                <pre style={payloadStyleCompact}>{testUpdatePayload}</pre>
              </div>

              <div style={payloadWrapStyle}>
                <div style={payloadHeaderStyle}>
                  <span>Error Payload</span>
                  <button type="button" style={copyButtonStyle} onClick={() => void copyText(testErrorPayload, 'Error Payload')}>
                    Kopieren
                  </button>
                </div>
                <pre style={payloadStyleCompact}>{testErrorPayload}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const stepTitleStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#444',
  fontWeight: 700,
};

const miniLabelStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#666',
  marginTop: '2px',
};

const textInputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '10px 12px',
  backgroundColor: 'rgba(255,255,255,0.35)',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#222',
};

const testButtonStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '10px 14px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#AC8E66',
  backgroundColor: '#151515',
  cursor: 'pointer',
  width: 'fit-content',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid #6a5a46',
  borderRadius: '8px',
  padding: '8px 12px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#5f503f',
  backgroundColor: 'rgba(255,255,255,0.35)',
  cursor: 'pointer',
  width: 'fit-content',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const testResultStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  whiteSpace: 'pre-wrap',
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '8px 10px',
};

const testResultSuccessStyle: React.CSSProperties = {
  color: '#1f6f3f',
  backgroundColor: 'rgba(121, 199, 149, 0.15)',
  borderColor: '#7bc795',
};

const testResultErrorStyle: React.CSSProperties = {
  color: '#8b2020',
  backgroundColor: 'rgba(220, 120, 120, 0.15)',
  borderColor: '#d67b7b',
};

const testResultInfoStyle: React.CSSProperties = {
  color: '#4b4b4b',
  backgroundColor: 'rgba(255,255,255,0.35)',
};

const dividerStyle: React.CSSProperties = {
  borderBottom: '0.7px solid #AC8E66',
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#666',
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '8px 10px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  lineHeight: 1.6,
};

const payloadWrapStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  backgroundColor: 'rgba(255,255,255,0.2)',
  overflow: 'hidden',
};

const payloadHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 10px',
  borderBottom: '1px solid #3A3A3A',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#555',
};

const payloadStyleCompact: React.CSSProperties = {
  margin: 0,
  padding: '10px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#222',
  overflowX: 'auto',
  whiteSpace: 'pre',
  maxHeight: '110px',
};

const copyButtonStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '6px',
  padding: '4px 8px',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '10px',
  color: '#AC8E66',
  backgroundColor: '#151515',
  cursor: 'pointer',
};
