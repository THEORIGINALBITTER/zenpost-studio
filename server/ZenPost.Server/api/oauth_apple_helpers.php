<?php
require_once __DIR__ . '/oauth_config.php';

function apple_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function apple_der_to_jose(string $der, int $keySize = 256): string {
    $hex = bin2hex($der);
    if (substr($hex, 0, 2) !== '30') {
        throw new RuntimeException('Invalid DER signature.');
    }
    $hex = substr($hex, 2);
    if (substr($hex, 0, 2) === '81') {
        $hex = substr($hex, 4);
    } else {
        $hex = substr($hex, 2);
    }
    if (substr($hex, 0, 2) !== '02') {
        throw new RuntimeException('Invalid DER signature.');
    }
    $hex = substr($hex, 2);
    $rLen = hexdec(substr($hex, 0, 2));
    $hex = substr($hex, 2);
    $r = substr($hex, 0, $rLen * 2);
    $hex = substr($hex, $rLen * 2);

    if (substr($hex, 0, 2) !== '02') {
        throw new RuntimeException('Invalid DER signature.');
    }
    $hex = substr($hex, 2);
    $sLen = hexdec(substr($hex, 0, 2));
    $hex = substr($hex, 2);
    $s = substr($hex, 0, $sLen * 2);

    $r = ltrim($r, '0');
    $s = ltrim($s, '0');

    $r = str_pad($r, $keySize / 4, '0', STR_PAD_LEFT);
    $s = str_pad($s, $keySize / 4, '0', STR_PAD_LEFT);

    return hex2bin($r . $s);
}

function apple_create_client_secret(): string {
    if (APPLE_CLIENT_ID === '' || APPLE_TEAM_ID === '' || APPLE_KEY_ID === '' || APPLE_PRIVATE_KEY === '') {
        throw new RuntimeException('Apple SSO nicht konfiguriert.');
    }

    $header = ['alg' => 'ES256', 'kid' => APPLE_KEY_ID];
    $now = time();
    $payload = [
        'iss' => APPLE_TEAM_ID,
        'iat' => $now,
        'exp' => $now + 60 * 60 * 24 * 30 * 6, // 6 months
        'aud' => 'https://appleid.apple.com',
        'sub' => APPLE_CLIENT_ID,
    ];

    $segments = [
        apple_base64url_encode(json_encode($header)),
        apple_base64url_encode(json_encode($payload)),
    ];
    $data = implode('.', $segments);

    $key = openssl_pkey_get_private(APPLE_PRIVATE_KEY);
    if ($key === false) {
        throw new RuntimeException('Apple Private Key ungültig.');
    }

    $signature = '';
    $ok = openssl_sign($data, $signature, $key, OPENSSL_ALGO_SHA256);
    if (!$ok) {
        throw new RuntimeException('Apple JWT Signatur fehlgeschlagen.');
    }

    $jose = apple_der_to_jose($signature, 256);
    $segments[] = apple_base64url_encode($jose);
    return implode('.', $segments);
}
