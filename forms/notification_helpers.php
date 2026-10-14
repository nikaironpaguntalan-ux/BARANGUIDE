<?php
// BIOGUARD: location matching + persistent email queue.
// The user's chosen radius AND the submitted report radius must overlap.
// The user must have opted in (resident_profiles.notif = 1).

function bg_distance_meters($lat1, $lng1, $lat2, $lng2) {
    // Haversine formula: approximate distance on Earth's surface, in meters.
    $earthRadius = 6371000;
    $a1 = deg2rad((float)$lat1);
    $a2 = deg2rad((float)$lat2);
    $dLat = deg2rad((float)$lat2 - (float)$lat1);
    $dLng = deg2rad((float)$lng2 - (float)$lng1);
    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos($a1) * cos($a2) * sin($dLng / 2) * sin($dLng / 2);
    return 2 * $earthRadius * atan2(sqrt($a), sqrt(max(0, 1 - $a)));
}

function bg_queue_report_email(mysqli $db, $eventType, $eventId, array $report, $extra = '') {
    if ($eventType !== 'verified_report' && $eventType !== 'intervention') {
        return 0;
    }
    $reportId = (int)$report['id'];
    $reportRadius = (int)$report['radius_meters'];
    $severity = (string)$report['severity'];
    $priority = ($severity === 'critical') ? 2 : (($severity === 'high') ? 1 : 0);
    $reportOwner = (int)$report['created_by'];
    $location = (string)$report['location_name'];
    $detail = (string)$report['risk_detail'];

    if ($eventType === 'verified_report') {
        $subject = 'BIOGUARD | Verified community report nearby';
        $message = "A community report has been reviewed by an authorized official.\n\n" .
            "Observation: " . $detail . "\n" .
            "Area: " . $location . "\n" .
            "Reported urgency: " . ucfirst($severity) . "\n\n" .
            "The report is not a confirmed medical diagnosis or outbreak notice. " .
            "Follow your local health office's official guidance.\n\n" .
            "Sign in to BIOGUARD for details.";
    } else {
        $subject = 'BIOGUARD | Community intervention update';
        $message = "A government intervention has been recorded for a verified community report.\n\n" .
            "Observation: " . $detail . "\n" .
            "Area: " . $location . "\n" .
            $extra . "\n\nSign in to BIOGUARD for details.";
    }

    // The original author receives the update too, provided they opted in,
    // even if they subsequently chose a smaller geographical notification radius.
    $sql = "SELECT u.id AS user_id, p.lati, p.longi, p.radius_meters
            FROM auth_db.users u
            INNER JOIN auth_db.resident_profiles p ON p.user_id = u.id
            WHERE u.identity = 'resident' AND p.notif = 1
              AND p.lati IS NOT NULL AND p.longi IS NOT NULL";
    $people = $db->query($sql);
    $insert = $db->prepare("INSERT IGNORE INTO notification_outbox
        (event_type, event_id, recipient_user_id, report_id, priority, subject, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    $inserted = 0;
    while ($person = $people->fetch_assoc()) {
        $userId = (int)$person['user_id'];
        $residentRadius = (int)$person['radius_meters'];
        $distance = bg_distance_meters(
            $report['latitude'], $report['longitude'], $person['lati'], $person['longi']
        );
        $overlapping = $distance <= ($reportRadius + $residentRadius);
        if (!$overlapping && $userId !== $reportOwner) {
            continue;
        }
        $insert->bind_param('siiiiss', $eventType, $eventId, $userId, $reportId,
                            $priority, $subject, $message);
        $insert->execute();
        $inserted += $insert->affected_rows;
    }
    $insert->close();
    $people->free();
    return $inserted;
}

function bg_send_queued_emails(mysqli $db, $limit) {
    // Recover jobs abandoned by a PHP crash or stalled mail connection.
    $db->query("UPDATE notification_outbox SET status='failed'
               WHERE status='sending' AND locked_at < DATE_SUB(NOW(), INTERVAL 20 MINUTE)");

    $limit = max(1, min(20, (int)$limit));
    $stmt = $db->prepare("SELECT n.id, n.subject, n.message, u.email
        FROM notification_outbox n
        INNER JOIN auth_db.users u ON u.id = n.recipient_user_id
        INNER JOIN auth_db.resident_profiles p ON p.user_id = u.id
        WHERE n.status IN ('pending', 'failed')
          AND n.attempts < 4 AND n.next_attempt_at <= NOW()
          AND u.identity='resident' AND p.notif=1
        ORDER BY n.priority DESC, n.created_at ASC, n.id ASC LIMIT ?");
    $stmt->bind_param('i', $limit);
    $stmt->execute();
    $jobs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    require_once __DIR__ . '/mail_config.php';
    $sent = 0;
    $failed = 0;
    foreach ($jobs as $job) {
        $id = (int)$job['id'];
        // Claim one message so simultaneous requests cannot send it twice.
        $claim = $db->prepare("UPDATE notification_outbox
            SET status='sending', locked_at=NOW(), attempts=attempts+1
            WHERE id=? AND status IN ('pending','failed')
                  AND next_attempt_at<=NOW() AND attempts<4");
        $claim->bind_param('i', $id);
        $claim->execute();
        $claimed = $claim->affected_rows === 1;
        $claim->close();
        if (!$claimed) continue;
        $success = sendEmail($job['email'], $job['subject'], $job['message']);
        if ($success) {
            $update = $db->prepare("UPDATE notification_outbox
                SET status='sent', sent_at=NOW(), locked_at=NULL, error_message=NULL WHERE id=?");
            $update->bind_param('i', $id);
            $sent++;
        } else {
            // Automatic retries: after 5, 15, 45, 45 minutes.
            $delay = 15;
            $update = $db->prepare("UPDATE notification_outbox
                SET status='failed', locked_at=NULL, error_message='Mail delivery failed',
                    next_attempt_at=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id=?");
            $update->bind_param('ii', $delay, $id);
            $failed++;
        }
        $update->execute();
        $update->close();
    }
    return ['sent' => $sent, 'failed' => $failed];
}
