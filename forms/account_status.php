<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
echo json_encode([
    'signed_in' => true,
    'identity' => $user['identity'] ?? '',
    'is_admin' => bg_admin($user),
    'account_type' => $user['account_type']
]);
