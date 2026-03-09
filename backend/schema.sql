-- =============================================
-- Movies4Hub Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS movies4hub;
USE movies4hub;

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)   PRIMARY KEY,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password        VARCHAR(255)  NOT NULL,
  username        VARCHAR(100)  NOT NULL,
  role            ENUM('user', 'super_admin', 'content_admin', 'support_admin') DEFAULT 'user',
  isPremium       BOOLEAN       DEFAULT FALSE,
  premiumExpiry   DATETIME      DEFAULT NULL,
  isBanned        BOOLEAN       DEFAULT FALSE,
  themePreference ENUM('dark', 'light') DEFAULT 'dark',
  createdAt       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_premium (isPremium, premiumExpiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- ADS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ads (
  id          VARCHAR(36)   PRIMARY KEY,
  placement   ENUM('home_banner', 'player_top', 'player_bottom', 'popup', 'sidebar', 'footer', 'between_content', 'preroll', 'midroll', 'overlay') NOT NULL,
  type        ENUM('banner', 'script', 'vast') NOT NULL,
  code        TEXT          NOT NULL,
  isActive    BOOLEAN       DEFAULT TRUE,
  createdAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_placement (placement),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS content (
  id          VARCHAR(36)   PRIMARY KEY,
  type        ENUM('movie', 'anime') NOT NULL,
  sourceType  ENUM('scraped', 'manual') DEFAULT 'manual',
  title       VARCHAR(500)  NOT NULL,
  description TEXT,
  poster      VARCHAR(1000),
  backdrop    VARCHAR(1000),
  streamUrl   VARCHAR(1000),
  quality     ENUM('360p', '480p', '720p', '1080p', '4k') DEFAULT '1080p',
  subtitles   JSON          DEFAULT NULL,
  isFeatured  BOOLEAN       DEFAULT FALSE,
  createdBy   VARCHAR(36),
  createdAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_type (type),
  INDEX idx_featured (isFeatured),
  INDEX idx_source (sourceType),
  FULLTEXT INDEX idx_search (title, description),

  CONSTRAINT fk_content_creator FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- WATCH HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS watch_history (
  id          VARCHAR(36)   PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  content_id  VARCHAR(255)  NOT NULL,
  episode_id  VARCHAR(255)  NOT NULL,
  progress    INT           DEFAULT 0,
  duration    INT           DEFAULT 0,
  completed   BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),
  INDEX idx_user_episode (user_id, episode_id),
  INDEX idx_continue (user_id, completed, updated_at),

  CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SEED DEFAULT SUPER ADMIN
-- Password: Admin@123 (bcrypt hash)
-- =============================================
INSERT INTO users (id, email, password, username, role) VALUES (
  UUID(),
  'admin@movies4hub.com',
  '$2a$12$LJ3m4yG8MjFJGJOlGz1NKuRWzPFeAEH4GxCxKJB4e.KLWzq1j0C0e',
  'SuperAdmin',
  'super_admin'
) ON DUPLICATE KEY UPDATE email = email;

