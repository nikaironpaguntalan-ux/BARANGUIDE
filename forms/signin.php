<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/bg_access.php';
$data = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    echo json_encode(['success' => false, 'message' => 'Enter a valid email and password.']);
    exit;
}
$db = bg_auth_db();

// Administrator emails are checked first; they never authenticate through users.
$stmt = $db->prepare('SELECT id, name, email, password_hash, is_active FROM admins WHERE email=? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$admin = $stmt->get_result()->fetch_assoc();
$stmt->close();
if ($admin) {
    if (!(int)$admin['is_active'] || !password_verify($password, $admin['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
        $db->close();
        exit;
    }
    session_regenerate_id(true);
    $_SESSION = [];
    $_SESSION['account_type'] = 'admin';
    $_SESSION['admin_id'] = (int)$admin['id'];
    $_SESSION['user_name'] = $admin['name'];
    $_SESSION['user_email'] = $admin['email'];
    $update = $db->prepare('UPDATE admins SET last_login_at=NOW() WHERE id=?');
    $update->bind_param('i', $admin['id']);
    $update->execute();
    $update->close();
    $db->close();
    echo json_encode(['success' => true, 'message' => 'Administrator signed in.', 'redirect' => 'forms/dashboard.php']);
    exit;
}

$stmt = $db->prepare("SELECT id, name, email, password_hash, COALESCE(identity, '') AS identity FROM users WHERE email=? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$user || !password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    $db->close();
    exit;
}
session_regenerate_id(true);
$_SESSION = [];
$_SESSION['account_type'] = 'user';
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_identity'] = $user['identity'];
$update = $db->prepare('UPDATE users SET last_login_at=NOW() WHERE id=?');
$update->bind_param('i', $user['id']);
$update->execute();
$update->close();
$db->close();
echo json_encode(['success' => true, 'message' => 'Sign in successful.',
    'redirect' => $user['identity'] === '' ? 'user.html' : 'forms/dashboard.php']);
