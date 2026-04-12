<?php
// oauth_config.php – Provider Keys

// Base URL of this API (no trailing slash)
define('OAUTH_BASE_URL', 'https://denisbitter.de/stage02/api');

// Google
if (!defined('GOOGLE_CLIENT_ID')) define('GOOGLE_CLIENT_ID', '');
if (!defined('GOOGLE_CLIENT_SECRET')) define('GOOGLE_CLIENT_SECRET', '');

// Microsoft
if (!defined('MICROSOFT_CLIENT_ID')) define('MICROSOFT_CLIENT_ID', '');
if (!defined('MICROSOFT_CLIENT_SECRET')) define('MICROSOFT_CLIENT_SECRET', '');

// Apple (requires JWT client secret)
if (!defined('APPLE_CLIENT_ID')) define('APPLE_CLIENT_ID', '');
if (!defined('APPLE_TEAM_ID')) define('APPLE_TEAM_ID', '');
if (!defined('APPLE_KEY_ID')) define('APPLE_KEY_ID', '');
if (!defined('APPLE_PRIVATE_KEY')) define('APPLE_PRIVATE_KEY', ''); // PEM string
