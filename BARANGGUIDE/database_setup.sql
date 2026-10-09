--MAY OPEN FILE BUTTON SA GILID, TAS CLICK MO YUNG RUN SQL FILE 
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS mappingproject
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE auth_db;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    identity ENUM('resident', 'government_official') NULL DEFAULT NULL,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


SET @has_identity = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='auth_db' AND table_name='users' AND column_name='identity');
SET @sql = IF(@has_identity=0,
    "ALTER TABLE auth_db.users ADD COLUMN identity ENUM('resident', 'government_official') NULL DEFAULT NULL",
    "SELECT 1");
PREPARE update_users FROM @sql;
EXECUTE update_users;
DEALLOCATE PREPARE update_users;

SET @has_admin = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='auth_db' AND table_name='users' AND column_name='is_admin');
SET @sql = IF(@has_admin=0,
    "ALTER TABLE auth_db.users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0",
    "SELECT 1");
PREPARE update_users FROM @sql;
EXECUTE update_users;
DEALLOCATE PREPARE update_users;

CREATE TABLE IF NOT EXISTS resident_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    house_address VARCHAR(255) NOT NULL,
    barangay VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL,
    province VARCHAR(120) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resident_user (user_id),
    CONSTRAINT fk_resident_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS government_profiles (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    `position` VARCHAR(120) NOT NULL,
    government_office VARCHAR(180) NOT NULL,
    office_address VARCHAR(255) NOT NULL,
    barangay VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL,
    province VARCHAR(120) NOT NULL,
    contact_number VARCHAR(30) NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    official_email VARCHAR(190) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_government_user (user_id),
    CONSTRAINT fk_government_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

USE mappingproject;

CREATE TABLE IF NOT EXISTS locationtagging (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    category VARCHAR(60) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_location_category (category)
) ENGINE=InnoDB;
