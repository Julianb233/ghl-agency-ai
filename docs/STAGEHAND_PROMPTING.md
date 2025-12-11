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

## Debugging Tips

1. Set `verbose: 1` or `verbose: 2` for debugging (not in production)
2. Check element existence with `observe()` before `act()`
3. Log results at each step
4. Start simple, add complexity gradually
5. When prompts fail, be MORE specific, not less
