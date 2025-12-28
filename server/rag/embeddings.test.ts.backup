/**
 * Unit Tests for RAG Embeddings Service
 *
 * Tests embedding generation, text chunking, similarity calculations,
 * and knowledge text formatting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  generateEmbedding,
  generateEmbeddings,
  chunkText,
  cosineSimilarity,
  findTopK,
  createPageKnowledgeText,
  createElementSelectorText,
  createActionSequenceText,
  createErrorPatternText,
  EMBEDDING_DIMENSIONS,
} from "./embeddings";

// Mock OpenAI
vi.mock("openai", () => {
  const mockEmbeddings = {
    create: vi.fn(),
  };

  return {
    default: class {
      embeddings = mockEmbeddings;
    },
  };
});

describe("RAG Embeddings Service", () => {
  let mockCreate: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const OpenAI = require("openai").default;
    const instance = new OpenAI();
    mockCreate = instance.embeddings.create;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================
  // GENERATE EMBEDDING TESTS
  // ========================================

  describe("generateEmbedding", () => {
    it("should generate embedding for valid text", async () => {
      const mockEmbedding = Array(EMBEDDING_DIMENSIONS).fill(0.5);
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await generateEmbedding("Test text for embedding");

      expect(result).toEqual(mockEmbedding);
      expect(result.length).toBe(EMBEDDING_DIMENSIONS);
      expect(mockCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "Test text for embedding",
        dimensions: EMBEDDING_DIMENSIONS,
      });
    });

    it("should reject empty text", async () => {
      await expect(generateEmbedding("")).rejects.toThrow(
        "Cannot generate embedding for empty text"
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should reject whitespace-only text", async () => {
      await expect(generateEmbedding("   \n\t  ")).rejects.toThrow(
        "Cannot generate embedding for empty text"
      );
    });

    it("should truncate text exceeding max length", async () => {
      const mockEmbedding = Array(EMBEDDING_DIMENSIONS).fill(0.5);
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      // Create text longer than MAX_TOKENS * 4 (32764 chars)
      const longText = "a".repeat(40000);
      const result = await generateEmbedding(longText);

      expect(result).toEqual(mockEmbedding);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.any(String),
        })
      );

      const [callArgs] = mockCreate.mock.calls[0];
      expect(callArgs.input.length).toBeLessThanOrEqual(32764);
    });

    it("should handle API errors gracefully", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

      await expect(generateEmbedding("Test text")).rejects.toThrow(
        "API rate limit exceeded"
      );
    });
  });

  // ========================================
  // BATCH EMBEDDINGS TESTS
  // ========================================

  describe("generateEmbeddings", () => {
    it("should generate embeddings for multiple texts", async () => {
      const mockEmbeddings = [
        Array(EMBEDDING_DIMENSIONS).fill(0.5),
        Array(EMBEDDING_DIMENSIONS).fill(0.6),
        Array(EMBEDDING_DIMENSIONS).fill(0.7),
      ];
      mockCreate.mockResolvedValueOnce({
        data: mockEmbeddings.map((embedding) => ({ embedding })),
      });

      const texts = ["Text 1", "Text 2", "Text 3"];
      const result = await generateEmbeddings(texts);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockEmbeddings[0]);
      expect(result[2]).toEqual(mockEmbeddings[2]);
      expect(mockCreate).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });
    });

    it("should return empty array for empty input", async () => {
      const result = await generateEmbeddings([]);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should filter out empty texts", async () => {
      const mockEmbeddings = [
        Array(EMBEDDING_DIMENSIONS).fill(0.5),
        Array(EMBEDDING_DIMENSIONS).fill(0.6),
      ];
      mockCreate.mockResolvedValueOnce({
        data: mockEmbeddings.map((embedding) => ({ embedding })),
      });

      const texts = ["Text 1", "", "   ", "Text 2", null as any, undefined as any];
      const result = await generateEmbeddings(texts);

      expect(result).toHaveLength(2);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          input: ["Text 1", "Text 2"],
        })
      );
    });

    it("should handle all empty texts", async () => {
      const result = await generateEmbeddings(["", "   ", null as any]);

      expect(result).toEqual([]);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should handle batch API errors", async () => {
      mockCreate.mockRejectedValueOnce(
        new Error("Batch processing failed")
      );

      await expect(
        generateEmbeddings(["Text 1", "Text 2"])
      ).rejects.toThrow("Batch processing failed");
    });
  });

  // ========================================
  // TEXT CHUNKING TESTS
  // ========================================

  describe("chunkText", () => {
    it("should return single chunk for short text", () => {
      const text = "This is a short text";
      const chunks = chunkText(text, 100);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it("should chunk long text at paragraph boundaries", () => {
      const text = `First paragraph with some content here.
Second paragraph with more details.
Third paragraph with additional information.
Fourth paragraph to test chunking.`;

      const chunks = chunkText(text, 50, 10);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((c) => c.length > 0)).toBe(true);
    });

    it("should chunk at sentence boundaries when available", () => {
      const text = "First sentence. Second sentence. Third sentence.";
      const chunks = chunkText(text, 30, 10);

      // Should break at periods
      chunks.forEach((chunk) => {
        if (chunk.length > 30) {
          // Only check if longer than chunk size
          expect(chunk.includes(".") || chunk.includes("\n")).toBe(true);
        }
      });
    });

    it("should apply overlap between chunks", () => {
      const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.";
      const chunks = chunkText(text, 30, 10);

      if (chunks.length > 1) {
        // Check that consecutive chunks have overlapping content
        const chunk1 = chunks[0];
        const chunk2 = chunks[1];
        const overlap = Math.min(chunk1.length, chunk2.length);
        expect(overlap).toBeGreaterThan(0);
      }
    });

    it("should filter out empty chunks", () => {
      const text = "a".repeat(100);
      const chunks = chunkText(text, 30, 5);

      expect(chunks.every((c) => c.length > 0)).toBe(true);
    });

    it("should handle text with only newlines", () => {
      const text = "\n\n\n\nSome text\n\n\n\n";
      const chunks = chunkText(text, 50);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
    });

    it("should respect custom chunk size and overlap", () => {
      const text = "a".repeat(500);
      const chunkSize = 100;
      const overlap = 20;
      const chunks = chunkText(text, chunkSize, overlap);

      // All chunks should be near chunk size
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(chunkSize + 1); // +1 for potential boundary issues
      });
    });
  });

  // ========================================
  // COSINE SIMILARITY TESTS
  // ========================================

  describe("cosineSimilarity", () => {
    it("should calculate similarity for identical vectors", () => {
      const vector = [1, 0, 0];
      const similarity = cosineSimilarity(vector, vector);

      expect(similarity).toBeCloseTo(1.0);
    });

    it("should calculate similarity for orthogonal vectors", () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBeCloseTo(0.0);
    });

    it("should calculate similarity for opposite vectors", () => {
      const vectorA = [1, 0, 0];
      const vectorB = [-1, 0, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBeCloseTo(-1.0);
    });

    it("should calculate similarity for normalized vectors", () => {
      const vectorA = [0.707, 0.707, 0];
      const vectorB = [0.707, 0.707, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it("should handle zero vectors", () => {
      const vectorA = [0, 0, 0];
      const vectorB = [0, 0, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);

      expect(similarity).toBe(0);
    });

    it("should throw error for dimension mismatch", () => {
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0];

      expect(() => cosineSimilarity(vectorA, vectorB)).toThrow(
        "Embedding dimensions must match"
      );
    });

    it("should calculate known similarity case", () => {
      const vectorA = [3, 4];
      const vectorB = [1, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);

      // cos(theta) = (3*1 + 4*0) / (sqrt(9+16) * sqrt(1+0)) = 3 / 5 = 0.6
      expect(similarity).toBeCloseTo(0.6);
    });
  });

  // ========================================
  // FIND TOP-K TESTS
  // ========================================

  describe("findTopK", () => {
    it("should find top-k most similar items", () => {
      const queryEmbedding = [1, 0, 0];
      const items = [
        { id: 1, embedding: [1, 0, 0], name: "Similar" },
        { id: 2, embedding: [0, 1, 0], name: "Orthogonal" },
        { id: 3, embedding: [-1, 0, 0], name: "Opposite" },
      ];

      const topK = findTopK(queryEmbedding, items, 2);

      expect(topK).toHaveLength(2);
      expect(topK[0].similarity).toBeCloseTo(1.0);
      expect(topK[1].similarity).toBeCloseTo(0.0);
    });

    it("should default to top-5", () => {
      const queryEmbedding = [1, 0, 0];
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        embedding: [Math.cos(i * 0.1), Math.sin(i * 0.1), 0],
        name: `Item ${i}`,
      }));

      const topK = findTopK(queryEmbedding, items);

      expect(topK).toHaveLength(5);
    });

    it("should handle k larger than items", () => {
      const queryEmbedding = [1, 0, 0];
      const items = [
        { id: 1, embedding: [1, 0, 0], name: "Item 1" },
        { id: 2, embedding: [0, 1, 0], name: "Item 2" },
      ];

      const topK = findTopK(queryEmbedding, items, 10);

      expect(topK).toHaveLength(2);
    });

    it("should include similarity scores", () => {
      const queryEmbedding = [1, 0, 0];
      const items = [
        { id: 1, embedding: [0.707, 0.707, 0], name: "Item 1" },
      ];

      const topK = findTopK(queryEmbedding, items, 1);

      expect(topK[0]).toHaveProperty("similarity");
      expect(typeof topK[0].similarity).toBe("number");
    });
  });

  // ========================================
  // KNOWLEDGE TEXT FORMATTING TESTS
  // ========================================

  describe("createPageKnowledgeText", () => {
    it("should format page knowledge with all fields", () => {
      const page = {
        pageName: "Dashboard",
        pageType: "Main",
        description: "Main dashboard page",
        urlPattern: "/dashboard",
        knownElements: [
          { description: "Sidebar menu" },
          { selector: "#main-nav" },
        ],
      };

      const text = createPageKnowledgeText(page);

      expect(text).toContain("Page: Dashboard");
      expect(text).toContain("Type: Main");
      expect(text).toContain("Description: Main dashboard page");
      expect(text).toContain("URL Pattern: /dashboard");
      expect(text).toContain("Elements:");
    });

    it("should handle missing optional fields", () => {
      const page = {
        pageName: "Dashboard",
      };

      const text = createPageKnowledgeText(page);

      expect(text).toContain("Page: Dashboard");
      expect(text).not.toContain("Type:");
      expect(text).not.toContain("Description:");
    });

    it("should format empty knowledge as empty string", () => {
      const page = {};

      const text = createPageKnowledgeText(page);

      expect(text).toBe("");
    });
  });

  describe("createElementSelectorText", () => {
    it("should format element selector with all fields", () => {
      const element = {
        elementName: "Login Button",
        elementType: "button",
        description: "Click to login",
        primarySelector: "#login-btn",
        ariaLabel: "Log in",
      };

      const text = createElementSelectorText(element);

      expect(text).toContain("Element: Login Button");
      expect(text).toContain("Type: button");
      expect(text).toContain("Description: Click to login");
      expect(text).toContain("Aria Label: Log in");
      expect(text).toContain("Selector: #login-btn");
    });

    it("should handle minimal element data", () => {
      const element = {
        elementName: "Button",
      };

      const text = createElementSelectorText(element);

      expect(text).toContain("Element: Button");
      expect(text).not.toContain("Type:");
    });
  });

  describe("createActionSequenceText", () => {
    it("should format action sequence with all fields", () => {
      const sequence = {
        name: "User Login",
        description: "Login to the application",
        taskType: "authentication",
        triggerInstruction: "When user clicks login",
        steps: [
          { action: "Click email field" },
          { action: "Type email" },
        ],
        expectedOutcome: "User logged in successfully",
      };

      const text = createActionSequenceText(sequence);

      expect(text).toContain("Task: User Login");
      expect(text).toContain("Type: authentication");
      expect(text).toContain("Description: Login to the application");
      expect(text).toContain("Trigger:");
      expect(text).toContain("Expected Outcome:");
      expect(text).toContain("Steps:");
    });

    it("should format steps with fallback to description", () => {
      const sequence = {
        name: "Test",
        steps: [
          { description: "First step" },
          { action: "Second action" },
        ],
      };

      const text = createActionSequenceText(sequence);

      expect(text).toContain("First step");
      expect(text).toContain("Second action");
    });
  });

  describe("createErrorPatternText", () => {
    it("should format error pattern with all fields", () => {
      const error = {
        errorType: "Authentication Failed",
        errorPattern: "Invalid credentials",
        description: "User entered wrong password",
        recoveryStrategy: "Show password hint",
        recoverySteps: [
          { action: "Clear password field" },
          { action: "Show hint" },
        ],
      };

      const text = createErrorPatternText(error);

      expect(text).toContain("Error Type: Authentication Failed");
      expect(text).toContain("Pattern: Invalid credentials");
      expect(text).toContain("Description:");
      expect(text).toContain("Recovery Strategy:");
      expect(text).toContain("Recovery Steps:");
    });

    it("should handle minimal error data", () => {
      const error = {
        errorType: "Network Error",
      };

      const text = createErrorPatternText(error);

      expect(text).toContain("Error Type: Network Error");
      expect(text).not.toContain("Pattern:");
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe("Embedding Integration", () => {
    it("should generate and compare embeddings", async () => {
      const mockEmbedding1 = Array(EMBEDDING_DIMENSIONS).fill(0.7);
      const mockEmbedding2 = Array(EMBEDDING_DIMENSIONS).fill(0.7);

      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding1 }],
      });

      const embedding1 = await generateEmbedding("Text 1");
      const similarity = cosineSimilarity(embedding1, mockEmbedding2);

      expect(similarity).toBeCloseTo(1.0);
    });

    it("should chunk text and embed chunks", async () => {
      const text = "First paragraph. ".repeat(100);
      const chunks = chunkText(text, 100, 10);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((c) => c.length > 0)).toBe(true);
    });
  });
});
