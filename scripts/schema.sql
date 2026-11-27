CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(64) PRIMARY KEY,
  value_json JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_role VARCHAR(255),
  default_query VARCHAR(255),
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_type VARCHAR(64) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_role VARCHAR(128),
  contact_name VARCHAR(255),
  address TEXT,
  city VARCHAR(128),
  website VARCHAR(512),
  whatsapp VARCHAR(64),
  email VARCHAR(255),
  source TEXT,
  status ENUM('new','queued','sent_email','sent_wa','sent_both','failed','do_not_contact') NOT NULL DEFAULT 'new',
  last_contacted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_lead (service_type, company_name(191), email(191))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_type VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email_subject VARCHAR(255) NOT NULL,
  email_template TEXT NOT NULL,
  wa_template TEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  campaign_id BIGINT UNSIGNED NULL,
  channel ENUM('email','whatsapp') NOT NULL,
  status ENUM('pending','sent','failed','skipped') NOT NULL,
  provider_message_id VARCHAR(255),
  error TEXT,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_date DATE NOT NULL,
  service_type VARCHAR(64) NOT NULL,
  selected_count INT NOT NULL DEFAULT 0,
  email_sent INT NOT NULL DEFAULT 0,
  wa_sent INT NOT NULL DEFAULT 0,
  status ENUM('running','done','failed') NOT NULL DEFAULT 'running',
  error TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_run (run_date, service_type)
);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel ENUM('email','whatsapp') NOT NULL,
  direction ENUM('inbound','outbound') NOT NULL,
  lead_id BIGINT UNSIGNED NULL,
  from_addr VARCHAR(255),
  to_addr VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  external_id VARCHAR(255),
  status ENUM('received','replied','failed','ignored') NOT NULL DEFAULT 'received',
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inbox_channel (channel, created_at),
  INDEX idx_inbox_external (channel, external_id(191))
);

CREATE TABLE IF NOT EXISTS ai_followups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('email','whatsapp') NOT NULL,
  due_at DATETIME NOT NULL,
  status ENUM('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
  reason VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  INDEX idx_followup_due (status, due_at)
);
