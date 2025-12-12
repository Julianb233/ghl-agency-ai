-- Memory System Migration
-- Creates tables for Agent Memory and Reasoning Bank
-- Run this migration to add memory capabilities to your database

-- ========================================
-- Memory Entries Table
-- ========================================
CREATE TABLE IF NOT EXISTS memory_entries (
  id SERIAL PRIMARY KEY,
  entry_id VARCHAR(255) NOT NULL UNIQUE,
  session_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255),
  user_id INTEGER,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  embedding JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for memory_entries
CREATE INDEX IF NOT EXISTS memory_session_id_idx ON memory_entries(session_id);
CREATE INDEX IF NOT EXISTS memory_agent_id_idx ON memory_entries(agent_id);
CREATE INDEX IF NOT EXISTS memory_user_id_idx ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS memory_key_idx ON memory_entries(key);
CREATE INDEX IF NOT EXISTS memory_created_at_idx ON memory_entries(created_at);
CREATE INDEX IF NOT EXISTS memory_expires_at_idx ON memory_entries(expires_at) WHERE expires_at IS NOT NULL;

-- Partial index for non-expired entries (most common query)
CREATE INDEX IF NOT EXISTS memory_active_entries_idx ON memory_entries(session_id, created_at DESC)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ========================================
-- Reasoning Patterns Table
-- ========================================
CREATE TABLE IF NOT EXISTS reasoning_patterns (
  id SERIAL PRIMARY KEY,
  pattern_id VARCHAR(255) NOT NULL UNIQUE,
  pattern TEXT NOT NULL,
  result JSONB NOT NULL,
  context JSONB,
  confidence REAL NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  success_rate REAL NOT NULL DEFAULT 1.0 CHECK (success_rate >= 0 AND success_rate <= 1),
  domain VARCHAR(255),
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  embedding JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Indexes for reasoning_patterns
CREATE INDEX IF NOT EXISTS reasoning_domain_idx ON reasoning_patterns(domain);
CREATE INDEX IF NOT EXISTS reasoning_confidence_idx ON reasoning_patterns(confidence);
CREATE INDEX IF NOT EXISTS reasoning_usage_count_idx ON reasoning_patterns(usage_count);
CREATE INDEX IF NOT EXISTS reasoning_success_rate_idx ON reasoning_patterns(success_rate);
CREATE INDEX IF NOT EXISTS reasoning_pattern_text_idx ON reasoning_patterns USING gin(to_tsvector('english', pattern));

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS reasoning_domain_confidence_idx ON reasoning_patterns(domain, confidence DESC, usage_count DESC);

-- ========================================
-- Session Contexts Table
-- ========================================
CREATE TABLE IF NOT EXISTS session_contexts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER,
  agent_id VARCHAR(255),
  context JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for session_contexts
CREATE INDEX IF NOT EXISTS session_context_id_idx ON session_contexts(session_id);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON session_contexts(user_id);
CREATE INDEX IF NOT EXISTS session_created_at_idx ON session_contexts(created_at);

-- ========================================
-- Functions and Triggers
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for memory_entries
DROP TRIGGER IF EXISTS update_memory_entries_updated_at ON memory_entries;
CREATE TRIGGER update_memory_entries_updated_at
  BEFORE UPDATE ON memory_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reasoning_patterns
DROP TRIGGER IF EXISTS update_reasoning_patterns_updated_at ON reasoning_patterns;
CREATE TRIGGER update_reasoning_patterns_updated_at
  BEFORE UPDATE ON reasoning_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session_contexts
DROP TRIGGER IF EXISTS update_session_contexts_updated_at ON session_contexts;
CREATE TRIGGER update_session_contexts_updated_at
  BEFORE UPDATE ON session_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Cleanup Functions
-- ========================================

-- Function to clean up expired memory entries
CREATE OR REPLACE FUNCTION cleanup_expired_memory_entries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM memory_entries
  WHERE expires_at IS NOT NULL AND expires_at <= NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up low-performing reasoning patterns
CREATE OR REPLACE FUNCTION cleanup_low_performance_patterns(
  min_usage_count INTEGER DEFAULT 5,
  min_success_rate REAL DEFAULT 0.3
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM reasoning_patterns
  WHERE usage_count >= min_usage_count
    AND success_rate < min_success_rate;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Views for Common Queries
-- ========================================

-- View for active memory entries (non-expired)
CREATE OR REPLACE VIEW active_memory_entries AS
SELECT *
FROM memory_entries
WHERE expires_at IS NULL OR expires_at > NOW()
ORDER BY created_at DESC;

-- View for high-performance reasoning patterns
CREATE OR REPLACE VIEW top_reasoning_patterns AS
SELECT
  pattern_id,
  pattern,
  result,
  confidence,
  usage_count,
  success_rate,
  domain,
  tags,
  (confidence * success_rate * LOG(usage_count + 1)) AS performance_score
FROM reasoning_patterns
WHERE usage_count > 0
ORDER BY performance_score DESC;

-- View for session statistics
CREATE OR REPLACE VIEW session_stats AS
SELECT
  sc.session_id,
  sc.user_id,
  sc.agent_id,
  sc.created_at,
  sc.updated_at,
  COUNT(me.id) AS memory_count,
  COUNT(CASE WHEN me.expires_at IS NULL OR me.expires_at > NOW() THEN 1 END) AS active_memory_count
FROM session_contexts sc
LEFT JOIN memory_entries me ON sc.session_id = me.session_id
GROUP BY sc.session_id, sc.user_id, sc.agent_id, sc.created_at, sc.updated_at;

-- ========================================
-- Grant Permissions (adjust as needed)
-- ========================================

-- Grant permissions to your application user
-- Replace 'your_app_user' with your actual database user
-- GRANT ALL PRIVILEGES ON memory_entries TO your_app_user;
-- GRANT ALL PRIVILEGES ON reasoning_patterns TO your_app_user;
-- GRANT ALL PRIVILEGES ON session_contexts TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TABLE memory_entries IS 'Stores agent context and session data for multi-agent coordination';
COMMENT ON TABLE reasoning_patterns IS 'Stores agent reasoning patterns for learning and reuse';
COMMENT ON TABLE session_contexts IS 'Stores high-level session information and shared context';

COMMENT ON COLUMN memory_entries.entry_id IS 'Unique identifier for the memory entry (UUID)';
COMMENT ON COLUMN memory_entries.session_id IS 'Session identifier for grouping related memories';
COMMENT ON COLUMN memory_entries.embedding IS 'Vector embedding for semantic search (stored as JSON array)';
COMMENT ON COLUMN memory_entries.expires_at IS 'Expiration timestamp for TTL-based cleanup';

COMMENT ON COLUMN reasoning_patterns.confidence IS 'Confidence score (0.0-1.0) based on success rate';
COMMENT ON COLUMN reasoning_patterns.usage_count IS 'Number of times this pattern has been used';
COMMENT ON COLUMN reasoning_patterns.success_rate IS 'Success rate (0.0-1.0) of this pattern';

COMMENT ON FUNCTION cleanup_expired_memory_entries() IS 'Removes expired memory entries and returns count deleted';
COMMENT ON FUNCTION cleanup_low_performance_patterns(INTEGER, REAL) IS 'Removes low-performing reasoning patterns and returns count deleted';

-- ========================================
-- Migration Complete
-- ========================================

-- Insert a test record to verify migration
DO $$
BEGIN
  RAISE NOTICE 'Memory System migration completed successfully!';
  RAISE NOTICE 'Tables created: memory_entries, reasoning_patterns, session_contexts';
  RAISE NOTICE 'Views created: active_memory_entries, top_reasoning_patterns, session_stats';
  RAISE NOTICE 'Functions created: cleanup_expired_memory_entries, cleanup_low_performance_patterns';
END $$;
