-- =============================================
-- Phase 5 Migration — Watchlist + Ad Settings
-- =============================================

CREATE TABLE IF NOT EXISTS watchlist (
  id          VARCHAR(36)   PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  content_id  VARCHAR(255)  NOT NULL,
  type        ENUM('anime', 'movie') NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),
  INDEX idx_user_content (user_id, content_id, type),
  INDEX idx_type (type),

  CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ad_settings (
  id                  INT           PRIMARY KEY DEFAULT 1,
  global_ads_enabled  BOOLEAN       DEFAULT TRUE,
  enable_preroll      BOOLEAN       DEFAULT TRUE,
  enable_midroll      BOOLEAN       DEFAULT FALSE,
  enable_banner       BOOLEAN       DEFAULT TRUE,
  midroll_interval    INT           DEFAULT 300,
  updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default ad settings
INSERT INTO ad_settings (id, global_ads_enabled, enable_preroll, enable_midroll, enable_banner, midroll_interval)
VALUES (1, TRUE, TRUE, FALSE, TRUE, 300)
ON DUPLICATE KEY UPDATE id = id;
