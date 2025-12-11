# Stagehand Prompting Best Practices

> Write effective prompts for reliable browser automation in GHL Agency AI

## Quick Reference

### Act Method - Single Actions

```typescript
// GOOD - Single, specific actions
await stagehand.act("click the 'Add to Cart' button");
await stagehand.act("type 'user@example.com' into the email field");

// BAD - Multiple actions combined
await stagehand.act("fill out the form and submit it");
```

### Key Rules for `act()`

1. **One action per call** - Never combine multiple actions
2. **Use element types, not colors** - Say "button" not "blue button"
3. **Be descriptive** - "click the 'Next' button at the bottom" not "click next"
4. **Use correct verbs**:
   - `click` - buttons, links, checkboxes
   - `type` - text inputs
   - `select` - dropdowns
   - `check/uncheck` - checkboxes
   - `upload` - file inputs

### Variables for Sensitive Data

```typescript
// Protect credentials with variables
await stagehand.act("type %username% into the email field", {
  variables: { username: "user@example.com" }
});

await stagehand.act("type %password% into the password field", {
  variables: { password: process.env.USER_PASSWORD }
});
```

## Extract Method - Get Data

```typescript
// GOOD - Descriptive names, correct types, descriptions
const productData = await stagehand.extract(
  "Extract product information",
  z.object({
    productTitle: z.string().describe("The main product name"),
    priceInDollars: z.number().describe("Current price as number"),
    isInStock: z.boolean().describe("Whether available for purchase")
  })
);

// For URLs - use z.string().url()
const links = await stagehand.extract(
  "Extract navigation links",
  z.array(z.object({
    text: z.string(),
    url: z.string().url()  // Required for URL extraction
  }))
);
```

## Observe Method - Find Elements

```typescript
// Check elements exist before acting
const loginButtons = await stagehand.observe("Find the login button");

if (loginButtons.length > 0) {
  await stagehand.act(loginButtons[0]);
} else {
  console.log("No login button found");
}

// Be specific about element types
const submitButtons = await stagehand.observe("Find submit button in the form");
```

## Agent Method - Complex Workflows

```typescript
// Navigate first - don't include in task
await page.goto('https://amazon.com');

// Then execute with detailed instructions
await agent.execute({
  instruction: "Find Italian restaurants in Brooklyn that are open after 10pm, have outdoor seating, and are rated 4+ stars. Save the top 3 results.",
  maxSteps: 25
});
```

### Agent Best Practices

1. **Navigate separately** - Don't put navigation in agent instructions
2. **Be highly specific** - Detailed instructions = better results
3. **Set appropriate step limits**:
   - Simple task: 10-15 steps
   - Medium task: 20-30 steps
   - Complex task: 40-50 steps
4. **Include success criteria** - Tell agent how to know when done

## Common Mistakes

| ❌ Don't | ✅ Do |
|----------|-------|
| "click the blue button" | "click the 'Submit' button" |
| "fill out the form" | "type 'email@example.com' into the email field" |
| "get product info" | Use schema with z.object({...}) |
| Expose passwords in prompts | Use variables: %password% |
| Skip element checking | Use observe() before act() |

## Example: Login Flow

```typescript
// Navigate to page
await page.goto('https://example.com/login');

// Check for login form
const emailFields = await stagehand.observe("Find the email input field");
if (emailFields.length === 0) {
  throw new Error("Login form not found");
}

// Enter credentials (using variables for security)
await stagehand.act("type %email% into the email input field", {
  variables: { email: userEmail }
});

await stagehand.act("type %password% into the password input field", {
  variables: { password: userPassword }
});

// Submit
await stagehand.act("click the 'Sign In' button");

// Verify success
const dashboardElements = await stagehand.observe("Find the dashboard navigation");
if (dashboardElements.length > 0) {
  console.log("Login successful");
}
```

## Example: Data Extraction

```typescript
// Navigate to product page
await page.goto('https://example.com/products');

// Extract structured data
const products = await stagehand.extract(
  "Extract all product listings from the page",
  z.array(z.object({
    name: z.string().describe("Product name/title"),
    price: z.number().describe("Price in dollars without $ symbol"),
    rating: z.number().describe("Star rating out of 5"),
    reviewCount: z.number().describe("Number of reviews"),
    productUrl: z.string().url().describe("Link to product detail page"),
    inStock: z.boolean().describe("Whether item is available")
  }))
);

console.log(`Found ${products.length} products`);
```

## Speed Optimization

### 1. Plan Ahead with Observe (2-3x Faster!)

Use a single `observe()` call to plan multiple actions, then execute without LLM calls:

```typescript
// SLOW - Multiple LLM calls
await stagehand.act("Fill name field");        // LLM call #1
await stagehand.act("Fill email field");       // LLM call #2
await stagehand.act("Select country dropdown"); // LLM call #3

// FAST - One observe, then act without LLM inference
const formFields = await stagehand.observe("Find all form fields to fill");
for (const field of formFields) {
  await stagehand.act(field); // No LLM calls!
}
```

### 2. Optimize DOM Processing

Remove heavy elements before Stagehand processes the page:

```typescript
await page.evaluate(() => {
  // Remove video/iframe elements
  document.querySelectorAll('video, iframe').forEach(el => el.remove());

  // Disable animations
  document.querySelectorAll('[style*="animation"]').forEach(el => {
    (el as HTMLElement).style.animation = 'none';
  });
});

// Then perform operations
await stagehand.act("Click the submit button");
```

### 3. Use Shorter Timeouts

```typescript
// Simple clicks - reduce timeout
await stagehand.act("Click the login button", {
  timeout: 5000  // Default is 30000ms
});

// Page navigation - don't wait for all resources
await page.goto("https://heavy-spa.com", {
  waitUntil: "domcontentloaded",  // Not "networkidle"
  timeout: 15000
});
```

### 4. Performance Tracking

```typescript
class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();

  async timedAct(stagehand: Stagehand, prompt: string) {
    const start = Date.now();
    const result = await stagehand.act(prompt);
    const duration = Date.now() - start;

    console.log(`Action "${prompt}" took ${duration}ms`);
    return result;
  }
}
```

### Speed Comparison

| Method | Time | LLM Calls |
|--------|------|-----------|
| 3x sequential `act()` | ~8000ms | 3 |
| `observe()` + loop `act()` | ~500ms | 1 |

## API Speed Optimizations

The browser router includes several optimized endpoints:

### Fast Endpoints (Reduced Timeouts)

```typescript
// Fast act - 5s timeout instead of 30s
await trpc.browser.fastAct.mutate({
  sessionId: "...",
  instruction: "click the 'Submit' button",
  timeout: 5000  // Optional, default 5s
});

// Fast navigate - domcontentloaded default, auto DOM optimization
await trpc.browser.fastNavigate.mutate({
  sessionId: "...",
  url: "https://example.com",
  waitUntil: "domcontentloaded",  // Default (faster than "networkidle")
  timeout: 15000,
  optimizeDOM: true  // Auto-remove videos/iframes after navigation
});
```

### Batch Actions (2-3x Faster!)

```typescript
// Instead of multiple act() calls, use observe + act pattern
await trpc.browser.batchActions.mutate({
  sessionId: "...",
  instruction: "Find all form fields to fill",
  actionType: "click",  // or "type", "select"
  maxActions: 10
});
// Returns: { elementsFound, actionsPerformed, timing: { observeTimeMs, actTimeMs, totalTimeMs } }
```

### DOM Optimization

```typescript
// Clean up heavy elements before automation
await trpc.browser.optimizeDOM.mutate({
  sessionId: "...",
  removeVideos: true,
  removeIframes: true,
  disableAnimations: true,
  removeHiddenElements: false
});
```

### History & Metrics

```typescript
// Get detailed operation history for debugging
const history = await trpc.browser.getHistory.query({ sessionId: "..." });
// Returns: { history, metrics, stats, slowestOperations, totalOperations, successCount, failedCount }
```

## Multi-Page Workflows

Work with multiple browser tabs/pages simultaneously:

```typescript
// Create a new page
const { pageIndex, totalPages } = await trpc.browser.newPage.mutate({
  sessionId: "...",
  url: "https://example.com/page2"  // Optional
});

// List all pages
const { pages } = await trpc.browser.listPages.query({ sessionId: "..." });
// Returns: [{ index, url, title }, ...]

// Act on a specific page
await trpc.browser.actOnPage.mutate({
  sessionId: "...",
  instruction: "click the submit button",
  pageIndex: 1  // Target the second page
});

// Extract from a specific page with selector
const data = await trpc.browser.extractFromPage.mutate({
  sessionId: "...",
  instruction: "extract all links",
  pageIndex: 0,
  schemaType: "links",  // Built-in: contactInfo, productInfo, tableData, links, custom
  selector: "/html/body/nav"  // Optional XPath to narrow scope
});
```

## Agent Workflows

Use the autonomous agent for complex multi-step tasks:

```typescript
// Basic agent execution
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Find Italian restaurants in Brooklyn that are open after 10pm, have outdoor seating, and are rated 4+ stars. Save the top 3 results.",
  maxSteps: 25
});

// Computer Use Agent (CUA) with custom model
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Apply for a library card at the San Francisco Public Library",
  maxSteps: 30,
  cua: true,
  model: "anthropic/claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful assistant that can use a web browser. Do not ask follow up questions."
});

// Agent with MCP integrations
await trpc.browser.agentExecute.mutate({
  sessionId: "...",
  instruction: "Search for the latest news about AI and summarize the top 3 articles",
  maxSteps: 20,
  integrations: [`https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`]
});
```

## Deep Locator (Iframe Traversal)

Work with elements inside iframes using the `>>` hop notation:

```typescript
// Click button inside an iframe
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#payment >> button.submit",
  action: "click"
});

// Fill input in nested iframe
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#outer >> iframe#inner >> input#email",
  action: "fill",
  value: "user@example.com"
});

// Get text from element in iframe
const result = await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#widget >> .error-message",
  action: "getText"
});
console.log(result.result); // Error text

// Check visibility
const visible = await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#modal >> .dialog",
  action: "isVisible"
});

// Highlight for debugging
await trpc.browser.deepLocatorAction.mutate({
  sessionId: "...",
  selector: "iframe#app >> button.target",
  action: "highlight",
  options: { durationMs: 3000 }
});

// Count elements in iframe
const count = await trpc.browser.deepLocatorCount.query({
  sessionId: "...",
  selector: "iframe#widget >> button"
});
console.log(`Found ${count.count} buttons`);

// Get element coordinates
const centroid = await trpc.browser.deepLocatorCentroid.query({
  sessionId: "...",
  selector: "iframe#payment >> input#card",
  first: true  // Select first match
});
console.log(centroid.centroid); // { x: 100, y: 200 }
```

### Deep Locator Selector Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| CSS with hops | `iframe#outer >> button` | CSS selector with iframe traversal |
| XPath with hops | `//iframe >> //button` | XPath with hop notation |
| Multiple hops | `iframe#a >> iframe#b >> div` | Nested iframes |
| Deep XPath | `//iframe//button` | Auto iframe detection |
| Mixed | `iframe.widget >> xpath=//div[@id='123']` | CSS then XPath |

### Available Actions

- `click` - Click the element
- `fill` - Fill input (requires `value`)
- `type` - Type text with optional delay (requires `value`)
- `hover` - Hover over element
- `highlight` - Highlight for debugging
- `getText` - Get text content
- `getHtml` - Get inner HTML
- `isVisible` - Check visibility
- `isChecked` - Check checkbox state
- `inputValue` - Get input value

## Auto-Caching (10-100x Faster)

Enable caching when creating a session for dramatically faster subsequent runs:

```typescript
// Create session with caching enabled
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
await trpc.browser.agentExecute.mutate({
  sessionId: session.sessionId,
  instruction: "Log in with username 'demo' and password 'test123'",
  maxSteps: 10
});
```

### Cache Management

```typescript
// List all caches
const { caches } = await trpc.browser.listCaches.query();
console.log(caches); // [{ name, createdAt, modifiedAt, ageDays }]

// Clear specific cache (e.g., when website changes)
await trpc.browser.clearCache.mutate({
  cacheDir: "login-workflow"
});

// Clear only if older than 7 days
await trpc.browser.clearCache.mutate({
  cacheDir: "login-workflow",
  olderThanDays: 7
});
```

### When to Clear Cache

- Website structure changed
- Workflow logic needs to be re-explored
- Cache is stale (use `olderThanDays`)
- Getting errors from cached actions

## Debugging Tips

1. Set `verbose: 1` or `verbose: 2` for debugging (not in production)
2. Check element existence with `observe()` before `act()`
3. Log results at each step
4. Start simple, add complexity gradually
5. When prompts fail, be MORE specific, not less
6. Use `getHistory` to identify slow operations
7. Use `fastNavigate` with `optimizeDOM: true` for SPAs
8. Use `listPages` to see all open pages and their URLs
9. Use `deepLocatorAction` with `highlight` to debug iframe selectors
10. Use `listCaches` to check cached workflows
