import { vi, afterEach } from 'vitest';
import React from 'react';

// Global ioredis mock - MUST be before any other imports that use Redis
// This prevents Redis connection attempts during tests
vi.mock('ioredis', () => {
  // Create a mock Redis class that can be instantiated with 'new'
  class MockRedis {
    get = vi.fn().mockResolvedValue(null);
    set = vi.fn().mockResolvedValue('OK');
    setex = vi.fn().mockResolvedValue('OK');
    psetex = vi.fn().mockResolvedValue('OK');
    del = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue('OK');
    ping = vi.fn().mockResolvedValue('PONG');
    on = vi.fn().mockReturnThis();
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
    duplicate = vi.fn().mockReturnThis();
    subscribe = vi.fn().mockResolvedValue(undefined);
    unsubscribe = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(0);
    exists = vi.fn().mockResolvedValue(0);
    ttl = vi.fn().mockResolvedValue(-2);
    incrby = vi.fn().mockResolvedValue(1);
    decrby = vi.fn().mockResolvedValue(0);
    eval = vi.fn().mockResolvedValue([1, 10, Date.now() + 60000]);
    multi = vi.fn().mockReturnValue({
      zremrangebyscore: vi.fn().mockReturnThis(),
      zcard: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      pexpire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 0], [null, 0], [null, 1], [null, 1]]),
    });
    scanStream = vi.fn().mockReturnValue({
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'end') setTimeout(callback, 0);
        return { on: vi.fn() };
      }),
    });
  }

  return {
    default: MockRedis,
  };
});
import '@testing-library/jest-dom/vitest';

// Make React available globally for JSX in tests
(globalThis as any).React = React;

// Server-side environment setup (node environment)
if (typeof window === 'undefined') {
  // Required for encryption tests
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0'.repeat(64);
  // Database URL for tests
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
  // OAuth credentials for tests
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
  process.env.MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || 'test-microsoft-client-id';
  process.env.MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || 'test-microsoft-client-secret';
  // Webhook secret for tests
  process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-webhook-secret';
  // OpenAI API key for RAG/embeddings tests
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-api-key';
  // Anthropic API key for agent tests
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-anthropic-api-key';
}

// Clean up after each test (only in browser environment)
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
  });

  // Mock window.matchMedia for components that use it
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock ResizeObserver
  if (typeof ResizeObserver === 'undefined') {
    (global as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
