<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/bg_access.php';
$user = bg_user();
if (!bg_official($user)) bg_json(403, 'Only verified government officials can review reports.');
bg_csrf();

$id = filter_input(INPUT_POST, 'report_id', FILTER_VALIDATE_INT);
$decision = trim((string)($_POST['decision'] ?? ''));
$notes = trim((string)($_POST['notes'] ?? ''));
if (!$id || !in_array($decision, ['verified', 'rejected'], true) || strlen($notes) > 1000 ||
    ($decision === 'rejected' && $notes === '')) {
    bg_json(400, 'Provide a valid decision and a rejection reason.');
}

$db = bg_map_db();
try {
    $db->begin_transaction();
    $get = $db->prepare('SELECT id, latitude, longitude, radius_meters, risk_detail,
        severity, location_name, created_by, photo_path, verification_status
        FROM community_reports WHERE id=? FOR UPDATE');
    $get->bind_param('i', $id);
    $get->execute();
    $report = $get->get_result()->fetch_assoc();
    $get->close();
    if (!$report || $report['verification_status'] !== 'pending') {
        $db->rollback();
        bg_json(409, 'Report does not exist or has already been reviewed.');
    }

    if ($decision === 'rejected') {
        // Rejected reports are permanently deleted as requested.
        // Linked records are removed by the database's ON DELETE CASCADE rule.
        $delete = $db->prepare('DELETE FROM community_reports WHERE id=?');
        $delete->bind_param('i', $id);
        $delete->execute();
        $delete->close();
        $db->commit();
        $db->close();
        if (!empty($report['photo_path'])) {
            $path = (string)$report['photo_path'];
            if (preg_match('#^\.\./assets/uploads/reports/[a-f0-9]{32}\.(jpg|png|webp)$#', $path)) {
                $fullPath = realpath(__DIR__ . '/' . $path);
                $baseDir = realpath(__DIR__ . '/../assets/uploads/reports');
                if ($fullPath && $baseDir && dirname($fullPath) === $baseDir) unlink($fullPath);
            }
        }
        echo json_encode(['status'=>'success', 'message'=>'Rejected report permanently deleted.']);
        exit;
    }

    $reviewer = (int)$user['id'];
    $update = $db->prepare("UPDATE community_reports
        SET verification_status='verified', verification_note=?, verified_by=?, verified_at=NOW()
        WHERE id=? AND verification_status='pending'");
    $update->bind_param('sii', $notes, $reviewer, $id);
    $update->execute();
    $update->close();
    $db->commit();

    // Email failures never roll back a successfully verified report.
    $queued = 0;
    $noticeError = false;
    try {
        require_once __DIR__ . '/notification_helpers.php';
        $queued = bg_queue_report_email($db, 'verified_report', (int)$id, $report);
        bg_send_queued_emails($db, 3); // First three immediately; CLI worker handles remainder.
    } catch (Throwable $mailError) {
        $noticeError = true;
        error_log('BIOGUARD: Unable to queue/send verified report notice: ' . $mailError->getMessage());
    }
    $db->close();
    echo json_encode(['status'=>'success',
        'message'=>$noticeError ? 'Report verified, but notifications could not be queued. Check your database and PHP log.' :
            'Report verified. Location-based notifications queued for opted-in residents.',
        'queued_notifications'=>$queued, 'notification_warning'=>$noticeError]);
} catch (Throwable $error) {
    try { $db->rollback(); } catch (Throwable $ignored) {}
    error_log('BIOGUARD verification error: ' . $error->getMessage());
    bg_json(500, 'Unable to review report. Check the radius/notification database migration.');
}
