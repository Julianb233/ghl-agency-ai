-- Add domain and username columns to credentials table for browser auto-fill
-- Migration: 0012_credential_vault_columns.sql

-- Add domain column for auto-fill matching
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS domain varchar(500);

-- Add username column (stored separately for display, password stays encrypted)
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS username varchar(255);

-- Create indexes for fast domain-based lookups
CREATE INDEX IF NOT EXISTS idx_credentials_domain ON credentials(domain);
CREATE INDEX IF NOT EXISTS idx_credentials_user_domain ON credentials("userId", domain);
CREATE INDEX IF NOT EXISTS idx_credentials_user_active ON credentials("userId", "isActive");
