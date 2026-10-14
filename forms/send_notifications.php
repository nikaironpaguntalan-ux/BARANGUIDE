<?php
// CLI-ONLY email worker: run every minute with Windows Task Scheduler.
// e.g. C:\laragon\bin\php\php-8.x\php.exe C:\laragon\www\ren\FIN\forms\send_notifications.php
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}
require_once __DIR__ . '/notification_helpers.php';
// Database connection defaults match the rest of the uploaded application.
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $db = new mysqli('localhost', 'root', '', 'mappingproject');
    $db->set_charset('utf8mb4');
    $result = bg_send_queued_emails($db, 20);
    $db->close();
    echo 'Sent: ' . $result['sent'] . '; Failed attempts: ' . $result['failed'] . PHP_EOL;
} catch (Throwable $e) {
    error_log('BIOGUARD mail worker: ' . $e->getMessage());
    fwrite(STDERR, "Mail worker failed; see PHP error log.\n");
    exit(1);
}
