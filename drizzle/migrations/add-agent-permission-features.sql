-- Migration: Add Agent Permission Features to Subscription Tiers
-- Description: Updates subscription tier feature flags to support agent execution permissions
-- Created: 2025-12-15

-- Update Starter tier (basic execution only)
UPDATE subscription_tiers
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{advancedAgentExecution}',
  'false'::jsonb
)
WHERE slug = 'starter';

-- Update Growth tier (can enable advanced with feature flag)
UPDATE subscription_tiers
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{advancedAgentExecution}',
  'false'::jsonb
)
WHERE slug = 'growth';

-- Update Professional tier (can enable advanced with feature flag)
UPDATE subscription_tiers
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{advancedAgentExecution}',
  'false'::jsonb
)
WHERE slug = 'professional';

-- Update Enterprise tier (advanced execution by default)
UPDATE subscription_tiers
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{advancedAgentExecution}',
  'true'::jsonb
)
WHERE slug = 'enterprise';

-- Add description of agent execution capabilities to each tier
UPDATE subscription_tiers
SET description = description || E'\n\nAgent Execution: View-only access. Cannot execute agents.'
WHERE slug NOT IN ('starter', 'growth', 'professional', 'enterprise')
  AND (features->>'advancedAgentExecution' IS NULL OR features->>'advancedAgentExecution' = 'false');

UPDATE subscription_tiers
SET description = REPLACE(description,
  'Agent Execution: View-only access. Cannot execute agents.',
  'Agent Execution: Basic execution (safe, read-only tools).'
)
WHERE slug = 'starter';

UPDATE subscription_tiers
SET description = COALESCE(description, '') ||
  CASE
    WHEN description NOT LIKE '%Agent Execution:%'
    THEN E'\n\nAgent Execution: Basic execution (safe, read-only tools). Can be upgraded to Advanced.'
    ELSE ''
  END
WHERE slug IN ('growth', 'professional')
  AND (features->>'advancedAgentExecution' = 'false' OR features->>'advancedAgentExecution' IS NULL);

UPDATE subscription_tiers
SET description = COALESCE(description, '') ||
  CASE
    WHEN description NOT LIKE '%Agent Execution:%'
    THEN E'\n\nAgent Execution: Advanced execution (includes API calls, browser automation).'
    ELSE ''
  END
WHERE slug = 'enterprise';

-- Create index on features JSONB column for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_features
ON subscription_tiers USING gin(features);

-- Add comment explaining the feature flag
COMMENT ON COLUMN subscription_tiers.features IS
'Feature flags for subscription tier.
advancedAgentExecution: When true, allows moderate-risk tool execution (HTTP requests, browser interaction).
Defaults to false for Starter/Growth/Professional, true for Enterprise.';
