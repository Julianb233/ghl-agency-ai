# Stagehand AI Automation Framework Research

**Date**: November 18, 2025  
**Purpose**: Understanding Stagehand capabilities for GHL browser automation

---

## Overview

Stagehand is a browser automation framework by Browserbase that combines AI-powered natural language commands with traditional code-based precision. It solves the core problem of browser automation: traditional frameworks (Playwright/Puppeteer) are too brittle and break with UI changes, while pure AI agents are too unpredictable.

**Key Insight**: Stagehand provides **four primitives** that let you choose exactly how much AI to use:

1. **act()** - Execute individual actions using natural language
2. **extract()** - Pull structured data with schemas
3. **observe()** - Discover available actions on any page
4. **agent()** - Automate entire workflows autonomously

---

## Core Capabilities

### 1. Act - Natural Language Actions

**Purpose**: Perform individual actions on web pages using plain English commands.

**Example**:
```typescript
await stagehand.act("click the add to cart button");
await stagehand.act("type %password% into the password field", {
  variables: { password: process.env.USER_PASSWORD }
});
```

**Key Features**:
- **Self-healing**: Actions automatically adapt when websites change
- **No selectors needed**: Write commands in plain English
- **iFrame & Shadow DOM support**: Automatically handles complex DOM structures
- **Action caching**: Cache actions to avoid repeated LLM calls and ensure consistency
- **Variable support**: Secure handling of sensitive data (passwords, API keys)

**Return Value**:
```typescript
{
  success: true,
  message: 'Action [click] performed successfully',
  actionDescription: 'Favorite Colour',
  actions: [
    {
      selector: 'xpath=/html[1]/body[1]/div[1]/span[1]',
      description: 'Favorite Colour',
      method: 'click',
      arguments: []
    }
  ]
}
```

**Best Practices**:
- Break complex tasks into single-step actions
- Use `observe()` first to discover candidate actions
- Enable caching with `cacheDir` to reduce costs
- Use variables for sensitive data (never hardcode passwords)

---

### 2. Extract - Structured Data Extraction

**Purpose**: Pull clean, typed data from any page using schemas.

**Example**:
```typescript
const price = await stagehand.extract("extract the price", z.number());

const productData = await stagehand.extract("get product details", z.object({
  name: z.string(),
  price: z.number(),
  inStock: z.boolean()
}));
```

**Key Features**:
- Schema-based extraction (Zod schemas)
- Type-safe data extraction
- Works with any page structure
- No manual parsing required

---

### 3. Observe - Action Discovery

**Purpose**: Discover available actions on the current page before executing them.

**Example**:
```typescript
const actions = await stagehand.observe("find submit buttons");

// Returns list of candidate actions with selectors, descriptions, methods
const [action] = await stagehand.observe("click the login button");

if (action) {
  await stagehand.act(action); // Execute discovered action
}
```

**Key Features**:
- Returns list of suggested actions
- Includes selector, description, method, and arguments
- Plan actions before executing
- Reduces errors by validating actions exist

---

### 4. Agent - Autonomous Workflows

**Purpose**: Automate entire multi-step workflows autonomously.

**Example**:
```typescript
const agent = stagehand.agent({
  cua: true, // Computer Use Agent mode
  model: "google/gemini-2.5-computer-use-preview-10-2025",
});

await agent.execute("apply for this job");
await agent.execute("create a new workflow with 3 steps");
```

**Key Features**:
- Autonomous multi-step execution
- Computer Use Agent (CUA) mode for complex tasks
- Customizable AI models
- Handles entire workflows with single command

---

## Advanced Features

### Action Caching

**Purpose**: Reduce LLM costs and ensure consistent execution across runs.

**Setup**:
```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  cacheDir: "act-cache" // Actions automatically cached here
});

// First run - makes LLM call and caches
await stagehand.act("click the login button");

// Subsequent runs - reuses cached action (no LLM call)
await stagehand.act("click the login button");
```

**Benefits**:
- Significantly reduces costs
- Improves performance (no LLM latency)
- Ensures deterministic behavior
- Persists across script executions

---

### Secure Variable Handling

**Purpose**: Protect sensitive data from being shared with LLM providers.

**Syntax**: Use `%variableName%` in instructions

**Example**:
```typescript
await stagehand.act("type %username% into the email field", {
  variables: { username: "user@example.com" }
});

await stagehand.act("type %password% into the password field", {
  variables: { password: process.env.USER_PASSWORD }
});
```

**Best Practices**:
- Load sensitive data from environment variables
- Never hardcode API keys or passwords
- Set `verbose: 0` to prevent secrets in logs

---

### Custom Model Configuration

**Purpose**: Use specific AI models for different tasks.

**Example**:
```typescript
await stagehand.act("choose 'Peach' from the favorite color dropdown", {
  model: {
    modelName: "google/gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY
  },
  timeout: 10000
});
```

**Supported Models**:
- Google Gemini (Flash, Pro, Computer Use)
- OpenAI GPT-4
- Anthropic Claude
- Custom models via API

---

### Integration with Existing Tools

**Compatibility**: Works with Puppeteer, Playwright, Selenium, and Patchright.

**Example** (Puppeteer):
```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import puppeteer from "puppeteer-core";

const stagehand = new Stagehand({ env: "BROWSERBASE" });
await stagehand.init();

const browser = await puppeteer.connect({
  browserWSEndpoint: stagehand.connectURL(),
  defaultViewport: null,
});

const customPage = (await browser.pages())[0];
await customPage.goto("https://www.example.com/blog");

// Use Stagehand with Puppeteer page
await stagehand.act("click the next page button", {
  page: customPage
});
```

---

## Application to GHL Automation

### Why Stagehand is Perfect for GHL

1. **UI Changes**: GHL frequently updates its interface. Stagehand's self-healing actions adapt automatically.

2. **Complex Workflows**: GHL workflows involve multi-step processes (create workflow → add triggers → configure actions → test). Stagehand's `agent()` can handle this autonomously.

3. **Visual Editing**: Many GHL features (funnel builder, email editor) are visual and not exposed via API. Stagehand can interact with these interfaces.

4. **Element Detection**: GHL has dynamic element IDs and complex DOM structures. Stagehand's AI-powered element detection handles this.

5. **Context Understanding**: GHL tasks require understanding context (e.g., "add a delay step after the email action"). Stagehand's AI can interpret these instructions.

---

### GHL-Specific Use Cases

#### 1. Workflow Creation
```typescript
await stagehand.act("click the Create Workflow button");
await stagehand.act("name the workflow 'New Lead Nurture'");
await stagehand.act("add an email trigger");
await stagehand.act("configure trigger to fire on form submission");
await stagehand.act("add a delay action of 2 days");
await stagehand.act("add a send email action");
await stagehand.act("save the workflow");
```

#### 2. Funnel Building
```typescript
const agent = stagehand.agent({ cua: true });
await agent.execute("create a 3-page funnel with landing page, opt-in, and thank you page");
```

#### 3. Campaign Management
```typescript
await stagehand.act("navigate to campaigns");
await stagehand.act("create new email campaign");
await stagehand.act("select the 'Welcome Series' template");
await stagehand.act("customize subject line to 'Welcome to %companyName%'", {
  variables: { companyName: "Acme Corp" }
});
```

#### 4. Sub-Account Setup
```typescript
const agent = stagehand.agent({ cua: true });
await agent.execute("create a new sub-account for client 'John Doe' with phone number (555) 123-4567");
```

---

## Cost Optimization Strategies

### 1. Action Caching
- **First run**: LLM call + cache action
- **Subsequent runs**: Reuse cached action (free)
- **Savings**: 90%+ reduction in LLM costs for repeated tasks

### 2. Observe Before Act
- Use `observe()` to discover actions
- Validate actions exist before executing
- Reduces failed attempts and wasted LLM calls

### 3. Batch Operations
- Group related actions together
- Use `agent()` for multi-step workflows instead of multiple `act()` calls
- Reduces overhead and improves efficiency

### 4. Model Selection
- Use faster/cheaper models (Gemini Flash) for simple tasks
- Reserve expensive models (GPT-4, Claude) for complex reasoning
- Configure per-action model selection

---

## Integration Architecture

### Browserbase + Stagehand Stack

```
User Request (via n8n webhook)
  ↓
GHL Agent AI Backend (tRPC)
  ↓
Browserbase Session Creation
  ↓
Stagehand Initialization
  ↓
AI-Powered Actions (act/extract/observe/agent)
  ↓
GHL Interface Automation
  ↓
Session Recording + Live View
  ↓
Result Storage (Database)
  ↓
Webhook Response (n8n)
```

### Code Example

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { createBrowserSession } from "./browserbase";

export async function automateGHLWorkflow(task: WorkflowTask) {
  // Create Browserbase session
  const session = await createBrowserSession();
  
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    cacheDir: "ghl-actions-cache"
  });
  
  await stagehand.init();
  const page = stagehand.context.pages()[0];
  
  // Navigate to GHL
  await page.goto("https://app.gohighlevel.com");
  
  // Login with secure variables
  await stagehand.act("type %email% into the email field", {
    variables: { email: process.env.GHL_EMAIL }
  });
  
  await stagehand.act("type %password% into the password field", {
    variables: { password: process.env.GHL_PASSWORD }
  });
  
  await stagehand.act("click the login button");
  
  // Wait for dashboard
  await page.waitForURL('**/dashboard');
  
  // Execute workflow creation
  const agent = stagehand.agent({
    cua: true,
    model: "google/gemini-2.5-computer-use-preview-10-2025"
  });
  
  await agent.execute(task.description);
  
  // Return result with session info
  return {
    success: true,
    sessionId: session.sessionId,
    liveViewUrl: session.liveViewUrl
  };
}
```

---

## Next Steps for GHL Agent AI

1. **Priority-rank GHL tasks** by frequency and complexity
2. **Create action library** of cached Stagehand commands for common GHL operations
3. **Build training dataset** of example workflows for agent learning
4. **Implement knowledge storage** for automation patterns
5. **Design cost-per-action** pricing model based on LLM usage
6. **Create white-label SaaS** architecture with n8n webhooks

---

*This research provides the foundation for building an AI-powered GHL automation system that can adapt to UI changes, understand context, and execute complex tasks autonomously.*
