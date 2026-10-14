<?php
// Live permissions: administrators live in auth_db.admins, members in auth_db.users.
function bg_json($code, $message) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}
function bg_auth_db() {
    $db = new mysqli('localhost', 'root', '', 'auth_db');
    if ($db->connect_error) bg_json(500, 'Account database is unavailable.');
    $db->set_charset('utf8mb4');
    return $db;
}
function bg_user() {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    $db = bg_auth_db();

    if (($_SESSION['account_type'] ?? '') === 'admin' && !empty($_SESSION['admin_id'])) {
        $id = (int)$_SESSION['admin_id'];
        $stmt = $db->prepare('SELECT id, name, email FROM admins WHERE id=? AND is_active=1 LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $admin = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $db->close();
        if (!$admin) bg_json(401, 'Administrator account is no longer active.');
        return ['id' => (int)$admin['id'], 'identity' => 'administrator', 'is_admin' => 1,
                'account_type' => 'admin', 'official_verification' => null, 'official_review_note' => null];
    }

    // Accept member sessions created by earlier versions, but never an old is_admin flag.
    if (empty($_SESSION['user_id']) || (isset($_SESSION['account_type']) && $_SESSION['account_type'] !== 'user')) {
        $db->close();
        bg_json(401, 'Please sign in first.');
    }
    $id = (int)$_SESSION['user_id'];
    $stmt = $db->prepare('SELECT id, identity, official_verification, official_review_note FROM users WHERE id=? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $db->close();
    if (!$user) bg_json(401, 'Account no longer exists. Please sign in again.');
    $user['id'] = (int)$user['id'];
    $user['is_admin'] = 0;
    $user['account_type'] = 'user';
    return $user;
}
function bg_admin($user) {
    return ($user['account_type'] ?? '') === 'admin' && (int)($user['is_admin'] ?? 0) === 1;
}
function bg_official($user) {
    return ($user['account_type'] ?? '') === 'user' &&
           ($user['identity'] ?? '') === 'government_official' &&
           ($user['official_verification'] ?? '') === 'verified';
}
function bg_csrf() {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    $token = (string)($_POST['csrf_token'] ?? '');
    if (empty($_SESSION['report_csrf']) || !hash_equals($_SESSION['report_csrf'], $token)) {
        bg_json(403, 'Invalid request token. Reload your dashboard.');
    }
}
function bg_map_db() {
    $db = new mysqli('localhost', 'root', '', 'mappingproject');
    if ($db->connect_error) bg_json(500, 'Mapping database is unavailable.');
    $db->set_charset('utf8mb4');
    return $db;
}
