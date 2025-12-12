/**
 * Memory System Types
 * Adapted from claude-flow for GHL Agency AI
 */

/**
 * Memory entry for storing agent context
 */
export interface MemoryEntry {
  id: string;
  sessionId: string;
  agentId?: string;
  userId?: number;
  key: string;
  value: any;
  embedding?: number[];
  metadata: {
    type?: 'context' | 'reasoning' | 'knowledge' | 'state';
    domain?: string;
    namespace?: string;
    confidence?: number;
    tags?: string[];
    createdBy?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Reasoning pattern for storing agent reasoning
 */
export interface ReasoningPattern {
  id: string;
  pattern: string;
  result: any;
  context?: Record<string, any>;
  confidence: number;
  usageCount: number;
  successRate: number;
  domain?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

/**
 * Search result with similarity score
 */
export interface SearchResult<T = any> {
  id: string;
  data: T;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Memory query options
 */
export interface MemoryQueryOptions {
  sessionId?: string;
  agentId?: string;
  userId?: number;
  namespace?: string;
  domain?: string;
  tags?: string[];
  type?: string;
  limit?: number;
  offset?: number;
  minConfidence?: number;
  includeExpired?: boolean;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  k?: number;
  namespace?: string;
  domain?: string;
  filter?: Record<string, any>;
  minSimilarity?: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalEntries: number;
  totalReasoningPatterns: number;
  avgConfidence: number;
  hitRate?: number;
  storageSize?: number;
  namespaces?: string[];
  domains?: string[];
}

/**
 * Session context
 */
export interface SessionContext {
  sessionId: string;
  userId?: number;
  agentId?: string;
  context: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
