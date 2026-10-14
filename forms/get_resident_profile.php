<?php
// Return ONLY the currently signed-in resident's own saved profile.
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if (($user['identity'] ?? '') !== 'resident') bg_json(403, 'Resident account required.');

$db = bg_auth_db();
$id = (int)$user['id'];
$stmt = $db->prepare('SELECT contact_number, house_address, barangay, city,
    province, postal_code, lati, longi, notif, radius_meters
    FROM resident_profiles WHERE user_id=? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$profile = $stmt->get_result()->fetch_assoc();
$stmt->close();
$db->close();
echo json_encode(['success'=>true, 'data'=>$profile ?: null]);
