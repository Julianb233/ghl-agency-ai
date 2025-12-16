/**
 * Pattern Reuse Service
 * Intelligent pattern matching and adaptation for task execution
 * Combines reasoning patterns, task patterns, and user memory
 */

import { getLearningEngine } from "./learningEngine.service";
import { getReasoningBank } from "./reasoningBank.service";
import { getUserMemoryService } from "./userMemory.service";
import type { TaskSuccessPattern } from "../../../drizzle/schema-memory";

export interface TaskContext {
  taskType: string;
  taskName?: string;
  parameters?: Record<string, any>;
  context?: Record<string, any>;
  userId: number;
  executionId?: number;
}

export interface PatternMatch {
  pattern: TaskSuccessPattern | any;
  similarity: number;
  confidence: number;
  adaptationRequired: boolean;
  adaptationSuggestions?: string[];
  source: 'task_pattern' | 'reasoning_pattern' | 'workflow_pattern';
}

export interface AdaptedPattern {
  original: any;
  adapted: any;
  adaptations: Array<{
    field: string;
    originalValue: any;
    adaptedValue: any;
    reason: string;
  }>;
  confidence: number;
}

/**
 * Pattern Reuse Service - Finds and adapts successful patterns
 */
export class PatternReuseService {
  private learningEngine = getLearningEngine();
  private reasoningBank = getReasoningBank();
  private userMemory = getUserMemoryService();

  /**
   * Find best matching pattern for a task
   */
  async findBestPattern(context: TaskContext): Promise<PatternMatch | null> {
    const matches: PatternMatch[] = [];

    // 1. Search task success patterns (highest priority - user-specific)
    const taskPatterns = await this.userMemory.findSimilarTaskPatterns(
      context.userId,
      context.taskType,
      { minConfidence: 0.5, limit: 5 }
    );

    for (const pattern of taskPatterns) {
      const similarity = this.calculateTaskSimilarity(context, pattern);

      if (similarity > 0.6) {
        matches.push({
          pattern,
          similarity,
          confidence: pattern.confidence,
          adaptationRequired: similarity < 0.95,
          adaptationSuggestions: this.getAdaptationSuggestions(context, pattern),
          source: 'task_pattern',
        });
      }
    }

    // 2. Search reasoning patterns (medium priority - domain knowledge)
    const reasoningPatterns = await this.learningEngine.findSimilarReasoning(
      context.userId,
      context.taskType,
      { minConfidence: 0.5, limit: 5, includeGlobal: true }
    );

    for (const reasoningResult of reasoningPatterns) {
      matches.push({
        pattern: reasoningResult.data,
        similarity: reasoningResult.similarity,
        confidence: reasoningResult.data.confidence,
        adaptationRequired: true,
        source: 'reasoning_pattern',
      });
    }

    // 3. Sort by score (similarity * confidence) and return best match
    if (matches.length === 0) {
      return null;
    }

    matches.sort((a, b) => {
      const scoreA = a.similarity * a.confidence;
      const scoreB = b.similarity * b.confidence;
      return scoreB - scoreA;
    });

    return matches[0];
  }

  /**
   * Adapt pattern to new context
   * Uses Claude-like reasoning to modify pattern for new situation
   */
  async adaptPattern(
    pattern: any,
    targetContext: TaskContext
  ): Promise<AdaptedPattern> {
    const adaptations: AdaptedPattern['adaptations'] = [];
    const adapted = JSON.parse(JSON.stringify(pattern)); // Deep clone

    // Detect and adapt differences
    if (pattern.contextConditions && targetContext.context) {
      for (const [key, value] of Object.entries(targetContext.context)) {
        if (pattern.contextConditions[key] !== value) {
          adaptations.push({
            field: `contextConditions.${key}`,
            originalValue: pattern.contextConditions[key],
            adaptedValue: value,
            reason: 'Context condition changed in target environment',
          });

          if (adapted.contextConditions) {
            adapted.contextConditions[key] = value;
          }
        }
      }
    }

    // Adapt selectors if needed (placeholder for selector adaptation logic)
    if (pattern.selectors && targetContext.parameters) {
      // In a real implementation, this would use DOM analysis or element detection
      // For now, we keep the original selectors but flag that validation is needed
      adaptations.push({
        field: 'selectors',
        originalValue: pattern.selectors,
        adaptedValue: pattern.selectors,
        reason: 'Selectors require validation in target environment',
      });
    }

    // Calculate confidence after adaptation
    const adaptationPenalty = Math.min(0.3, adaptations.length * 0.05);
    const confidence = Math.max(0.3, pattern.confidence - adaptationPenalty);

    return {
      original: pattern,
      adapted,
      adaptations,
      confidence,
    };
  }

  /**
   * Calculate similarity between task context and stored pattern
   */
  private calculateTaskSimilarity(
    context: TaskContext,
    pattern: TaskSuccessPattern
  ): number {
    let score = 0;
    let factors = 0;

    // 1. Task type match (most important)
    if (context.taskType === pattern.taskType) {
      score += 1.0;
    }
    factors += 1.0;

    // 2. Context similarity
    if (context.context && pattern.contextConditions) {
      const contextSim = this.calculateObjectSimilarity(
        context.context,
        pattern.contextConditions as any
      );
      score += contextSim * 0.5;
      factors += 0.5;
    }

    // 3. Parameter similarity
    if (context.parameters && pattern.successfulApproach) {
      const paramSim = this.calculateObjectSimilarity(
        context.parameters,
        pattern.successfulApproach as any
      );
      score += paramSim * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate similarity between two objects (simple Jaccard similarity)
   */
  private calculateObjectSimilarity(obj1: any, obj2: any): number {
    const keys1 = new Set(Object.keys(obj1 ?? {}));
    const keys2 = new Set(Object.keys(obj2 ?? {}));

    if (keys1.size === 0 && keys2.size === 0) {
      return 1.0;
    }

    let intersection = 0;
    let matching = 0;

    for (const key of Array.from(keys1)) {
      if (keys2.has(key)) {
        intersection++;

        // Check if values match
        if (obj1[key] === obj2[key]) {
          matching++;
        } else if (
          typeof obj1[key] === 'object' &&
          typeof obj2[key] === 'object'
        ) {
          // Nested object - recursive similarity
          matching += this.calculateObjectSimilarity(obj1[key], obj2[key]) * 0.5;
        }
      }
    }

    const union = keys1.size + keys2.size - intersection;

    if (union === 0) {
      return 1.0;
    }

    // Jaccard + value matching bonus
    const jaccard = intersection / union;
    const valueBonus = intersection > 0 ? matching / intersection : 0;

    return (jaccard * 0.6) + (valueBonus * 0.4);
  }

  /**
   * Get adaptation suggestions for a pattern
   */
  private getAdaptationSuggestions(
    context: TaskContext,
    pattern: TaskSuccessPattern
  ): string[] {
    const suggestions: string[] = [];

    // Check for context differences
    if (context.context && pattern.contextConditions) {
      for (const key of Object.keys(context.context)) {
        if (!(key in (pattern.contextConditions as any))) {
          suggestions.push(`Add context condition: ${key}`);
        }
      }
    }

    // Check for parameter differences
    if (context.parameters && pattern.successfulApproach) {
      const approachObj = pattern.successfulApproach as any;
      for (const key of Object.keys(context.parameters)) {
        if (!(key in approachObj)) {
          suggestions.push(`Add parameter handling: ${key}`);
        }
      }
    }

    // Suggest selector validation
    if (pattern.selectors && Object.keys(pattern.selectors as any).length > 0) {
      suggestions.push('Validate selectors still work in current page state');
    }

    return suggestions;
  }

  /**
   * Retrieve pattern by ID and prepare for reuse
   */
  async retrievePattern(
    patternId: string,
    targetContext: TaskContext
  ): Promise<AdaptedPattern | null> {
    // Try to get from task patterns
    const taskPatterns = await this.userMemory.findSimilarTaskPatterns(
      targetContext.userId,
      targetContext.taskType,
      { limit: 100 }
    );

    const pattern = taskPatterns.find(p => p.patternId === patternId);

    if (!pattern) {
      // Try reasoning patterns
      const reasoningPattern = await this.reasoningBank.getReasoningPattern(patternId);

      if (!reasoningPattern) {
        return null;
      }

      // Adapt reasoning pattern
      return this.adaptPattern(reasoningPattern, targetContext);
    }

    // Adapt task pattern
    return this.adaptPattern(pattern, targetContext);
  }

  /**
   * Record pattern usage and success
   */
  async recordPatternUsage(
    patternId: string,
    success: boolean,
    executionTime?: number,
    adaptations?: Array<{ field: string; value: any }>
  ): Promise<void> {
    // Update task pattern if it exists
    const taskPatterns = await this.userMemory.findSimilarTaskPatterns(
      0, // Will be filtered out but needed for typing
      '', // Same as above
      { limit: 1000 }
    );

    const pattern = taskPatterns.find(p => p.patternId === patternId);

    if (pattern) {
      await this.userMemory.updateTaskPatternUsage(patternId, success, executionTime);

      // If adaptations were made and successful, update pattern
      if (success && adaptations && adaptations.length > 0) {
        // TODO: Update pattern with successful adaptations
        console.log(`[PatternReuse] Pattern ${patternId} successfully used with adaptations`);
      }
    } else {
      // Try updating reasoning pattern
      await this.reasoningBank.updateReasoningUsage(patternId, success);
    }
  }

  /**
   * Get pattern reuse statistics
   */
  async getPatternReuseStats(userId: number): Promise<{
    totalPatterns: number;
    totalReuses: number;
    avgConfidence: number;
    topPatterns: Array<{
      patternId: string;
      taskType: string;
      usageCount: number;
      successRate: number;
    }>;
  }> {
    const taskPatterns = await this.userMemory.findSimilarTaskPatterns(
      userId,
      '', // Get all task types
      { limit: 100 }
    );

    const totalReuses = taskPatterns.reduce((sum, p) => sum + p.usageCount, 0);
    const avgConfidence =
      taskPatterns.length > 0
        ? taskPatterns.reduce((sum, p) => sum + p.confidence, 0) / taskPatterns.length
        : 0;

    const topPatterns = taskPatterns
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(p => ({
        patternId: p.patternId,
        taskType: p.taskType,
        usageCount: p.usageCount,
        successRate: p.successRate,
      }));

    return {
      totalPatterns: taskPatterns.length,
      totalReuses,
      avgConfidence,
      topPatterns,
    };
  }

  /**
   * Suggest patterns for a new task type
   * Looks for similar task types and suggests adaptations
   */
  async suggestPatternsForNewTask(
    userId: number,
    taskType: string,
    context?: Record<string, any>
  ): Promise<PatternMatch[]> {
    // Get all user's patterns
    const allPatterns = await this.userMemory.findSimilarTaskPatterns(
      userId,
      '',
      { limit: 100 }
    );

    // Calculate similarity to new task
    const matches: PatternMatch[] = [];

    for (const pattern of allPatterns) {
      // Simple similarity based on task type string similarity
      const taskTypeSimilarity = this.calculateStringSimilarity(
        taskType,
        pattern.taskType
      );

      if (taskTypeSimilarity > 0.4) {
        matches.push({
          pattern,
          similarity: taskTypeSimilarity,
          confidence: pattern.confidence * 0.7, // Reduce confidence for cross-task adaptation
          adaptationRequired: true,
          adaptationSuggestions: [
            'Review pattern applicability to new task type',
            'Validate selectors and workflow steps',
            'Test in safe mode before production use',
          ],
          source: 'task_pattern',
        });
      }
    }

    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, 5);
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance implementation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
let patternReuseInstance: PatternReuseService | null = null;

export function getPatternReuseService(): PatternReuseService {
  if (!patternReuseInstance) {
    patternReuseInstance = new PatternReuseService();
  }
  return patternReuseInstance;
}
