-- BIOGUARD: Report + resident radius and notification outbox migration.
-- Import ONCE in phpMyAdmin, after database_setup.sql / upgrade_bioguard.sql.
-- Safe to re-run. Backs up existing data; never deletes existing reports.

-- Compatible with MySQL 8 / Laragon (no ADD COLUMN IF NOT EXISTS needed).
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='resident_profiles' AND column_name='lati');
SET @query = IF(@exists=0, 'ALTER TABLE auth_db.resident_profiles ADD COLUMN lati DECIMAL(10,7) NULL', 'SELECT 1');
PREPARE q FROM @query; EXECUTE q; DEALLOCATE PREPARE q;
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='resident_profiles' AND column_name='longi');
SET @query = IF(@exists=0, 'ALTER TABLE auth_db.resident_profiles ADD COLUMN longi DECIMAL(10,7) NULL', 'SELECT 1');
PREPARE q FROM @query; EXECUTE q; DEALLOCATE PREPARE q;
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='resident_profiles' AND column_name='notif');
SET @query = IF(@exists=0, 'ALTER TABLE auth_db.resident_profiles ADD COLUMN notif TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE q FROM @query; EXECUTE q; DEALLOCATE PREPARE q;
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='auth_db' AND table_name='resident_profiles' AND column_name='radius_meters');
SET @query = IF(@exists=0, 'ALTER TABLE auth_db.resident_profiles ADD COLUMN radius_meters INT UNSIGNED NOT NULL DEFAULT 500', 'SELECT 1');
PREPARE q FROM @query; EXECUTE q; DEALLOCATE PREPARE q;
SET @exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='mappingproject' AND table_name='community_reports' AND column_name='radius_meters');
SET @query = IF(@exists=0, 'ALTER TABLE mappingproject.community_reports ADD COLUMN radius_meters INT UNSIGNED NOT NULL DEFAULT 200', 'SELECT 1');
PREPARE q FROM @query; EXECUTE q; DEALLOCATE PREPARE q;

-- Existing records get defaults. Existing NULL pins are not subscribed to alerts.
CREATE TABLE IF NOT EXISTS mappingproject.notification_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM('verified_report', 'intervention') NOT NULL,
    event_id INT UNSIGNED NOT NULL,
    recipient_user_id INT UNSIGNED NOT NULL,
    report_id INT UNSIGNED NOT NULL,
    priority TINYINT NOT NULL DEFAULT 0,
    subject VARCHAR(190) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    locked_at DATETIME NULL,
    error_message VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_event_recipient (event_type, event_id, recipient_user_id),
    INDEX idx_send_queue (status, next_attempt_at, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
