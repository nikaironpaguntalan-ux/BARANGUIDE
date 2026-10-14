-- Run once in HeidiSQL/phpMyAdmin for existing BIOGUARD installations.
-- Older reports remain without an invented estimated radius.
ALTER TABLE mappingproject.community_reports
ADD COLUMN radius_meters INT UNSIGNED NULL DEFAULT NULL AFTER longitude;
