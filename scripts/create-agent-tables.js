import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const createAgentTablesSQL = `
-- Agent Sessions Table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  "sessionUuid" UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'idle' NOT NULL,
  context JSONB,
  "thinkingSteps" JSONB DEFAULT '[]' NOT NULL,
  "toolHistory" JSONB DEFAULT '[]' NOT NULL,
  plan JSONB,
  "currentPhase" VARCHAR(100),
  "iterationCount" INTEGER DEFAULT 0 NOT NULL,
  "maxIterations" INTEGER DEFAULT 100 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Agent Executions Table
CREATE TABLE IF NOT EXISTS agent_executions (
  id SERIAL PRIMARY KEY,
  "sessionId" INTEGER NOT NULL REFERENCES agent_sessions(id),
  "userId" INTEGER NOT NULL REFERENCES users(id),
  "taskDescription" TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  plan JSONB,
  phases JSONB DEFAULT '[]' NOT NULL,
  "currentPhaseIndex" INTEGER DEFAULT 0 NOT NULL,
  "thinkingSteps" JSONB DEFAULT '[]' NOT NULL,
  "toolExecutions" JSONB DEFAULT '[]' NOT NULL,
  result JSONB,
  error TEXT,
  iterations INTEGER DEFAULT 0 NOT NULL,
  "durationMs" INTEGER,
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Generated Projects Table
CREATE TABLE IF NOT EXISTS generated_projects (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  "executionId" INTEGER REFERENCES agent_executions(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "techStack" VARCHAR(50) DEFAULT 'react' NOT NULL,
  features JSONB DEFAULT '{}' NOT NULL,
  "filesSnapshot" JSONB,
  status VARCHAR(50) DEFAULT 'active' NOT NULL,
  "devServerPort" INTEGER,
  "previewUrl" TEXT,
  "deploymentUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Knowledge Entries Table
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  context TEXT NOT NULL,
  content TEXT NOT NULL,
  examples JSONB,
  confidence DECIMAL(3, 2) DEFAULT 1.0 NOT NULL,
  "usageCount" INTEGER DEFAULT 0 NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tool Executions Table
CREATE TABLE IF NOT EXISTS tool_executions (
  id SERIAL PRIMARY KEY,
  "executionId" INTEGER NOT NULL REFERENCES agent_executions(id),
  "toolName" VARCHAR(100) NOT NULL,
  parameters JSONB,
  result JSONB,
  success BOOLEAN DEFAULT TRUE NOT NULL,
  "durationMs" INTEGER,
  error TEXT,
  "executedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions("userId");
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session ON agent_executions("sessionId");
CREATE INDEX IF NOT EXISTS idx_agent_executions_user ON agent_executions("userId");
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_generated_projects_user ON generated_projects("userId");
CREATE INDEX IF NOT EXISTS idx_generated_projects_execution ON generated_projects("executionId");
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_user ON knowledge_entries("userId");
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_tool_executions_execution ON tool_executions("executionId");
`;

async function createAgentTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Creating agent system tables...');
    await client.query(createAgentTablesSQL);

    console.log('✓ Agent tables created successfully!');

    // Verify tables exist
    console.log('\nVerifying agent tables...');
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'agent_sessions',
        'agent_executions',
        'generated_projects',
        'knowledge_entries',
        'tool_executions'
      )
      ORDER BY table_name;
    `);

    console.log('\nAgent tables found:');
    tableCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    if (tableCheck.rows.length === 5) {
      console.log('\n✓ All 5 agent tables verified successfully!');
    } else {
      console.log(`\n⚠ Only ${tableCheck.rows.length}/5 agent tables found`);
    }

    // Check table structures
    console.log('\nChecking table columns...');
    for (const tableName of ['agent_sessions', 'agent_executions', 'generated_projects', 'knowledge_entries', 'tool_executions']) {
      const columnCheck = await client.query(`
        SELECT COUNT(*) as column_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
      `, [tableName]);
      console.log(`  ${tableName}: ${columnCheck.rows[0].column_count} columns`);
    }

    client.release();
  } catch (error) {
    console.error('Error creating agent tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createAgentTables().catch(console.error);
