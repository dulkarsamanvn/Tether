<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    // The React app runs on a different origin and needs the server's cooldown.
    'exposed_headers' => ['Retry-After'],
    'max_age' => 0,
    'supports_credentials' => false,
];
