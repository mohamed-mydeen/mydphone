-- Emergency Contact Vault — Database Schema
-- Compatible with TiDB Cloud (MySQL 8.x)

CREATE DATABASE IF NOT EXISTS emergency_vault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emergency_vault;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id               INT          NOT NULL AUTO_INCREMENT,
    user_id          INT          NOT NULL,
    full_name        VARCHAR(150) NOT NULL,
    phone_number     VARCHAR(30)  NOT NULL,
    alternate_number VARCHAR(30)  DEFAULT NULL,
    email            VARCHAR(255) DEFAULT NULL,
    address          TEXT         DEFAULT NULL,
    notes            TEXT         DEFAULT NULL,
    is_favorite      TINYINT(1)   NOT NULL DEFAULT 0,
    is_emergency     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contacts_user_id   (user_id),
    KEY idx_contacts_full_name (full_name),
    KEY idx_contacts_phone     (phone_number),
    KEY idx_contacts_email     (email),
    CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
