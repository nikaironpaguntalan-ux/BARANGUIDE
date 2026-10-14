<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
date_default_timezone_set('Asia/Manila');
$user = bg_user();
if (!bg_official($user)) bg_json(403, 'Only verified government officials can update interventions.');
bg_csrf();

$reportId = filter_input(INPUT_POST, 'report_id', FILTER_VALIDATE_INT);
$agency = trim((string)($_POST['agency'] ?? ''));
$action = trim((string)($_POST['action_taken'] ?? ''));
$status = trim((string)($_POST['status'] ?? ''));
$date = trim((string)($_POST['scheduled_for'] ?? ''));
if (!$reportId || $agency === '' || strlen($agency) > 150 || $action === '' ||
    strlen($action) > 1000 || !in_array($status, ['planned','ongoing','completed'], true)) {
    bg_json(400, 'Complete all intervention details.');
}
$scheduled = null;
if ($date !== '') {
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $date);
    if (!$dt || $dt->format('Y-m-d\TH:i') !== $date) bg_json(400, 'Choose a valid schedule.');
    if ($status === 'planned' && $dt < new DateTimeImmutable('now')) {
        bg_json(400, 'Planned interventions must be in the future.');
    }
    $scheduled = $dt->format('Y-m-d H:i:s');
}
if ($status === 'planned' && $scheduled === null) bg_json(400, 'Add a planned date and time.');

$db = bg_map_db();
try {
    $db->begin_transaction();
    $check = $db->prepare('SELECT id, latitude, longitude, radius_meters, risk_detail,
        severity, location_name, created_by, verification_status
        FROM community_reports WHERE id=? FOR UPDATE');
    $check->bind_param('i', $reportId);
    $check->execute();
    $report = $check->get_result()->fetch_assoc();
    $check->close();
    if (!$report || $report['verification_status'] !== 'verified') {
        $db->rollback();
        bg_json(403, 'The report must be verified before an intervention.');
    }
    $officialId = (int)$user['id'];
    $save = $db->prepare('INSERT INTO interventions
        (report_id, agency, action_taken, status, scheduled_for, created_by)
        VALUES (?, ?, ?, ?, ?, ?)');
    $save->bind_param('issssi', $reportId, $agency, $action, $status, $scheduled, $officialId);
    $save->execute();
    $interventionId = (int)$db->insert_id;
    $save->close();

    $reportStatus = 'pending';
    if ($status === 'ongoing') $reportStatus = 'in_progress';
    if ($status === 'completed') $reportStatus = 'resolved';
    $update = $db->prepare('UPDATE community_reports SET status=? WHERE id=?');
    $update->bind_param('si', $reportStatus, $reportId);
    $update->execute();
    $update->close();
    $db->commit();

    $extra = 'Agency: ' . $agency . "\n" .
             'Intervention status: ' . ucfirst($status) . "\n" .
             'Action: ' . $action . "\n";
    if ($scheduled !== null) $extra .= 'Scheduled (Philippine time): ' . $scheduled . "\n";
    $queued = 0;
    $noticeError = false;
    try {
        require_once __DIR__ . '/notification_helpers.php';
        $queued = bg_queue_report_email($db, 'intervention', $interventionId, $report, $extra);
        bg_send_queued_emails($db, 3);
    } catch (Throwable $mailError) {
        $noticeError = true;
        error_log('BIOGUARD intervention mail queue error: ' . $mailError->getMessage());
    }
    $db->close();
    echo json_encode(['status'=>'success',
        'message'=>$noticeError ? 'Intervention saved, but email notifications could not be queued.' :
            'Intervention saved. Notices queued for matching opted-in residents, including the author if subscribed.',
        'queued_notifications'=>$queued, 'notification_warning'=>$noticeError]);
} catch (Throwable $error) {
    try { $db->rollback(); } catch (Throwable $ignored) {}
    error_log('BIOGUARD intervention database error: ' . $error->getMessage());
    bg_json(500, 'Could not save intervention. Check the notification database upgrade.');
}
