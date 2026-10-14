
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/bg_access.php';

date_default_timezone_set('Asia/Manila');

$user = bg_user();

if (!bg_official($user)) {
    bg_json(403, 'Only verified government officials can update interventions.');
}

bg_csrf();

// Get form information
$reportId = filter_input(INPUT_POST, 'report_id', FILTER_VALIDATE_INT);
$agency = trim((string)($_POST['agency'] ?? ''));
$action = trim((string)($_POST['action_taken'] ?? ''));
$status = trim((string)($_POST['status'] ?? ''));
$date = trim((string)($_POST['scheduled_for'] ?? ''));

// Validate information
if (!$reportId || $agency === '' || strlen($agency) > 150 ||
    $action === '' || strlen($action) > 1000 ||
    !in_array($status, ['planned', 'ongoing', 'completed'], true)) {

    bg_json(400, 'Complete all intervention details.');
}

// Validate intervention schedule
$scheduled = null;

if ($date !== '') {

    $dt = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $date);

    if (!$dt || $dt->format('Y-m-d\TH:i') !== $date) {
        bg_json(400, 'Choose a valid intervention date and time.');
    }

    if ($status === 'planned' && $dt < new DateTimeImmutable('now')) {
        bg_json(400, 'Planned intervention must be scheduled in the future.');
    }

    $scheduled = $dt->format('Y-m-d H:i:s');
}

if ($status === 'planned' && $scheduled === null) {
    bg_json(400, 'A planned intervention requires a schedule.');
}

// Connect to mapping database
$db = bg_map_db();

$db->begin_transaction();

// Find the report
$check = $db->prepare(
    'SELECT verification_status, created_by, location_name
     FROM community_reports
     WHERE id=? FOR UPDATE'
);

$check->bind_param('i', $reportId);
$check->execute();

$report = $check->get_result()->fetch_assoc();
$check->close();

if (!$report || $report['verification_status'] !== 'verified') {

    $db->rollback();

    bg_json(403, 'Reports must be verified before intervention.');
}

// Check previous intervention status
$previous = $db->prepare(
    'SELECT status FROM interventions
     WHERE report_id=?
     ORDER BY id DESC LIMIT 1'
);

$previous->bind_param('i', $reportId);
$previous->execute();

$oldIntervention = $previous->get_result()->fetch_assoc();
$previous->close();

// Only notify when the status is new or changed
$shouldNotify = false;

if (!$oldIntervention || $oldIntervention['status'] !== $status) {
    $shouldNotify = true;
}

// Save intervention
$userId = (int)$user['id'];

$insert = $db->prepare(
    'INSERT INTO interventions
    (report_id, agency, action_taken, status, scheduled_for, created_by)
    VALUES (?, ?, ?, ?, ?, ?)'
);

$insert->bind_param(
    'issssi',
    $reportId,
    $agency,
    $action,
    $status,
    $scheduled,
    $userId
);

// Update report status
$reportStatus = 'pending';

if ($status === 'ongoing') {
    $reportStatus = 'in_progress';
}

if ($status === 'completed') {
    $reportStatus = 'resolved';
}

$update = $db->prepare(
    'UPDATE community_reports SET status=? WHERE id=?'
);

$update->bind_param('si', $reportStatus, $reportId);

$ok = $insert->execute() && $update->execute();

if ($ok) {
    $db->commit();
} else {
    $db->rollback();
}

$insert->close();
$update->close();

if (!$ok) {
    $db->close();
    bg_json(500, 'Unable to save intervention.');
}

// Find the resident email after successful saving
$receiver = '';

if ($shouldNotify) {

    $residentId = (int)$report['created_by'];

    $findEmail = $db->prepare(
        "SELECT email FROM auth_db.users
         WHERE id=?
         AND identity='resident'
         AND email_notifications=1
         LIMIT 1"
    );

    $findEmail->bind_param('i', $residentId);
    $findEmail->execute();

    $resident = $findEmail->get_result()->fetch_assoc();

    if ($resident) {
        $receiver = $resident['email'];
    }

    $findEmail->close();
}

$db->close();

// Send the notification
if ($receiver !== '') {

    require_once __DIR__ . '/mail_config.php';

    $subject = 'BARANGUIDE | Intervention Update';

    $message = "Hello,\n\n";
    $message .= "An intervention update has been recorded for your report.\n\n";
    $message .= "Location: " . $report['location_name'] . "\n";
    $message .= "Agency: " . $agency . "\n";
    $message .= "Status: " . ucfirst($status) . "\n";

    if ($scheduled !== null) {
        $message .= "Scheduled For: " . $scheduled . " (Philippine Time)\n";
    }

    $message .= "\nPlease log in to BARANGUIDE for further details.\n\n";
    $message .= "BARANGUIDE Community Risk Monitoring System";

    sendEmail($receiver, $subject, $message);
}

echo json_encode([
    'status' => 'success',
    'message' => 'Intervention scheduled / updated successfully.'
]);

?>
