<?php
// Terminal only: never expose administrator registration to the public website.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Forbidden'); }
$email = strtolower(trim((string)($argv[1] ?? '')));
$name = trim((string)($argv[2] ?? 'Administrator'));
$password = getenv('BARANGUIDE_ADMIN_PASSWORD');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === '' || !$password || strlen($password) < 12) {
    exit("Set BARANGUIDE_ADMIN_PASSWORD to 12+ characters and run: php forms/create_admin.php admin@example.com Administrator\n");
}
$db = new mysqli('localhost', 'root', '', 'auth_db');
if ($db->connect_error) exit("Cannot connect to auth_db.\n");
$db->set_charset('utf8mb4');
// Prevent two account types from claiming the same email address.
$check = $db->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
$check->bind_param('s', $email);
$check->execute();
if ($check->get_result()->num_rows > 0) exit("This email belongs to an existing member. Use a different admin email.\n");
$check->close();
$hash = password_hash($password, PASSWORD_DEFAULT);
$check = $db->prepare('SELECT id FROM admins WHERE email=? LIMIT 1');
$check->bind_param('s', $email);
$check->execute();
$existing = $check->get_result()->fetch_assoc();
$check->close();
if ($existing) {
    $stmt = $db->prepare('UPDATE admins SET name=?, password_hash=?, is_active=1 WHERE id=?');
    $stmt->bind_param('ssi', $name, $hash, $existing['id']);
} else {
    $stmt = $db->prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->bind_param('sss', $name, $email, $hash);
}
$ok = $stmt->execute();
$stmt->close();
$db->close();
if (!$ok) exit("Administrator could not be created.\n");
echo "Administrator account ready. Sign in through index.html.\n";
