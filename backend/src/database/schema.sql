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