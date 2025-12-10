/**
 * RAG Service
 *
 * Core service for RAG (Retrieval Augmented Generation) functionality:
 * - Document ingestion with chunking and embedding
 * - Semantic search with vector similarity
 * - System prompt building with context injection
 */

import { getDb } from "../db";
import {
  documentationSources,
  documentationChunks,
  systemPromptTemplates,
  ragQueryLogs,
} from "../../drizzle/schema-rag";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface IngestOptions {
  platform: string;
  category: string;
  title: string;
  content: string;
  sourceUrl?: string;
  sourceType?: string;
  version?: string;
  userId: number;
  chunkingOptions?: {
    maxTokens?: number;
    overlapTokens?: number;
  };
}

interface IngestResult {
  sourceId: number;
  chunkCount: number;
  totalTokens: number;
}

interface RetrieveOptions {
  topK?: number;
  platforms?: string[];
  categories?: string[];
  minSimilarity?: number;
}

interface RetrievedChunk {
  id: number;
  sourceId: number;
  platform: string;
  category: string;
  content: string;
  similarity: number;
  metadata?: any;
}

interface BuildPromptOptions {
  platform?: string;
  customTemplate?: string;
  maxDocumentationTokens?: number;
  includeExamples?: boolean;
}

interface BuildPromptResult {
  systemPrompt: string;
  retrievedChunks: RetrievedChunk[];
  detectedPlatforms: string[];
}

class RagService {
  private static instance: RagService;

  // Default chunking parameters
  private defaultMaxTokens = 500;
  private defaultOverlapTokens = 50;

  private constructor() {}

  public static getInstance(): RagService {
    if (!RagService.instance) {
      RagService.instance = new RagService();
    }
    return RagService.instance;
  }

  /**
   * Ingest a document: chunk it, generate embeddings, and store
   */
  public async ingest(options: IngestOptions): Promise<IngestResult> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const maxTokens = options.chunkingOptions?.maxTokens || this.defaultMaxTokens;
    const overlapTokens = options.chunkingOptions?.overlapTokens || this.defaultOverlapTokens;

    console.log(`[RAG] Ingesting document: ${options.title}`);

    // Insert source document
    const [source] = await db.insert(documentationSources).values({
      platform: options.platform,
      category: options.category,
      title: options.title,
      content: options.content,
      sourceUrl: options.sourceUrl,
      sourceType: options.sourceType || "markdown",
      version: options.version,
      uploadedBy: options.userId,
    }).returning();

    // Chunk the content
    const chunks = this.chunkContent(options.content, maxTokens, overlapTokens);
    console.log(`[RAG] Created ${chunks.length} chunks`);

    // Generate embeddings and store chunks
    let totalTokens = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const tokenCount = this.estimateTokens(chunk);
      totalTokens += tokenCount;

      // Generate embedding
      const embedding = await this.generateEmbedding(chunk);

      // Extract keywords for the chunk
      const keywords = this.extractKeywords(chunk);

      // Insert chunk with embedding using raw SQL for vector type
      await db.execute(sql`
        INSERT INTO documentation_chunks
        ("sourceId", platform, category, "chunkIndex", content, "tokenCount", embedding, keywords, metadata)
        VALUES (
          ${source.id},
          ${options.platform},
          ${options.category},
          ${i},
          ${chunk},
          ${tokenCount},
          ${embedding}::vector,
          ${JSON.stringify(keywords)}::jsonb,
          ${JSON.stringify({ title: options.title })}::jsonb
        )
      `);
    }

    console.log(`[RAG] Ingestion complete: ${chunks.length} chunks, ${totalTokens} tokens`);

    return {
      sourceId: source.id,
      chunkCount: chunks.length,
      totalTokens,
    };
  }

  /**
   * Retrieve relevant chunks for a query using vector similarity
   */
  public async retrieve(query: string, options: RetrieveOptions = {}): Promise<RetrievedChunk[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const topK = options.topK || 5;
    const minSimilarity = options.minSimilarity || 0.5;

    console.log(`[RAG] Retrieving chunks for query: ${query.substring(0, 50)}...`);

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Build the query with optional platform/category filters
    let filterConditions = "";
    if (options.platforms && options.platforms.length > 0) {
      const platformList = options.platforms.map(p => `'${p}'`).join(",");
      filterConditions += ` AND platform IN (${platformList})`;
    }
    if (options.categories && options.categories.length > 0) {
      const categoryList = options.categories.map(c => `'${c}'`).join(",");
      filterConditions += ` AND category IN (${categoryList})`;
    }

    // Perform vector similarity search
    const result = await db.execute(sql.raw(`
      SELECT
        id,
        "sourceId",
        platform,
        category,
        content,
        metadata,
        1 - (embedding <=> '${queryEmbedding}'::vector) as similarity
      FROM documentation_chunks
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> '${queryEmbedding}'::vector) >= ${minSimilarity}
        ${filterConditions}
      ORDER BY embedding <=> '${queryEmbedding}'::vector
      LIMIT ${topK}
    `));

    const chunks: RetrievedChunk[] = (result.rows || []).map((row: any) => ({
      id: row.id,
      sourceId: row.sourceId,
      platform: row.platform,
      category: row.category,
      content: row.content,
      similarity: parseFloat(row.similarity),
      metadata: row.metadata,
    }));

    console.log(`[RAG] Retrieved ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Build a system prompt with RAG context
   */
  public async buildSystemPrompt(
    userPrompt: string,
    options: BuildPromptOptions = {}
  ): Promise<BuildPromptResult> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Import platform detection service dynamically to avoid circular deps
    const { platformDetectionService } = await import("./platformDetection.service");

    // Detect platforms from user prompt
    const detection = await platformDetectionService.detect({
      prompt: userPrompt,
    });
    const detectedPlatforms = detection.platforms.map(p => p.platform);

    // Determine which platforms to search
    const searchPlatforms = options.platform
      ? [options.platform]
      : detectedPlatforms.length > 0
        ? detectedPlatforms
        : undefined;

    // Retrieve relevant chunks
    const retrievedChunks = await this.retrieve(userPrompt, {
      topK: 10,
      platforms: searchPlatforms,
      minSimilarity: 0.4,
    });

    // Get the appropriate template
    let template = options.customTemplate;
    if (!template) {
      const platform = options.platform || detection.primaryPlatform || "general";
      const templateResult = await db.query.systemPromptTemplates.findFirst({
        where: and(
          eq(systemPromptTemplates.platform, platform),
          eq(systemPromptTemplates.isDefault, true),
          eq(systemPromptTemplates.isActive, true)
        ),
      });

      template = templateResult?.template || this.getDefaultTemplate();
    }

    // Build documentation context
    const maxTokens = options.maxDocumentationTokens || 4000;
    let documentation = "";
    let tokenCount = 0;

    for (const chunk of retrievedChunks) {
      const chunkTokens = this.estimateTokens(chunk.content);
      if (tokenCount + chunkTokens > maxTokens) break;

      documentation += `\n---\n[Source: ${chunk.platform}/${chunk.category}]\n${chunk.content}\n`;
      tokenCount += chunkTokens;
    }

    // Inject documentation into template
    const systemPrompt = template.replace("{{DOCUMENTATION}}", documentation || "No relevant documentation found.");

    return {
      systemPrompt,
      retrievedChunks,
      detectedPlatforms,
    };
  }

  /**
   * Delete a documentation source and its chunks
   */
  public async deleteSource(sourceId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.delete(documentationSources).where(eq(documentationSources.id, sourceId));
    console.log(`[RAG] Deleted source ${sourceId} and its chunks`);
  }

  /**
   * Update a documentation source
   */
  public async updateSource(
    sourceId: number,
    updates: Partial<{
      title: string;
      content: string;
      sourceUrl: string;
      version: string;
      isActive: boolean;
    }>
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db.update(documentationSources)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(documentationSources.id, sourceId));

    // If content was updated, re-chunk and re-embed
    if (updates.content) {
      // Delete old chunks
      await db.delete(documentationChunks).where(eq(documentationChunks.sourceId, sourceId));

      // Get source details
      const source = await db.query.documentationSources.findFirst({
        where: eq(documentationSources.id, sourceId),
      });

      if (source) {
        // Re-chunk and store
        const chunks = this.chunkContent(updates.content, this.defaultMaxTokens, this.defaultOverlapTokens);
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const tokenCount = this.estimateTokens(chunk);
          const embedding = await this.generateEmbedding(chunk);
          const keywords = this.extractKeywords(chunk);

          await db.execute(sql`
            INSERT INTO documentation_chunks
            ("sourceId", platform, category, "chunkIndex", content, "tokenCount", embedding, keywords)
            VALUES (
              ${sourceId},
              ${source.platform},
              ${source.category},
              ${i},
              ${chunk},
              ${tokenCount},
              ${embedding}::vector,
              ${JSON.stringify(keywords)}::jsonb
            )
          `);
        }
      }
    }

    console.log(`[RAG] Updated source ${sourceId}`);
  }

  /**
   * Chunk content into smaller pieces
   */
  private chunkContent(content: string, maxTokens: number, overlapTokens: number): string[] {
    const chunks: string[] = [];

    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = "";
    let currentTokens = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokens(paragraph);

      // If single paragraph exceeds max, split by sentences
      if (paragraphTokens > maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
          currentTokens = 0;
        }

        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          const sentenceTokens = this.estimateTokens(sentence);
          if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());
            // Keep overlap
            const overlapText = this.getOverlapText(currentChunk, overlapTokens);
            currentChunk = overlapText + sentence;
            currentTokens = this.estimateTokens(currentChunk);
          } else {
            currentChunk += (currentChunk ? " " : "") + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else if (currentTokens + paragraphTokens > maxTokens) {
        // Current chunk is full, start new one
        chunks.push(currentChunk.trim());
        // Keep overlap
        const overlapText = this.getOverlapText(currentChunk, overlapTokens);
        currentChunk = overlapText + paragraph;
        currentTokens = this.estimateTokens(currentChunk);
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapTokens: number): string {
    if (overlapTokens === 0) return "";

    const words = text.split(/\s+/);
    const overlapWords = Math.min(words.length, Math.ceil(overlapTokens * 0.75)); // ~1.33 tokens per word
    return words.slice(-overlapWords).join(" ") + " ";
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<string> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const embedding = response.data[0].embedding;
      // Format as PostgreSQL vector literal
      return `[${embedding.join(",")}]`;
    } catch (error) {
      console.error("[RAG] Failed to generate embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - extract important terms
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Remove common stop words
    const stopWords = new Set([
      "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her",
      "was", "one", "our", "out", "has", "have", "been", "would", "their", "there",
      "will", "each", "make", "like", "back", "only", "come", "over", "such", "than",
      "into", "from", "with", "also", "this", "that", "they", "what", "which", "when",
      "your", "some", "them", "then", "these", "more", "other", "being", "about",
    ]);

    const keywords = words.filter(w => !stopWords.has(w));

    // Get unique keywords and return top 20
    return [...new Set(keywords)].slice(0, 20);
  }

  /**
   * Get default system prompt template
   */
  private getDefaultTemplate(): string {
    return `You are a helpful AI assistant with access to specialized documentation.

Use the following documentation to provide accurate, helpful answers:

{{DOCUMENTATION}}

Guidelines:
- Provide clear, actionable information
- Reference specific documentation when relevant
- If information is not in the documentation, say so
- Be concise but thorough`;
  }
}

// Export singleton instance
export const ragService = RagService.getInstance();

// Export class for testing
export { RagService };
