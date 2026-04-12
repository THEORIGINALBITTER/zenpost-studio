<?php

function zenpost_is_allowed_origin(string $origin): bool
{
    if ($origin === '') return false;

    if ($origin === 'tauri://localhost') return true;

    // Stage02 API is used by local web dev, desktop webview and production web.
    // Reflect all normal http/https origins so browser CORS does not block
    // documents_list/download/upload/update/delete.
    return preg_match('#^https?://[A-Za-z0-9\.\-]+(?::\d+)?$#', $origin) === 1;
}

function zenpost_apply_cors(
    string $methods = 'GET, POST, OPTIONS',
    string $headers = 'Content-Type, X-Auth-Token'
): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Avoid duplicate/competing headers from earlier bootstrap code or host config.
    if (function_exists('header_remove')) {
        @header_remove('Access-Control-Allow-Origin');
        @header_remove('Access-Control-Allow-Methods');
        @header_remove('Access-Control-Allow-Headers');
        @header_remove('Access-Control-Expose-Headers');
        @header_remove('Access-Control-Max-Age');
        @header_remove('Access-Control-Allow-Credentials');
        @header_remove('Vary');
    }

    if (zenpost_is_allowed_origin($origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
    } else {
        header('Access-Control-Allow-Origin: *');
    }

    header("Access-Control-Allow-Methods: {$methods}");
    header("Access-Control-Allow-Headers: {$headers}");
    header('Access-Control-Expose-Headers: Content-Type, Content-Disposition, Content-Length');
    header('Access-Control-Max-Age: 86400');
    header('Access-Control-Allow-Credentials: false');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

function zenpost_json_response_header(): void
{
    header('Content-Type: application/json; charset=utf-8');
}
