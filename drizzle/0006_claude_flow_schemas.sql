-- Claude Flow Combined Schemas Migration
-- Converted from MySQL/SQLite to PostgreSQL
-- Source: Julianb233/claude-flow

-- =============================================
-- PART 1: SWARM COORDINATION TABLES
-- =============================================

-- Swarms table - stores swarm configurations and metadata
CREATE TABLE IF NOT EXISTS cf_swarms (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    topology VARCHAR(20) NOT NULL CHECK (topology IN ('hierarchical', 'mesh', 'ring', 'star')),
    queen_mode VARCHAR(20) DEFAULT 'centralized' CHECK (queen_mode IN ('centralized', 'distributed')),
    max_agents INTEGER DEFAULT 8,
    strategy VARCHAR(20) DEFAULT 'balanced' CHECK (strategy IN ('balanced', 'specialized', 'adaptive')),
    status VARCHAR(20) DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'paused', 'destroyed', 'archived')),
    consensus_threshold DECIMAL(3,2) DEFAULT 0.66,
    memory_ttl INTEGER DEFAULT 86400,
    config JSONB,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    destroyed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_swarms_status ON cf_swarms(status);
CREATE INDEX IF NOT EXISTS idx_cf_swarms_created_at ON cf_swarms(created_at);

-- Agents table - stores individual agent information
CREATE TABLE IF NOT EXISTS cf_agents (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) NOT NULL REFERENCES cf_swarms(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'spawning' CHECK (status IN ('spawning', 'idle', 'busy', 'active', 'error', 'terminated', 'offline')),
    capabilities JSONB,
    config JSONB,
    metadata JSONB,
    current_task_id VARCHAR(255),
    message_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_active_at TIMESTAMP,
    terminated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_agents_swarm ON cf_agents(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_agents_status ON cf_agents(status);
CREATE INDEX IF NOT EXISTS idx_cf_agents_type ON cf_agents(type);

-- Tasks table - stores task definitions and state
CREATE TABLE IF NOT EXISTS cf_tasks (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) NOT NULL REFERENCES cf_swarms(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    strategy VARCHAR(20) DEFAULT 'adaptive' CHECK (strategy IN ('parallel', 'sequential', 'adaptive', 'consensus')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'running', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    max_agents INTEGER,
    requirements JSONB,
    metadata JSONB,
    result JSONB,
    error_message TEXT,
    dependencies JSONB,
    assigned_agents JSONB,
    assigned_to VARCHAR(255),
    require_consensus BOOLEAN DEFAULT false,
    consensus_achieved BOOLEAN,
    required_capabilities JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_tasks_swarm ON cf_tasks(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_tasks_status ON cf_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cf_tasks_priority ON cf_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_cf_tasks_created_at ON cf_tasks(created_at);

-- Add FK for assigned_to after tasks table exists
ALTER TABLE cf_agents DROP CONSTRAINT IF EXISTS cf_agents_current_task_fk;
ALTER TABLE cf_agents ADD CONSTRAINT cf_agents_current_task_fk
    FOREIGN KEY (current_task_id) REFERENCES cf_tasks(id) ON DELETE SET NULL;

-- Task assignments table
CREATE TABLE IF NOT EXISTS cf_task_assignments (
    id VARCHAR(255) PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL REFERENCES cf_tasks(id) ON DELETE CASCADE,
    agent_id VARCHAR(255) NOT NULL REFERENCES cf_agents(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(task_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_assignments_task ON cf_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_cf_assignments_agent ON cf_task_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_cf_assignments_status ON cf_task_assignments(status);

-- =============================================
-- PART 2: RESOURCES & ALLOCATION
-- =============================================

CREATE TABLE IF NOT EXISTS cf_resources (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    capacity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'allocated', 'locked', 'error')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cf_resources_type ON cf_resources(type);
CREATE INDEX IF NOT EXISTS idx_cf_resources_status ON cf_resources(status);

CREATE TABLE IF NOT EXISTS cf_resource_allocations (
    id VARCHAR(255) PRIMARY KEY,
    resource_id VARCHAR(255) NOT NULL REFERENCES cf_resources(id) ON DELETE CASCADE,
    agent_id VARCHAR(255) NOT NULL REFERENCES cf_agents(id) ON DELETE CASCADE,
    allocated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    released_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_allocations_resource ON cf_resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_cf_allocations_agent ON cf_resource_allocations(agent_id);

-- =============================================
-- PART 3: INTER-AGENT COMMUNICATION
-- =============================================

CREATE TABLE IF NOT EXISTS cf_messages (
    id VARCHAR(255) PRIMARY KEY,
    from_agent_id VARCHAR(255) NOT NULL REFERENCES cf_agents(id) ON DELETE CASCADE,
    to_agent_id VARCHAR(255) REFERENCES cf_agents(id) ON DELETE CASCADE,
    swarm_id VARCHAR(255) REFERENCES cf_swarms(id) ON DELETE CASCADE,
    message_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
    requires_response BOOLEAN DEFAULT false,
    response_to_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cf_messages_from ON cf_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_cf_messages_to ON cf_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_cf_messages_type ON cf_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_cf_messages_created_at ON cf_messages(created_at);

-- =============================================
-- PART 4: CONSENSUS & VOTING
-- =============================================

CREATE TABLE IF NOT EXISTS cf_consensus (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) NOT NULL REFERENCES cf_swarms(id) ON DELETE CASCADE,
    task_id VARCHAR(255) REFERENCES cf_tasks(id) ON DELETE CASCADE,
    proposal JSONB NOT NULL,
    required_threshold DECIMAL(3,2) NOT NULL,
    current_votes INTEGER DEFAULT 0,
    total_voters INTEGER DEFAULT 0,
    votes JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'failed', 'timeout')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    deadline_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_consensus_swarm ON cf_consensus(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_consensus_status ON cf_consensus(status);

-- =============================================
-- PART 5: PERFORMANCE METRICS & EVENTS
-- =============================================

CREATE TABLE IF NOT EXISTS cf_performance_metrics (
    id SERIAL PRIMARY KEY,
    swarm_id VARCHAR(255) REFERENCES cf_swarms(id) ON DELETE CASCADE,
    agent_id VARCHAR(255) REFERENCES cf_agents(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255),
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cf_metrics_swarm ON cf_performance_metrics(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_metrics_agent ON cf_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_cf_metrics_type ON cf_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_cf_metrics_timestamp ON cf_performance_metrics(timestamp);

CREATE TABLE IF NOT EXISTS cf_events (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) REFERENCES cf_swarms(id) ON DELETE SET NULL,
    agent_id VARCHAR(255) REFERENCES cf_agents(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cf_events_swarm ON cf_events(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_events_agent ON cf_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_cf_events_type ON cf_events(event_type);
CREATE INDEX IF NOT EXISTS idx_cf_events_severity ON cf_events(severity);
CREATE INDEX IF NOT EXISTS idx_cf_events_created_at ON cf_events(created_at);

-- =============================================
-- PART 6: SESSION & MEMORY MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS cf_sessions (
    id VARCHAR(255) PRIMARY KEY,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('mcp', 'api', 'websocket')),
    user_id VARCHAR(255),
    client_info JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP,
    terminated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cf_sessions_type ON cf_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_cf_sessions_status ON cf_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cf_sessions_user ON cf_sessions(user_id);

CREATE TABLE IF NOT EXISTS cf_memory_store (
    id VARCHAR(255) PRIMARY KEY,
    namespace VARCHAR(255) NOT NULL DEFAULT 'default',
    key_name VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    ttl INTEGER,
    access_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_accessed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP,
    UNIQUE(namespace, key_name)
);

CREATE INDEX IF NOT EXISTS idx_cf_memory_namespace ON cf_memory_store(namespace);
CREATE INDEX IF NOT EXISTS idx_cf_memory_expires_at ON cf_memory_store(expires_at);

CREATE TABLE IF NOT EXISTS cf_configuration (
    id VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    key_value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(category, key_name)
);

CREATE INDEX IF NOT EXISTS idx_cf_config_category ON cf_configuration(category);

-- =============================================
-- PART 7: NEURAL PATTERNS & LEARNING
-- =============================================

CREATE TABLE IF NOT EXISTS cf_neural_patterns (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) NOT NULL REFERENCES cf_swarms(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN ('coordination', 'optimization', 'prediction', 'behavior')),
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_used_at TIMESTAMP,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cf_patterns_swarm ON cf_neural_patterns(swarm_id);
CREATE INDEX IF NOT EXISTS idx_cf_patterns_type ON cf_neural_patterns(pattern_type);

-- =============================================
-- PART 8: ENHANCED MEMORY TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS cf_session_state (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    project_path TEXT,
    active_branch TEXT,
    last_activity BIGINT,
    state VARCHAR(20) CHECK (state IN ('active', 'paused', 'completed')),
    context JSONB,
    environment JSONB
);

CREATE INDEX IF NOT EXISTS idx_cf_session_activity ON cf_session_state(last_activity);

CREATE TABLE IF NOT EXISTS cf_mcp_tool_usage (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    arguments JSONB,
    result_summary TEXT,
    execution_time_ms INTEGER,
    success BOOLEAN,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_cf_mcp_tool_timestamp ON cf_mcp_tool_usage(timestamp);

CREATE TABLE IF NOT EXISTS cf_training_data (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(100),
    input_context TEXT,
    action_taken TEXT,
    outcome TEXT,
    success_score DECIMAL(3,2),
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    model_version VARCHAR(50),
    feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_cf_training_pattern ON cf_training_data(pattern_type);

CREATE TABLE IF NOT EXISTS cf_code_patterns (
    id SERIAL PRIMARY KEY,
    file_path TEXT,
    pattern_name VARCHAR(255),
    pattern_content TEXT,
    language VARCHAR(50),
    frequency INTEGER DEFAULT 1,
    last_used BIGINT,
    effectiveness_score DECIMAL(3,2),
    UNIQUE(file_path, pattern_name)
);

CREATE TABLE IF NOT EXISTS cf_agent_interactions (
    id SERIAL PRIMARY KEY,
    source_agent VARCHAR(255),
    target_agent VARCHAR(255),
    message_type VARCHAR(50),
    content TEXT,
    task_id VARCHAR(255),
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    correlation_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_cf_agent_task ON cf_agent_interactions(task_id);

CREATE TABLE IF NOT EXISTS cf_knowledge_graph (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_name VARCHAR(255),
    entity_path TEXT,
    relationships JSONB,
    metadata JSONB,
    embedding BYTEA,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_cf_knowledge_type ON cf_knowledge_graph(entity_type);

CREATE TABLE IF NOT EXISTS cf_error_patterns (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    context TEXT,
    resolution TEXT,
    prevention_strategy TEXT,
    occurrence_count INTEGER DEFAULT 1,
    last_seen BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    UNIQUE(error_type, error_message)
);

CREATE INDEX IF NOT EXISTS idx_cf_error_type ON cf_error_patterns(error_type);

CREATE TABLE IF NOT EXISTS cf_task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255),
    depends_on VARCHAR(255),
    dependency_type VARCHAR(20) CHECK (dependency_type IN ('blocking', 'optional', 'parallel')),
    status VARCHAR(20) CHECK (status IN ('pending', 'satisfied', 'failed')),
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE INDEX IF NOT EXISTS idx_cf_task_deps ON cf_task_dependencies(task_id);

CREATE TABLE IF NOT EXISTS cf_performance_benchmarks (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(100),
    operation_details TEXT,
    duration_ms INTEGER,
    memory_used_mb DECIMAL(10,2),
    cpu_percent DECIMAL(5,2),
    timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()),
    session_id VARCHAR(255),
    optimization_applied TEXT
);

CREATE TABLE IF NOT EXISTS cf_user_preferences (
    preference_key VARCHAR(255) PRIMARY KEY,
    preference_value TEXT,
    category VARCHAR(100),
    learned_from VARCHAR(50),
    confidence_score DECIMAL(3,2),
    last_updated BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())
);

CREATE TABLE IF NOT EXISTS cf_session_history (
    id VARCHAR(255) PRIMARY KEY,
    swarm_id VARCHAR(255) REFERENCES cf_swarms(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMP,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_task_duration DECIMAL(10,2),
    session_data JSONB
);

-- =============================================
-- PART 9: UPDATE TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cf_swarms_timestamp ON cf_swarms;
CREATE TRIGGER update_cf_swarms_timestamp
    BEFORE UPDATE ON cf_swarms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_agents_timestamp ON cf_agents;
CREATE TRIGGER update_cf_agents_timestamp
    BEFORE UPDATE ON cf_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_tasks_timestamp ON cf_tasks;
CREATE TRIGGER update_cf_tasks_timestamp
    BEFORE UPDATE ON cf_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_resources_timestamp ON cf_resources;
CREATE TRIGGER update_cf_resources_timestamp
    BEFORE UPDATE ON cf_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_sessions_timestamp ON cf_sessions;
CREATE TRIGGER update_cf_sessions_timestamp
    BEFORE UPDATE ON cf_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_memory_timestamp ON cf_memory_store;
CREATE TRIGGER update_cf_memory_timestamp
    BEFORE UPDATE ON cf_memory_store
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cf_config_timestamp ON cf_configuration;
CREATE TRIGGER update_cf_config_timestamp
    BEFORE UPDATE ON cf_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PART 10: VIEWS
-- =============================================

CREATE OR REPLACE VIEW cf_active_swarms AS
SELECT s.*,
       COUNT(DISTINCT a.id) as agent_count,
       COUNT(DISTINCT t.id) as task_count
FROM cf_swarms s
LEFT JOIN cf_agents a ON s.id = a.swarm_id AND a.status NOT IN ('terminated', 'offline')
LEFT JOIN cf_tasks t ON s.id = t.swarm_id AND t.status IN ('pending', 'assigned', 'in_progress', 'running')
WHERE s.status = 'active'
GROUP BY s.id;

CREATE OR REPLACE VIEW cf_swarm_metrics AS
SELECT
    s.id as swarm_id,
    s.name,
    s.status,
    COUNT(DISTINCT a.id) as total_agents,
    COUNT(DISTINCT CASE WHEN a.status IN ('idle', 'busy', 'active') THEN a.id END) as active_agents,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'failed' THEN t.id END) as failed_tasks,
    COUNT(DISTINCT CASE WHEN t.status IN ('pending', 'assigned', 'running', 'in_progress') THEN t.id END) as active_tasks
FROM cf_swarms s
LEFT JOIN cf_agents a ON s.id = a.swarm_id
LEFT JOIN cf_tasks t ON s.id = t.swarm_id
WHERE s.status != 'destroyed'
GROUP BY s.id, s.name, s.status;

CREATE OR REPLACE VIEW cf_agent_workload AS
SELECT a.*,
       COUNT(DISTINCT t.id) as assigned_tasks,
       AVG(t.progress) as avg_task_progress
FROM cf_agents a
LEFT JOIN cf_tasks t ON t.assigned_agents::text LIKE '%' || a.id || '%' AND t.status = 'in_progress'
GROUP BY a.id;

CREATE OR REPLACE VIEW cf_tool_effectiveness AS
SELECT tool_name,
       COUNT(*) as usage_count,
       AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100 as success_rate,
       AVG(execution_time_ms) as avg_time_ms
FROM cf_mcp_tool_usage
GROUP BY tool_name;

CREATE OR REPLACE VIEW cf_frequent_errors AS
SELECT error_type, error_message, occurrence_count, resolution
FROM cf_error_patterns
WHERE occurrence_count > 1
ORDER BY occurrence_count DESC;

-- Insert initial config
INSERT INTO cf_memory_store (id, namespace, key_name, value) VALUES
    ('sys-version', 'claude-flow', 'system.version', '"2.0.0"'),
    ('sys-init', 'claude-flow', 'system.initialized', to_jsonb(NOW()::text))
ON CONFLICT (namespace, key_name) DO UPDATE SET value = EXCLUDED.value;
