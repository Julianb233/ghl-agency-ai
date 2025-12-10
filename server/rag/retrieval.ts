/**
 * RAG Retrieval Service
 *
 * Provides semantic search capabilities for the AI browser automation agent.
 * Retrieves relevant knowledge about websites, selectors, action sequences,
 * error recovery patterns, and support documents.
 */

import { getDb } from "../db";
import { eq, desc, and, sql, gt, or, ilike } from "drizzle-orm";
import {
  generateEmbedding,
  createPageKnowledgeText,
  createElementSelectorText,
  createActionSequenceText,
  createErrorPatternText,
} from "./embeddings";

/**
 * Safely format embedding vector for SQL query
 * Prevents SQL injection by validating array contents are numeric
 */
function formatVectorForSQL(embedding: number[]): string {
  // Validate all elements are numbers to prevent injection
  if (!Array.isArray(embedding) || !embedding.every(n => typeof n === 'number' && isFinite(n))) {
    throw new Error("Invalid embedding: must be array of finite numbers");
  }
  // Format as pgvector literal: '[1.0,2.0,3.0]'
  return `'[${embedding.join(",")}]'`;
}
import {
  websites,
  pageKnowledge,
  elementSelectors,
  actionSequences,
  errorPatterns,
  supportDocuments,
  executionLogs,
  type Website,
  type PageKnowledge,
  type ElementSelector,
  type ActionSequence,
  type ErrorPattern,
  type SupportDocument,
} from "./schema";

// ========================================
// WEBSITE KNOWLEDGE RETRIEVAL
// ========================================

/**
 * Get website knowledge by domain
 */
export async function getWebsiteByDomain(domain: string): Promise<Website | null> {
  const db = await getDb();
  if (!db) return null;

  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.domain, domain.toLowerCase()))
    .limit(1);

  return website || null;
}

/**
 * Get or create website entry
 */
export async function getOrCreateWebsite(
  domain: string,
  defaults?: Partial<Website>
): Promise<Website> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let website = await getWebsiteByDomain(domain);

  if (!website) {
    const [created] = await db
      .insert(websites)
      .values({
        domain: domain.toLowerCase(),
        name: defaults?.name || domain,
        description: defaults?.description,
        loginUrl: defaults?.loginUrl,
        dashboardUrl: defaults?.dashboardUrl,
        requiresAuth: defaults?.requiresAuth ?? false,
        authMethod: defaults?.authMethod,
        metadata: defaults?.metadata,
      })
      .returning();

    website = created;
  }

  return website;
}

// ========================================
// PAGE KNOWLEDGE RETRIEVAL
// ========================================

/**
 * Find relevant pages for a URL
 */
export async function findPagesForUrl(
  websiteId: number,
  url: string
): Promise<PageKnowledge[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all pages for this website
  const pages = await db
    .select()
    .from(pageKnowledge)
    .where(eq(pageKnowledge.websiteId, websiteId));

  // Filter by URL pattern match
  return pages.filter((page) => {
    try {
      const pattern = new RegExp(page.urlPattern);
      return pattern.test(url);
    } catch {
      return url.includes(page.urlPattern);
    }
  });
}

/**
 * Semantic search for pages by instruction
 */
export async function searchPages(
  websiteId: number,
  instruction: string,
  limit: number = 5
): Promise<PageKnowledge[]> {
  const db = await getDb();
  if (!db) return [];

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(instruction);

  // Use pgvector similarity search with safe vector formatting
  const vectorLiteral = formatVectorForSQL(queryEmbedding);
  const results = await db.execute(sql`
    SELECT *, 1 - (embedding <=> ${sql.raw(vectorLiteral)}::vector) as similarity
    FROM rag_page_knowledge
    WHERE website_id = ${websiteId}
    AND embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(vectorLiteral)}::vector
    LIMIT ${limit}
  `);

  return results.rows as PageKnowledge[];
}

// ========================================
// ELEMENT SELECTOR RETRIEVAL
// ========================================

/**
 * Find reliable selectors for an element
 */
export async function findSelectorsForElement(
  websiteId: number,
  elementDescription: string,
  pageId?: number
): Promise<ElementSelector[]> {
  const db = await getDb();
  if (!db) return [];

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(elementDescription);

  // Semantic search with reliability weighting (safe vector formatting)
  const vectorLiteral = formatVectorForSQL(queryEmbedding);
  const results = await db.execute(sql`
    SELECT *,
      (1 - (embedding <=> ${sql.raw(vectorLiteral)}::vector)) * reliability_score as relevance_score
    FROM rag_element_selectors
    WHERE website_id = ${websiteId}
    ${pageId ? sql`AND (page_id = ${pageId} OR page_id IS NULL)` : sql``}
    AND embedding IS NOT NULL
    ORDER BY relevance_score DESC
    LIMIT 10
  `);

  return results.rows as ElementSelector[];
}

/**
 * Get selector by name (exact match)
 */
export async function getSelectorByName(
  websiteId: number,
  elementName: string
): Promise<ElementSelector | null> {
  const db = await getDb();
  if (!db) return null;

  const [selector] = await db
    .select()
    .from(elementSelectors)
    .where(
      and(
        eq(elementSelectors.websiteId, websiteId),
        eq(elementSelectors.elementName, elementName)
      )
    )
    .limit(1);

  return selector || null;
}

/**
 * Update selector reliability based on success/failure
 */
export async function updateSelectorReliability(
  selectorId: number,
  success: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const field = success ? "success_count" : "failure_count";
  const timestampField = success ? "last_success" : "last_failure";

  await db.execute(sql`
    UPDATE rag_element_selectors
    SET
      ${sql.identifier(field)} = ${sql.identifier(field)} + 1,
      ${sql.identifier(timestampField)} = NOW(),
      reliability_score = CASE
        WHEN success_count + failure_count > 0
        THEN success_count::float / (success_count + failure_count)
        ELSE 0.5
      END,
      updated_at = NOW()
    WHERE id = ${selectorId}
  `);
}

// ========================================
// ACTION SEQUENCE RETRIEVAL
// ========================================

/**
 * Find action sequences matching an instruction
 */
export async function findActionSequences(
  websiteId: number,
  instruction: string,
  limit: number = 5
): Promise<ActionSequence[]> {
  const db = await getDb();
  if (!db) return [];

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(instruction);

  // Semantic search with success rate weighting (safe vector formatting)
  const vectorLiteral = formatVectorForSQL(queryEmbedding);
  const results = await db.execute(sql`
    SELECT *,
      (1 - (embedding <=> ${sql.raw(vectorLiteral)}::vector)) * success_rate as relevance_score
    FROM rag_action_sequences
    WHERE website_id = ${websiteId}
    AND is_active = true
    AND embedding IS NOT NULL
    ORDER BY relevance_score DESC
    LIMIT ${limit}
  `);

  return results.rows as ActionSequence[];
}

/**
 * Get action sequence by task type
 */
export async function getActionSequenceByType(
  websiteId: number,
  taskType: string
): Promise<ActionSequence | null> {
  const db = await getDb();
  if (!db) return null;

  const [sequence] = await db
    .select()
    .from(actionSequences)
    .where(
      and(
        eq(actionSequences.websiteId, websiteId),
        eq(actionSequences.taskType, taskType),
        eq(actionSequences.isActive, true)
      )
    )
    .orderBy(desc(actionSequences.successRate))
    .limit(1);

  return sequence || null;
}

// ========================================
// ERROR PATTERN RETRIEVAL
// ========================================

/**
 * Find recovery strategy for an error
 */
export async function findErrorRecovery(
  errorMessage: string,
  websiteId?: number
): Promise<ErrorPattern | null> {
  const db = await getDb();
  if (!db) return null;

  // Generate embedding for error message
  const queryEmbedding = await generateEmbedding(errorMessage);

  // Search for matching error pattern (safe vector formatting)
  const vectorLiteral = formatVectorForSQL(queryEmbedding);
  const results = await db.execute(sql`
    SELECT *,
      (1 - (embedding <=> ${sql.raw(vectorLiteral)}::vector)) * recovery_rate as relevance_score
    FROM rag_error_patterns
    WHERE is_active = true
    AND embedding IS NOT NULL
    ${websiteId ? sql`AND (website_id = ${websiteId} OR website_id IS NULL)` : sql``}
    ORDER BY relevance_score DESC
    LIMIT 1
  `);

  return (results.rows[0] as ErrorPattern) || null;
}

/**
 * Get error pattern by type
 */
export async function getErrorPatternByType(
  errorType: string,
  websiteId?: number
): Promise<ErrorPattern | null> {
  const db = await getDb();
  if (!db) return null;

  const conditions = [
    eq(errorPatterns.errorType, errorType),
    eq(errorPatterns.isActive, true),
  ];

  if (websiteId) {
    conditions.push(
      or(eq(errorPatterns.websiteId, websiteId), sql`website_id IS NULL`)!
    );
  }

  const [pattern] = await db
    .select()
    .from(errorPatterns)
    .where(and(...conditions))
    .orderBy(desc(errorPatterns.recoveryRate))
    .limit(1);

  return pattern || null;
}

// ========================================
// SUPPORT DOCUMENT RETRIEVAL
// ========================================

/**
 * Search support documents
 */
export async function searchSupportDocs(
  query: string,
  websiteId?: number,
  limit: number = 5
): Promise<SupportDocument[]> {
  const db = await getDb();
  if (!db) return [];

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Semantic search (safe vector formatting)
  const vectorLiteral = formatVectorForSQL(queryEmbedding);
  const results = await db.execute(sql`
    SELECT *,
      1 - (embedding <=> ${sql.raw(vectorLiteral)}::vector) as similarity
    FROM rag_support_documents
    WHERE embedding IS NOT NULL
    ${websiteId ? sql`AND (website_id = ${websiteId} OR website_id IS NULL)` : sql``}
    ORDER BY embedding <=> ${sql.raw(vectorLiteral)}::vector
    LIMIT ${limit}
  `);

  // Update retrieval count
  const docIds = (results.rows as SupportDocument[]).map((d) => d.id);
  if (docIds.length > 0) {
    await db.execute(sql`
      UPDATE rag_support_documents
      SET retrieval_count = retrieval_count + 1
      WHERE id IN ${sql.join(docIds, sql`, `)}
    `);
  }

  return results.rows as SupportDocument[];
}

// ========================================
// COMBINED CONTEXT RETRIEVAL
// ========================================

/**
 * Get complete context for browser automation task
 * Returns all relevant knowledge for the AI agent
 */
export interface BrowserAutomationContext {
  website: Website | null;
  pages: PageKnowledge[];
  selectors: ElementSelector[];
  actionSequences: ActionSequence[];
  errorPatterns: ErrorPattern[];
  supportDocs: SupportDocument[];
}

export async function getAutomationContext(
  url: string,
  instruction: string
): Promise<BrowserAutomationContext> {
  // Extract domain from URL
  const domain = new URL(url).hostname.replace("www.", "");

  // Get website
  const website = await getWebsiteByDomain(domain);
  const websiteId = website?.id;

  // Parallel retrieval
  const [pages, selectors, sequences, docs] = await Promise.all([
    websiteId ? searchPages(websiteId, instruction, 3) : [],
    websiteId ? findSelectorsForElement(websiteId, instruction) : [],
    websiteId ? findActionSequences(websiteId, instruction, 3) : [],
    searchSupportDocs(instruction, websiteId, 3),
  ]);

  // Get common error patterns
  const errorPatternsResult = websiteId
    ? await getDb().then((db) =>
        db
          ? db
              .select()
              .from(errorPatterns)
              .where(
                and(
                  or(
                    eq(errorPatterns.websiteId, websiteId),
                    sql`website_id IS NULL`
                  ),
                  eq(errorPatterns.isActive, true),
                  gt(errorPatterns.recoveryRate, 0.5)
                )
              )
              .limit(5)
          : []
      )
    : [];

  return {
    website,
    pages,
    selectors,
    actionSequences: sequences,
    errorPatterns: errorPatternsResult,
    supportDocs: docs,
  };
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(
  context: BrowserAutomationContext
): string {
  const sections: string[] = [];

  // Website info
  if (context.website) {
    sections.push(`## Website: ${context.website.name || context.website.domain}
${context.website.description || ""}
- Login URL: ${context.website.loginUrl || "N/A"}
- Auth Method: ${context.website.authMethod || "N/A"}
- Avg Load Time: ${context.website.avgLoadTime || "Unknown"}ms`);
  }

  // Pages
  if (context.pages.length > 0) {
    const pageInfo = context.pages
      .map((p) => `- ${p.pageName}: ${p.description || p.urlPattern}`)
      .join("\n");
    sections.push(`## Relevant Pages\n${pageInfo}`);
  }

  // Selectors
  if (context.selectors.length > 0) {
    const selectorInfo = context.selectors
      .slice(0, 5)
      .map(
        (s) =>
          `- ${s.elementName} (${s.elementType}): \`${s.primarySelector}\` (reliability: ${((s.reliabilityScore ?? 0) * 100).toFixed(0)}%)`
      )
      .join("\n");
    sections.push(`## Known Selectors\n${selectorInfo}`);
  }

  // Action sequences
  if (context.actionSequences.length > 0) {
    const sequenceInfo = context.actionSequences
      .map(
        (s) =>
          `- ${s.name}: ${s.description || s.triggerInstruction} (success rate: ${((s.successRate ?? 0) * 100).toFixed(0)}%)`
      )
      .join("\n");
    sections.push(`## Recommended Action Patterns\n${sequenceInfo}`);
  }

  // Error patterns
  if (context.errorPatterns.length > 0) {
    const errorInfo = context.errorPatterns
      .map(
        (e) =>
          `- ${e.errorType}: ${e.recoveryStrategy} (${((e.recoveryRate ?? 0) * 100).toFixed(0)}% success)`
      )
      .join("\n");
    sections.push(`## Error Recovery Strategies\n${errorInfo}`);
  }

  // Support docs
  if (context.supportDocs.length > 0) {
    const docInfo = context.supportDocs
      .map((d) => `- ${d.title}: ${d.summary || d.content.slice(0, 100)}...`)
      .join("\n");
    sections.push(`## Reference Documentation\n${docInfo}`);
  }

  return sections.join("\n\n");
}

// ========================================
// LOGGING & LEARNING
// ========================================

/**
 * Log execution for learning
 */
export async function logExecution(log: {
  websiteId?: number;
  actionSequenceId?: number;
  sessionId?: string;
  userId?: string;
  instruction?: string;
  steps: any[];
  totalDuration: number;
  success: boolean;
  errorMessage?: string;
  errorType?: string;
  recoveryAttempts?: any[];
  finalState?: any;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(executionLogs).values({
    websiteId: log.websiteId,
    actionSequenceId: log.actionSequenceId,
    sessionId: log.sessionId,
    userId: log.userId,
    instruction: log.instruction,
    steps: log.steps,
    totalDuration: log.totalDuration,
    success: log.success,
    errorMessage: log.errorMessage,
    errorType: log.errorType,
    recoveryAttempts: log.recoveryAttempts,
    finalState: log.finalState,
  });

  // Update action sequence stats if applicable
  if (log.actionSequenceId) {
    await db.execute(sql`
      UPDATE rag_action_sequences
      SET
        execution_count = execution_count + 1,
        success_rate = (
          SELECT COUNT(*) FILTER (WHERE success = true)::float / NULLIF(COUNT(*), 0)
          FROM rag_execution_logs
          WHERE action_sequence_id = ${log.actionSequenceId}
        ),
        avg_execution_time = (
          SELECT AVG(total_duration)
          FROM rag_execution_logs
          WHERE action_sequence_id = ${log.actionSequenceId}
          AND success = true
        ),
        updated_at = NOW()
      WHERE id = ${log.actionSequenceId}
    `);
  }
}
