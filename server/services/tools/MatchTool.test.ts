/**
 * MatchTool Unit Tests
 * Tests for multi-page comparison and pattern matching functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MatchTool } from './MatchTool';
import { ToolExecutionContext } from './types';
import { stagehandService } from '../stagehand.service';

// Mock the stagehandService
vi.mock('../stagehand.service', () => ({
  stagehandService: {
    getSession: vi.fn(),
    listTabs: vi.fn(),
    switchTab: vi.fn(),
    screenshot: vi.fn(),
  },
}));

describe('MatchTool', () => {
  let matchTool: MatchTool;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    matchTool = new MatchTool();
    mockContext = {
      userId: 1,
      sessionId: 'test-session-123',
      executionId: 1,
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(matchTool.name).toBe('match');
      expect(matchTool.category).toBe('browser');
      expect(matchTool.enabled).toBe(true);
      expect(matchTool.description).toContain('Compare and match content');
    });

    it('should return valid tool definition', () => {
      const definition = matchTool.getDefinition();

      expect(definition.name).toBe('match');
      expect(definition.description).toBeTruthy();
      expect(definition.parameters.type).toBe('object');
      expect(definition.parameters.properties.action).toBeDefined();
      expect(definition.parameters.properties.action.enum).toContain('match');
      expect(definition.parameters.properties.action.enum).toContain('compare');
      expect(definition.parameters.properties.action.enum).toContain('diff');
      expect(definition.parameters.properties.action.enum).toContain('extract');
    });

    it('should define all required parameters', () => {
      const definition = matchTool.getDefinition();

      expect(definition.parameters.required).toContain('action');
      expect(definition.parameters.required).toContain('sessionId');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate match action requires pattern', () => {
      const validation = matchTool.validate({
        action: 'match',
        sessionId: 'test-session',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('pattern is required for match action');
    });

    it('should validate compare action requires both tabIds', () => {
      const validation1 = matchTool.validate({
        action: 'compare',
        sessionId: 'test-session',
        tabId1: 'tab1',
      });

      expect(validation1.valid).toBe(false);
      expect(validation1.errors).toContain('tabId2 is required for compare action');

      const validation2 = matchTool.validate({
        action: 'compare',
        sessionId: 'test-session',
        tabId2: 'tab2',
      });

      expect(validation2.valid).toBe(false);
      expect(validation2.errors).toContain('tabId1 is required for compare action');
    });

    it('should validate diff action requires snapshots', () => {
      const validation = matchTool.validate({
        action: 'diff',
        sessionId: 'test-session',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('snapshots is required for diff action');
    });

    it('should validate extract action requires pattern', () => {
      const validation = matchTool.validate({
        action: 'extract',
        sessionId: 'test-session',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('pattern is required for extract action');
    });

    it('should accept valid match parameters', () => {
      const validation = matchTool.validate({
        action: 'match',
        sessionId: 'test-session',
        pattern: 'test pattern',
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should reject invalid action', () => {
      const validation = matchTool.validate({
        action: 'invalid_action',
        sessionId: 'test-session',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid action');
    });

    it('should require sessionId', () => {
      const validation = matchTool.validate({
        action: 'match',
        pattern: 'test',
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('sessionId is required');
    });
  });

  describe('Match Pattern Action', () => {
    beforeEach(() => {
      // Mock browser session and tabs
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue('This is test content with pattern'),
        },
      } as any);

      vi.mocked(stagehandService.listTabs).mockResolvedValue({
        success: true,
        tabs: [
          { id: 'tab1', title: 'Page 1', url: 'https://example.com/page1', isActive: true },
          { id: 'tab2', title: 'Page 2', url: 'https://example.com/page2', isActive: false },
        ],
      });

      vi.mocked(stagehandService.switchTab).mockResolvedValue({ success: true });
    });

    it('should match pattern across all tabs', async () => {
      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: 'pattern',
          matchType: 'contains',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalTabs).toBe(2);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should filter tabs when pages parameter is provided', async () => {
      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: 'test',
          pages: 'tab1',
          matchType: 'contains',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      // Should only search tab1
      expect(vi.mocked(stagehandService.switchTab)).toHaveBeenCalledWith('test-session', 'tab1');
    });

    it('should handle regex pattern matching', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue('Email: test@example.com and user@domain.org'),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: '[a-z]+@[a-z]+\\.[a-z]+',
          matchType: 'regex',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.results).toBeDefined();
    });

    it('should handle case sensitive matching', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue('Test TEST test'),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: 'TEST',
          matchType: 'exact',
          caseSensitive: 'true',
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should limit matches based on maxMatches parameter', async () => {
      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: 'test',
          matchType: 'contains',
          maxMatches: '1',
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should handle no matches found', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue('Content without the search term'),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          pattern: 'nonexistent',
          matchType: 'contains',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.tabsWithMatches).toBe(0);
    });

    it('should handle session not found', async () => {
      vi.mocked(stagehandService.listTabs).mockResolvedValue({
        success: false,
        error: 'Session not found',
      });

      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'invalid-session',
          pattern: 'test',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get tabs');
    });
  });

  describe('Compare Action', () => {
    beforeEach(() => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn()
            .mockResolvedValueOnce('Content from tab 1')
            .mockResolvedValueOnce('Content from tab 2'),
        },
      } as any);

      vi.mocked(stagehandService.switchTab).mockResolvedValue({ success: true });
    });

    it('should compare text content between two tabs', async () => {
      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'test-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
          compareType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toBeDefined();
      expect(result.data.result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.data.result.similarity).toBeLessThanOrEqual(1);
    });

    it('should detect identical content', async () => {
      const identicalContent = 'Identical content';
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue(identicalContent),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'test-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
          compareType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.result.identical).toBe(true);
      expect(result.data.result.similarity).toBe(1);
    });

    it('should compare structure between tabs', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn()
            .mockResolvedValueOnce(null) // text content (not needed for structure)
            .mockResolvedValueOnce({ tag: 'div', attributes: {}, children: [] })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ tag: 'div', attributes: { class: 'test' }, children: [] }),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'test-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
          compareType: 'structure',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toBeDefined();
    });

    it('should handle threshold parameter', async () => {
      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'test-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
          compareType: 'text',
          threshold: '0.9',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.threshold).toBe(0.9);
      expect(result.data.passesThreshold).toBeDefined();
    });

    it('should support selector-scoped comparison', async () => {
      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'test-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
          compareType: 'text',
          selector: '.content',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(stagehandService.getSession).mock.results[0].value.page.evaluate)
        .toHaveBeenCalledWith(expect.any(Function), '.content');
    });

    it('should handle missing session', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue(null);

      const result = await matchTool.execute(
        {
          action: 'compare',
          sessionId: 'invalid-session',
          tabId1: 'tab1',
          tabId2: 'tab2',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('Diff Action', () => {
    beforeEach(() => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn()
            .mockResolvedValueOnce('Snapshot 1 content')
            .mockResolvedValueOnce('Snapshot 2 content')
            .mockResolvedValueOnce('Snapshot 3 content'),
        },
      } as any);

      vi.mocked(stagehandService.listTabs).mockResolvedValue({
        success: true,
        tabs: [
          { id: 'tab1', title: 'Page 1', url: 'https://example.com/page1', isActive: true },
          { id: 'tab2', title: 'Page 2', url: 'https://example.com/page2', isActive: false },
          { id: 'tab3', title: 'Page 3', url: 'https://example.com/page3', isActive: false },
        ],
      });

      vi.mocked(stagehandService.switchTab).mockResolvedValue({ success: true });
    });

    it('should find differences across multiple snapshots', async () => {
      const snapshots = [
        { tabId: 'tab1', label: 'Baseline' },
        { tabId: 'tab2', label: 'Version 2' },
        { tabId: 'tab3', label: 'Version 3' },
      ];

      const result = await matchTool.execute(
        {
          action: 'diff',
          sessionId: 'test-session',
          snapshots: JSON.stringify(snapshots),
          diffType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.snapshotCount).toBe(3);
      expect(result.data.comparisons).toHaveLength(2); // Compare with baseline
    });

    it('should handle ignoreWhitespace option', async () => {
      const result = await matchTool.execute(
        {
          action: 'diff',
          sessionId: 'test-session',
          snapshots: JSON.stringify([
            { tabId: 'tab1' },
            { tabId: 'tab2' },
          ]),
          diffType: 'text',
          ignoreWhitespace: 'true',
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should handle ignoreCase option', async () => {
      const result = await matchTool.execute(
        {
          action: 'diff',
          sessionId: 'test-session',
          snapshots: JSON.stringify([
            { tabId: 'tab1' },
            { tabId: 'tab2' },
          ]),
          diffType: 'text',
          ignoreCase: 'true',
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });

    it('should reject less than 2 snapshots', async () => {
      const result = await matchTool.execute(
        {
          action: 'diff',
          sessionId: 'test-session',
          snapshots: JSON.stringify([{ tabId: 'tab1' }]),
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 2 snapshots are required');
    });

    it('should compare structure differences', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ tag: 'div', children: [] })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ tag: 'span', children: [] }),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'diff',
          sessionId: 'test-session',
          snapshots: JSON.stringify([
            { tabId: 'tab1', label: 'Before' },
            { tabId: 'tab2', label: 'After' },
          ]),
          diffType: 'structure',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.diffType).toBe('structure');
    });
  });

  describe('Extract Action', () => {
    beforeEach(() => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue([
            { content: 'match1' },
            { content: 'match2' },
          ]),
        },
      } as any);

      vi.mocked(stagehandService.switchTab).mockResolvedValue({ success: true });
    });

    it('should extract text matches', async () => {
      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'test',
          extractType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.matches).toBeDefined();
      expect(result.data.totalMatches).toBe(2);
    });

    it('should extract links', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue([
            { content: 'Link 1', href: 'https://example.com/1' },
            { content: 'Link 2', href: 'https://example.com/2' },
          ]),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'Link',
          extractType: 'links',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.extractType).toBe('links');
    });

    it('should extract images', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue([
            { content: 'Alt text', src: 'https://example.com/image.jpg' },
          ]),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'image',
          extractType: 'images',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.extractType).toBe('images');
    });

    it('should extract with regex pattern', async () => {
      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: '[0-9]+',
          matchType: 'regex',
          extractType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.matchType).toBe('regex');
    });

    it('should extract from specific tab', async () => {
      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          tabId: 'tab1',
          pattern: 'test',
          extractType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(stagehandService.switchTab)).toHaveBeenCalledWith('test-session', 'tab1');
    });

    it('should extract with selector scope', async () => {
      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'test',
          extractType: 'text',
          selector: '.content',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(vi.mocked(stagehandService.getSession).mock.results[0].value.page.evaluate)
        .toHaveBeenCalledWith(expect.any(Function), '.content', 'text', 'test', 'regex');
    });

    it('should handle extract with no matches', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue({
        page: {
          evaluate: vi.fn().mockResolvedValue([]),
        },
      } as any);

      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'nonexistent',
          extractType: 'text',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.totalMatches).toBe(0);
    });

    it('should handle missing session for extract', async () => {
      vi.mocked(stagehandService.getSession).mockReturnValue(null);

      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'invalid-session',
          pattern: 'test',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
          // Missing pattern
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('pattern is required');
    });

    it('should handle execution errors', async () => {
      vi.mocked(stagehandService.getSession).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await matchTool.execute(
        {
          action: 'extract',
          sessionId: 'test-session',
          pattern: 'test',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
    });

    it('should include duration in all results', async () => {
      const result = await matchTool.execute(
        {
          action: 'match',
          sessionId: 'test-session',
        },
        mockContext
      );

      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Similarity Calculation', () => {
    it('should calculate 100% similarity for identical strings', () => {
      // Access the private method via any cast for testing
      const tool = matchTool as any;
      const similarity = tool.calculateSimilarity('test', 'test', true);
      expect(similarity).toBe(1);
    });

    it('should calculate 0% similarity for completely different strings', () => {
      const tool = matchTool as any;
      const similarity = tool.calculateSimilarity('abc', 'xyz', true);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle case insensitive similarity', () => {
      const tool = matchTool as any;
      const similarity = tool.calculateSimilarity('TEST', 'test', false);
      expect(similarity).toBe(1);
    });

    it('should handle empty strings', () => {
      const tool = matchTool as any;
      const similarity1 = tool.calculateSimilarity('', '', true);
      const similarity2 = tool.calculateSimilarity('test', '', true);

      expect(similarity1).toBe(1);
      expect(similarity2).toBe(0);
    });
  });
});
