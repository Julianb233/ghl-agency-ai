import { expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

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
