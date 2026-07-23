-- Dispatch schema. Idempotent: safe to run repeatedly (applied at boot).

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_email VARCHAR(255) NOT NULL UNIQUE,

  access_token_encrypted TEXT NOT NULL,
  access_token_iv VARCHAR(32) NOT NULL,
  access_token_auth_tag VARCHAR(32) NOT NULL,

  refresh_token_encrypted TEXT NOT NULL,
  refresh_token_iv VARCHAR(32) NOT NULL,
  refresh_token_auth_tag VARCHAR(32) NOT NULL,

  expiry_date BIGINT NOT NULL,
  scope VARCHAR(255) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Canonical application: one row per real job application, no matter how many
-- emails produced it.
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account VARCHAR(255) NOT NULL,

  company VARCHAR(512) NOT NULL,
  -- Normalized keys are short and feed the dedup index; capped at 255 to stay
  -- within InnoDB's 3072-byte index-key limit under utf8mb4.
  company_normalized VARCHAR(255) NOT NULL,
  role VARCHAR(512) NULL,
  role_normalized VARCHAR(255) NOT NULL DEFAULT '',

  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  review_status VARCHAR(32) NOT NULL DEFAULT 'auto_confirmed',
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000,

  source_count INT NOT NULL DEFAULT 0,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dedup (account, company_normalized),
  INDEX idx_review (review_status),
  INDEX idx_first_seen (first_seen_at)
);

-- Every raw Gmail message that fed an application. gmail_message_id is UNIQUE so
-- re-ingesting the same inbox never double-counts (idempotent ingest).
CREATE TABLE IF NOT EXISTS application_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,

  gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
  gmail_thread_id VARCHAR(255) NOT NULL,

  subject VARCHAR(1024) NULL,
  from_address VARCHAR(512) NULL,
  received_at DATETIME NOT NULL,

  extracted_company VARCHAR(512) NULL,
  extracted_role VARCHAR(512) NULL,
  extracted_status VARCHAR(32) NULL,
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000,
  reasoning VARCHAR(1024) NULL,
  extractor VARCHAR(16) NOT NULL,

  -- Minimal audit excerpt only (subject + short snippet). Never a full MIME dump.
  snippet VARCHAR(1024) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_source_application FOREIGN KEY (application_id)
    REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_application (application_id)
);

-- Per-day LLM call counter for the cost cap. One row per calendar day.
CREATE TABLE IF NOT EXISTS llm_usage (
  usage_day DATE PRIMARY KEY,
  request_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
