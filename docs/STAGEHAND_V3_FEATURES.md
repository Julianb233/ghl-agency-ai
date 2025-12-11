# Stagehand V3 Browser Router Features

## Overview

The browser router now includes comprehensive Stagehand V3 features for faster, more powerful browser automation.

---

## Speed Optimizations

### batchActions (2-3x Faster!)
Uses observe + act pattern - single LLM call to find elements, then acts without inference.

```typescript
await trpc.browser.batchActions.mutate({
  sessionId: "...",
  instruction: "Find all form fields to fill",
  actionType: "click",  // or "type", "select"
  maxActions: 10
});
// Returns: { elementsFound, actionsPerformed, timing }
```

### fastAct
Reduced timeout (5s default instead of 30s) for simple, atomic actions.

```typescript
await trpc.browser.fastAct.mutate({
  sessionId: "...",
  instruction: "click the 'Submit' button",
  timeout: 5000
});
```

### fastNavigate
Uses `domcontentloaded` default (faster than `networkidle`) with optional auto DOM optimization.

```typescript
await trpc.browser.fastNavigate.mutate({
  sessionId: "...",
  url: "https://example.com",
  waitUntil: "domcontentloaded",
  timeout: 15000,
  optimizeDOM: true  // Auto-remove videos/iframes
});
```

### optimizeDOM
Remove heavy elements before Stagehand processes the page (20-40% faster).

```typescript
await trpc.browser.optimizeDOM.mutate({
  sessionId: "...",
  removeVideos: true,
  removeIframes: true,
  disableAnimations: true
});
```

### getHistory
Debug with operation history, metrics, and slowest operations.

```typescript
const history = await trpc.browser.getHistory.query({ sessionId: "..." });
// Returns: { history, metrics, stats, slowestOperations, totalOperations }
```

---

## Multi-Page Workflows

### newPage
Create new browser tabs.

```typescript
const { pageIndex, totalPages } = await trpc.browser.newPage.mutate({
  sessionId: "...",
  url: "https://example.com/page2"  // Optional
});
```

### listPages
Get all open pages with URL and title.

```typescript
const { pages } = await trpc.browser.listPages.query({ sessionId: "..." });
// Returns: [{ index, url, title }, ...]
```

### actOnPage / observeOnPage / extractFromPage
Target specific pages by index.

```typescript
await trpc.browser.actOnPage.mutate({
  sessionId: "...",
  instruction: "click the submit button",
  pageIndex: 1  // Target second page
});

const data = await trpc.browser.extractFromPage.mutate({
  sessionId: "...",
  instruction: "extract all links",
  pageIndex: 0,
  schemaType: "links",
  selector: "/html/body/nav"  // Optional XPath
});
```

---

## Agent Workflows

### agentExecute
Autonomous multi-step task execution with optional CUA mode and MCP integrations.

```typescript
// Basic agent
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Find Italian restaurants in Brooklyn rated 4+ stars",
  maxSteps: 25
});

// Computer Use Agent (CUA)
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Apply for a library card",
  maxSteps: 30,
  cua: true,
  model: "anthropic/claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful assistant."
});

// With MCP integrations
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Search for AI news and summarize",
  maxSteps: 20,
  integrations: ["https://mcp.exa.ai/mcp?exaApiKey=..."]
});
```

---

## Deep Locator (Iframe Traversal)

### deepLocatorAction
Target elements inside iframes using `>>` hop notation.

```typescript
// Click inside iframe
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#payment >> button.submit",
  action: "click"
});

// Fill nested iframe input
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#outer >> iframe#inner >> input#email",
  action: "fill",
  value: "user@example.com"
});

// Get text from iframe element
const result = await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#widget >> .error-message",
  action: "getText"
});

// Highlight for debugging
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#app >> button.target",
  action: "highlight",
  options: { durationMs: 3000 }
});
```

### Selector Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| CSS with hops | `iframe#outer >> button` | CSS selector with iframe traversal |
| XPath with hops | `//iframe >> //button` | XPath with hop notation |
| Multiple hops | `iframe#a >> iframe#b >> div` | Nested iframes |
| Deep XPath | `//iframe//button` | Auto iframe detection |

### Available Actions
- `click`, `fill`, `type`, `hover`, `highlight`
- `getText`, `getHtml`, `isVisible`, `isChecked`, `inputValue`

---

## Auto-Caching (10-100x Faster!)

### Enable Caching
Add `cacheDir` when creating a session.

```typescript
const session = await trpc.browser.createSession.mutate({
  cacheDir: "login-workflow",  // Actions cached here
  selfHeal: true,              // Adapt to minor page changes
  browserSettings: {
    blockAds: true,
    solveCaptchas: true
  }
});

// First run: ~20-30 seconds (full LLM inference)
// Subsequent runs: ~2-3 seconds (cached actions, 0 tokens!)
```

### Cache Management

```typescript
// List all caches
const { caches } = await trpc.browser.listCaches.query();
// Returns: [{ name, createdAt, modifiedAt, ageDays }]

// Clear specific cache
await trpc.browser.clearCache.mutate({
  cacheDir: "login-workflow"
});

// Clear only if older than 7 days
await trpc.browser.clearCache.mutate({
  cacheDir: "login-workflow",
  olderThanDays: 7
});
```

---

## Performance Comparison

| Method | Time | LLM Calls |
|--------|------|-----------|
| 3x sequential `act()` | ~8000ms | 3 |
| `batchActions` (observe+act) | ~500ms | 1 |
| First agent run | ~20-30s | Many |
| Cached agent run | ~2-3s | 0 |

---

## All New Endpoints

### Speed
- `batchActions` - Observe + act pattern
- `fastAct` - Reduced timeout
- `fastNavigate` - Fast navigation with DOM optimization
- `optimizeDOM` - Remove heavy elements
- `getHistory` - Debug history and metrics

### Multi-Page
- `newPage` - Create tabs
- `listPages` - List all pages
- `actOnPage` - Act on specific page
- `observeOnPage` - Observe on specific page
- `extractFromPage` - Extract from specific page

### Agent
- `agentExecute` - Autonomous task execution

### Deep Locator
- `deepLocatorAction` - Iframe actions
- `deepLocatorCount` - Count elements in iframes
- `deepLocatorCentroid` - Get element coordinates

### Cache
- `clearCache` - Clear workflow cache
- `listCaches` - List all caches
