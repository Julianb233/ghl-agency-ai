/**
 * MatchTool - Multi-page comparison and pattern matching for browser automation
 * Provides content comparison, pattern matching, and difference detection across multiple pages
 */

import { ITool, ToolDefinition, ToolResult, ToolExecutionContext } from './types';
import { stagehandService } from '../stagehand.service';

interface MatchPatternParams {
  sessionId: string;
  pattern: string;
  pages?: string[]; // Tab IDs to search, or all if not specified
  matchType?: 'regex' | 'exact' | 'fuzzy' | 'contains';
  selector?: string; // Optional CSS selector to limit search scope
  caseSensitive?: boolean;
  maxMatches?: number;
}

interface CompareParams {
  sessionId: string;
  tabId1: string;
  tabId2: string;
  compareType?: 'text' | 'structure' | 'visual' | 'all';
  selector?: string; // Optional: compare only specific elements
  threshold?: number; // Similarity threshold (0-1) for fuzzy matching
}

interface FindDifferencesParams {
  sessionId: string;
  snapshots: Array<{
    tabId: string;
    timestamp?: number;
    label?: string;
  }>;
  diffType?: 'text' | 'structure' | 'visual';
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

interface ExtractMatchesParams {
  sessionId: string;
  tabId?: string; // If not specified, use active tab
  pattern: string;
  matchType?: 'regex' | 'exact' | 'fuzzy';
  selector?: string;
  extractType?: 'text' | 'html' | 'attributes' | 'links' | 'images';
}

interface MatchResult {
  tabId: string;
  url: string;
  title: string;
  matches: Array<{
    content: string;
    selector?: string;
    context?: string;
    position?: { x: number; y: number };
  }>;
  matchCount: number;
}

interface CompareResult {
  similarity: number; // 0-1 score
  differences: Array<{
    type: 'added' | 'removed' | 'changed';
    path?: string;
    selector?: string;
    oldValue?: string;
    newValue?: string;
    description: string;
  }>;
  identical: boolean;
  summary: string;
}

interface DifferenceSnapshot {
  tabId: string;
  url: string;
  title: string;
  timestamp: number;
  label?: string;
  content: {
    text?: string;
    structure?: Record<string, unknown>;
    visual?: string; // base64 screenshot
  };
}

export class MatchTool implements ITool {
  name = 'match';
  description = 'Compare and match content across multiple browser pages, find differences, and extract patterns';
  category: 'browser' = 'browser';
  enabled = true;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Action to perform: match, compare, diff, extract',
            enum: ['match', 'compare', 'diff', 'extract'],
          },
          sessionId: {
            type: 'string',
            description: 'Browser session ID',
          },
          pattern: {
            type: 'string',
            description: 'Pattern to match (regex, exact text, or fuzzy pattern)',
          },
          pages: {
            type: 'string',
            description: 'Comma-separated tab IDs to search (for match action)',
          },
          tabId1: {
            type: 'string',
            description: 'First tab ID to compare',
          },
          tabId2: {
            type: 'string',
            description: 'Second tab ID to compare',
          },
          tabId: {
            type: 'string',
            description: 'Tab ID for extraction (optional, uses active tab if not specified)',
          },
          snapshots: {
            type: 'string',
            description: 'JSON array of snapshots for diff action',
          },
          matchType: {
            type: 'string',
            description: 'Type of matching: regex, exact, fuzzy, contains',
            enum: ['regex', 'exact', 'fuzzy', 'contains'],
            default: 'contains',
          },
          compareType: {
            type: 'string',
            description: 'Type of comparison: text, structure, visual, all',
            enum: ['text', 'structure', 'visual', 'all'],
            default: 'text',
          },
          diffType: {
            type: 'string',
            description: 'Type of difference detection: text, structure, visual',
            enum: ['text', 'structure', 'visual'],
            default: 'text',
          },
          extractType: {
            type: 'string',
            description: 'Type of content to extract: text, html, attributes, links, images',
            enum: ['text', 'html', 'attributes', 'links', 'images'],
            default: 'text',
          },
          selector: {
            type: 'string',
            description: 'CSS selector to limit search/comparison scope',
          },
          caseSensitive: {
            type: 'string',
            description: 'Case sensitive matching (true/false)',
            default: 'false',
          },
          ignoreWhitespace: {
            type: 'string',
            description: 'Ignore whitespace in comparisons (true/false)',
            default: 'true',
          },
          ignoreCase: {
            type: 'string',
            description: 'Ignore case in comparisons (true/false)',
            default: 'false',
          },
          threshold: {
            type: 'string',
            description: 'Similarity threshold for fuzzy matching (0-1)',
            default: '0.8',
          },
          maxMatches: {
            type: 'string',
            description: 'Maximum number of matches to return',
            default: '100',
          },
        },
        required: ['action', 'sessionId'],
      },
    };
  }

  validate(params: Record<string, unknown>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const action = params.action as string;

    if (!action) {
      errors.push('Action is required');
    } else if (!['match', 'compare', 'diff', 'extract'].includes(action)) {
      errors.push('Invalid action');
    }

    if (!params.sessionId) {
      errors.push('sessionId is required');
    }

    // Action-specific validation
    if (action === 'match' && !params.pattern) {
      errors.push('pattern is required for match action');
    }

    if (action === 'compare') {
      if (!params.tabId1) errors.push('tabId1 is required for compare action');
      if (!params.tabId2) errors.push('tabId2 is required for compare action');
    }

    if (action === 'diff' && !params.snapshots) {
      errors.push('snapshots is required for diff action');
    }

    if (action === 'extract' && !params.pattern) {
      errors.push('pattern is required for extract action');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult> {
    const startTime = Date.now();
    const action = params.action as string;

    try {
      const validation = this.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors?.join(', '),
          duration: Date.now() - startTime,
        };
      }

      let result: ToolResult;

      switch (action) {
        case 'match':
          result = await this.matchPattern(params as unknown as MatchPatternParams);
          break;
        case 'compare':
          result = await this.compare(params as unknown as CompareParams);
          break;
        case 'diff':
          result = await this.findDifferences(params as unknown as FindDifferencesParams);
          break;
        case 'extract':
          result = await this.extractMatches(params as unknown as ExtractMatchesParams);
          break;
        default:
          result = { success: false, error: `Unknown action: ${action}` };
      }

      result.duration = Date.now() - startTime;
      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Match pattern across multiple pages
   */
  private async matchPattern(params: MatchPatternParams): Promise<ToolResult> {
    const {
      sessionId,
      pattern,
      pages,
      matchType = 'contains',
      selector,
      caseSensitive = false,
      maxMatches = 100,
    } = params;

    // Get all tabs or specified tabs
    const tabsResult = await stagehandService.listTabs(sessionId);
    if (!tabsResult.success || !tabsResult.tabs) {
      return { success: false, error: 'Failed to get tabs' };
    }

    const tabsToSearch = pages
      ? tabsResult.tabs.filter(tab => pages.includes(tab.id))
      : tabsResult.tabs;

    const results: MatchResult[] = [];

    for (const tab of tabsToSearch) {
      // Switch to tab
      await stagehandService.switchTab(sessionId, tab.id);

      // Get page content based on selector
      const session = stagehandService.getSession(sessionId);
      if (!session) continue;

      const content = await session.page.evaluate(
        (sel: string | undefined) => {
          const element = sel ? document.querySelector(sel) : document.body;
          return element ? element.textContent || '' : '';
        },
        selector
      );

      // Perform matching based on type
      const matches = this.performMatching(content, pattern, matchType, caseSensitive, maxMatches);

      if (matches.length > 0) {
        results.push({
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
          matches: matches.map(m => ({
            content: m,
            context: this.getContext(content, m, 50),
          })),
          matchCount: matches.length,
        });
      }
    }

    return {
      success: true,
      data: {
        pattern,
        matchType,
        totalTabs: tabsToSearch.length,
        tabsWithMatches: results.length,
        results,
        totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
      },
    };
  }

  /**
   * Compare two pages
   */
  private async compare(params: CompareParams): Promise<ToolResult> {
    const {
      sessionId,
      tabId1,
      tabId2,
      compareType = 'text',
      selector,
      threshold = 0.8,
    } = params;

    const session = stagehandService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Get content from both tabs
    const content1 = await this.getTabContent(sessionId, tabId1, selector, compareType);
    const content2 = await this.getTabContent(sessionId, tabId2, selector, compareType);

    if (!content1 || !content2) {
      return { success: false, error: 'Failed to get tab content' };
    }

    let compareResult: CompareResult;

    switch (compareType) {
      case 'text':
        compareResult = await this.compareText(content1.text || '', content2.text || '');
        break;
      case 'structure':
        compareResult = await this.compareStructure(
          content1.structure || {},
          content2.structure || {}
        );
        break;
      case 'visual':
        compareResult = await this.compareVisual(sessionId, tabId1, tabId2);
        break;
      case 'all':
        const textComp = await this.compareText(content1.text || '', content2.text || '');
        const structComp = await this.compareStructure(
          content1.structure || {},
          content2.structure || {}
        );
        const visualComp = await this.compareVisual(sessionId, tabId1, tabId2);

        compareResult = {
          similarity: (textComp.similarity + structComp.similarity + visualComp.similarity) / 3,
          differences: [...textComp.differences, ...structComp.differences, ...visualComp.differences],
          identical: textComp.identical && structComp.identical && visualComp.identical,
          summary: `Text: ${(textComp.similarity * 100).toFixed(1)}%, Structure: ${(structComp.similarity * 100).toFixed(1)}%, Visual: ${(visualComp.similarity * 100).toFixed(1)}%`,
        };
        break;
      default:
        return { success: false, error: `Unknown compare type: ${compareType}` };
    }

    return {
      success: true,
      data: {
        tab1: tabId1,
        tab2: tabId2,
        compareType,
        threshold,
        result: compareResult,
        passesThreshold: compareResult.similarity >= threshold,
      },
    };
  }

  /**
   * Find differences across multiple snapshots
   */
  private async findDifferences(params: FindDifferencesParams): Promise<ToolResult> {
    const {
      sessionId,
      snapshots,
      diffType = 'text',
      ignoreWhitespace = true,
      ignoreCase = false,
    } = params;

    if (snapshots.length < 2) {
      return { success: false, error: 'At least 2 snapshots are required for diff' };
    }

    // Capture current state of each tab
    const capturedSnapshots: DifferenceSnapshot[] = [];

    for (const snapshot of snapshots) {
      const tabContent = await this.getTabContent(sessionId, snapshot.tabId, undefined, diffType);
      if (tabContent) {
        const tabInfo = await stagehandService.listTabs(sessionId);
        const tab = tabInfo.tabs?.find(t => t.id === snapshot.tabId);

        capturedSnapshots.push({
          tabId: snapshot.tabId,
          url: tab?.url || '',
          title: tab?.title || '',
          timestamp: snapshot.timestamp || Date.now(),
          label: snapshot.label,
          content: tabContent,
        });
      }
    }

    // Compare each snapshot with the first one
    const baseSnapshot = capturedSnapshots[0];
    const differences = [];

    for (let i = 1; i < capturedSnapshots.length; i++) {
      const compareSnapshot = capturedSnapshots[i];

      let comparisonResult: CompareResult;

      if (diffType === 'text' && baseSnapshot.content.text && compareSnapshot.content.text) {
        comparisonResult = await this.compareText(
          baseSnapshot.content.text,
          compareSnapshot.content.text,
          ignoreWhitespace,
          ignoreCase
        );
      } else if (diffType === 'structure') {
        comparisonResult = await this.compareStructure(
          baseSnapshot.content.structure || {},
          compareSnapshot.content.structure || {}
        );
      } else {
        comparisonResult = {
          similarity: 1,
          differences: [],
          identical: true,
          summary: 'No differences found',
        };
      }

      differences.push({
        from: baseSnapshot.label || baseSnapshot.tabId,
        to: compareSnapshot.label || compareSnapshot.tabId,
        similarity: comparisonResult.similarity,
        differences: comparisonResult.differences,
        identical: comparisonResult.identical,
      });
    }

    return {
      success: true,
      data: {
        diffType,
        snapshotCount: capturedSnapshots.length,
        baseSnapshot: {
          tabId: baseSnapshot.tabId,
          url: baseSnapshot.url,
          title: baseSnapshot.title,
          label: baseSnapshot.label,
        },
        comparisons: differences,
        summary: `Compared ${capturedSnapshots.length} snapshots, found ${differences.filter(d => !d.identical).length} with differences`,
      },
    };
  }

  /**
   * Extract all matches from a page
   */
  private async extractMatches(params: ExtractMatchesParams): Promise<ToolResult> {
    const {
      sessionId,
      tabId,
      pattern,
      matchType = 'regex',
      selector,
      extractType = 'text',
    } = params;

    const session = stagehandService.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Switch to tab if specified
    if (tabId) {
      await stagehandService.switchTab(sessionId, tabId);
    }

    // Extract content based on type
    const extracted = await session.page.evaluate(
      (sel: string | undefined, type: string, pat: string, mType: string) => {
        const root = sel ? document.querySelector(sel) : document.body;
        if (!root) return [];

        const results: Array<{ content: string; selector?: string; attributes?: Record<string, string>; href?: string; src?: string }> = [];

        switch (type) {
          case 'text': {
            const text = root.textContent || '';
            const regex = mType === 'regex' ? new RegExp(pat, 'g') : null;

            if (regex) {
              let match;
              while ((match = regex.exec(text)) !== null) {
                results.push({ content: match[0] });
              }
            } else if (mType === 'exact') {
              if (text.includes(pat)) {
                results.push({ content: pat });
              }
            } else {
              // contains mode
              const lines = text.split('\n');
              lines.forEach(line => {
                if (line.includes(pat)) {
                  results.push({ content: line.trim() });
                }
              });
            }
            break;
          }

          case 'html': {
            const html = root.innerHTML;
            results.push({ content: html });
            break;
          }

          case 'links': {
            const links = root.querySelectorAll('a[href]');
            links.forEach((link) => {
              const anchor = link as HTMLAnchorElement;
              const text = anchor.textContent?.trim() || '';
              const href = anchor.href;

              if (mType === 'regex') {
                const regex = new RegExp(pat);
                if (regex.test(text) || regex.test(href)) {
                  results.push({ content: text, href });
                }
              } else if (text.includes(pat) || href.includes(pat)) {
                results.push({ content: text, href });
              }
            });
            break;
          }

          case 'images': {
            const images = root.querySelectorAll('img[src]');
            images.forEach((img) => {
              const image = img as HTMLImageElement;
              const alt = image.alt || '';
              const src = image.src;

              if (mType === 'regex') {
                const regex = new RegExp(pat);
                if (regex.test(alt) || regex.test(src)) {
                  results.push({ content: alt, src });
                }
              } else if (alt.includes(pat) || src.includes(pat)) {
                results.push({ content: alt, src });
              }
            });
            break;
          }

          case 'attributes': {
            const elements = root.querySelectorAll('*');
            elements.forEach((el, index) => {
              const attrs: Record<string, string> = {};
              Array.from(el.attributes).forEach(attr => {
                attrs[attr.name] = attr.value;

                if (mType === 'regex') {
                  const regex = new RegExp(pat);
                  if (regex.test(attr.value)) {
                    results.push({
                      content: attr.value,
                      selector: `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
                      attributes: attrs,
                    });
                  }
                } else if (attr.value.includes(pat)) {
                  results.push({
                    content: attr.value,
                    selector: `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
                    attributes: attrs,
                  });
                }
              });
            });
            break;
          }
        }

        return results;
      },
      selector,
      extractType,
      pattern,
      matchType
    );

    return {
      success: true,
      data: {
        pattern,
        matchType,
        extractType,
        selector,
        matches: extracted,
        totalMatches: extracted.length,
      },
    };
  }

  /**
   * Perform matching based on match type
   */
  private performMatching(
    content: string,
    pattern: string,
    matchType: string,
    caseSensitive: boolean,
    maxMatches: number
  ): string[] {
    const matches: string[] = [];

    switch (matchType) {
      case 'regex': {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(pattern, flags);
        let match;
        while ((match = regex.exec(content)) !== null && matches.length < maxMatches) {
          matches.push(match[0]);
        }
        break;
      }

      case 'exact': {
        const compareContent = caseSensitive ? content : content.toLowerCase();
        const comparePattern = caseSensitive ? pattern : pattern.toLowerCase();

        let index = 0;
        while (matches.length < maxMatches) {
          index = compareContent.indexOf(comparePattern, index);
          if (index === -1) break;
          matches.push(content.substring(index, index + pattern.length));
          index += pattern.length;
        }
        break;
      }

      case 'fuzzy': {
        // Simple fuzzy matching using Levenshtein distance
        const words = content.split(/\s+/);
        for (const word of words) {
          if (matches.length >= maxMatches) break;
          const similarity = this.calculateSimilarity(word, pattern, caseSensitive);
          if (similarity > 0.7) {
            matches.push(word);
          }
        }
        break;
      }

      case 'contains':
      default: {
        const compareContent = caseSensitive ? content : content.toLowerCase();
        const comparePattern = caseSensitive ? pattern : pattern.toLowerCase();

        if (compareContent.includes(comparePattern)) {
          matches.push(pattern);
        }
        break;
      }
    }

    return matches;
  }

  /**
   * Get context around a match
   */
  private getContext(content: string, match: string, contextLength: number): string {
    const index = content.indexOf(match);
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + match.length + contextLength);

    return content.substring(start, end);
  }

  /**
   * Get tab content in various formats
   */
  private async getTabContent(
    sessionId: string,
    tabId: string,
    selector?: string,
    contentType?: string
  ): Promise<{ text?: string; structure?: Record<string, unknown>; visual?: string } | null> {
    const session = stagehandService.getSession(sessionId);
    if (!session) return null;

    // Switch to tab
    await stagehandService.switchTab(sessionId, tabId);

    const result: { text?: string; structure?: Record<string, unknown>; visual?: string } = {};

    if (!contentType || contentType === 'text' || contentType === 'all') {
      result.text = await session.page.evaluate((sel: string | undefined) => {
        const element = sel ? document.querySelector(sel) : document.body;
        return element ? element.textContent || '' : '';
      }, selector);
    }

    if (contentType === 'structure' || contentType === 'all') {
      result.structure = await session.page.evaluate((sel: string | undefined) => {
        const element = sel ? document.querySelector(sel) : document.body;
        if (!element) return {};

        const getStructure = (el: Element): any => {
          const structure: any = {
            tag: el.tagName.toLowerCase(),
            attributes: {},
            children: [],
          };

          Array.from(el.attributes).forEach(attr => {
            structure.attributes[attr.name] = attr.value;
          });

          Array.from(el.children).forEach(child => {
            structure.children.push(getStructure(child));
          });

          return structure;
        };

        return getStructure(element);
      }, selector);
    }

    if (contentType === 'visual' || contentType === 'all') {
      const screenshot = await stagehandService.screenshot(sessionId, { returnBase64: true });
      if (screenshot.success && screenshot.base64) {
        result.visual = screenshot.base64;
      }
    }

    return result;
  }

  /**
   * Compare text content
   */
  private async compareText(
    text1: string,
    text2: string,
    ignoreWhitespace = true,
    ignoreCase = false
  ): Promise<CompareResult> {
    let content1 = text1;
    let content2 = text2;

    if (ignoreWhitespace) {
      content1 = content1.replace(/\s+/g, ' ').trim();
      content2 = content2.replace(/\s+/g, ' ').trim();
    }

    if (ignoreCase) {
      content1 = content1.toLowerCase();
      content2 = content2.toLowerCase();
    }

    const identical = content1 === content2;
    const similarity = this.calculateSimilarity(content1, content2, true);

    const differences: CompareResult['differences'] = [];

    if (!identical) {
      // Simple diff - find what's different
      const lines1 = content1.split('\n');
      const lines2 = content2.split('\n');

      const maxLines = Math.max(lines1.length, lines2.length);

      for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';

        if (line1 !== line2) {
          if (!line1) {
            differences.push({
              type: 'added',
              description: `Line ${i + 1} added`,
              newValue: line2,
            });
          } else if (!line2) {
            differences.push({
              type: 'removed',
              description: `Line ${i + 1} removed`,
              oldValue: line1,
            });
          } else {
            differences.push({
              type: 'changed',
              description: `Line ${i + 1} changed`,
              oldValue: line1,
              newValue: line2,
            });
          }
        }
      }
    }

    return {
      similarity,
      differences,
      identical,
      summary: identical
        ? 'Content is identical'
        : `${(similarity * 100).toFixed(1)}% similar, ${differences.length} differences found`,
    };
  }

  /**
   * Compare DOM structure
   */
  private async compareStructure(
    struct1: Record<string, unknown>,
    struct2: Record<string, unknown>
  ): Promise<CompareResult> {
    const differences: CompareResult['differences'] = [];

    const compareObjects = (obj1: any, obj2: any, path = ''): void => {
      const keys1 = Object.keys(obj1 || {});
      const keys2 = Object.keys(obj2 || {});
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of Array.from(allKeys)) {
        const currentPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];

        if (val1 === undefined && val2 !== undefined) {
          differences.push({
            type: 'added',
            path: currentPath,
            description: `Property ${currentPath} added`,
            newValue: String(val2),
          });
        } else if (val1 !== undefined && val2 === undefined) {
          differences.push({
            type: 'removed',
            path: currentPath,
            description: `Property ${currentPath} removed`,
            oldValue: String(val1),
          });
        } else if (typeof val1 === 'object' && typeof val2 === 'object') {
          compareObjects(val1, val2, currentPath);
        } else if (val1 !== val2) {
          differences.push({
            type: 'changed',
            path: currentPath,
            description: `Property ${currentPath} changed`,
            oldValue: String(val1),
            newValue: String(val2),
          });
        }
      }
    };

    compareObjects(struct1, struct2);

    const identical = differences.length === 0;
    const similarity = identical ? 1 : Math.max(0, 1 - differences.length / 100);

    return {
      similarity,
      differences,
      identical,
      summary: identical
        ? 'Structure is identical'
        : `${differences.length} structural differences found`,
    };
  }

  /**
   * Compare visual appearance (screenshots)
   */
  private async compareVisual(
    sessionId: string,
    tabId1: string,
    tabId2: string
  ): Promise<CompareResult> {
    // For visual comparison, we'd need image comparison library
    // For now, return a simple comparison based on screenshot sizes

    await stagehandService.switchTab(sessionId, tabId1);
    const screenshot1 = await stagehandService.screenshot(sessionId, { returnBase64: true });

    await stagehandService.switchTab(sessionId, tabId2);
    const screenshot2 = await stagehandService.screenshot(sessionId, { returnBase64: true });

    if (!screenshot1.success || !screenshot2.success || !screenshot1.base64 || !screenshot2.base64) {
      return {
        similarity: 0,
        differences: [{ type: 'changed', description: 'Failed to capture screenshots' }],
        identical: false,
        summary: 'Visual comparison failed',
      };
    }

    // Simple size-based comparison
    const identical = screenshot1.base64 === screenshot2.base64;
    const size1 = screenshot1.base64.length;
    const size2 = screenshot2.base64.length;
    const sizeDiff = Math.abs(size1 - size2);
    const similarity = identical ? 1 : Math.max(0, 1 - sizeDiff / Math.max(size1, size2));

    const differences: CompareResult['differences'] = identical
      ? []
      : [
          {
            type: 'changed',
            description: 'Visual differences detected',
            oldValue: `${size1} bytes`,
            newValue: `${size2} bytes`,
          },
        ];

    return {
      similarity,
      differences,
      identical,
      summary: identical
        ? 'Pages are visually identical'
        : `Visual similarity: ${(similarity * 100).toFixed(1)}%`,
    };
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string, caseSensitive = false): number {
    const s1 = caseSensitive ? str1 : str1.toLowerCase();
    const s2 = caseSensitive ? str2 : str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    // Calculate Levenshtein distance
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = matrix[s2.length][s1.length];

    return 1 - distance / maxLength;
  }
}

export default MatchTool;
