# Browser AI Agent Training Research

**Date**: November 18, 2025  
**Purpose**: Research how teams train browser automation agents and create training documentation

---

## Key Findings from Industry Research

### 1. AgentQ Framework (AGI Inc)

**Source**: DeepLearning.AI course "Building AI Browser Agents"

**Training Methodology**: AgentQ uses a combination of three techniques to enable agents to self-correct and improve:

1. **Monte Carlo Tree Search (MCTS)**: Explores multiple possible action paths and selects the most optimal one
2. **Self-Critique Mechanism**: Agent evaluates its own actions and identifies errors
3. **Direct Preference Optimization (DPO)**: Reinforcement learning algorithm that learns from successful vs. failed attempts

**Key Insight**: Instead of relying on pre-written scripts, agents learn by:
- **Observing**: Analyzing webpage structure (DOM, screenshots)
- **Reasoning**: Determining which actions to take
- **Acting**: Executing actions
- **Learning**: Improving from successes and failures

---

### 2. Stagehand Caching System

**Source**: Stagehand documentation and GitHub repository

**Training Approach**: Stagehand uses a **cache directory** to store learned automation patterns:

```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  cacheDir: "ghl-actions-cache" // Stores learned patterns
});
```

**What Gets Cached**:
- Element selectors that worked successfully
- Action sequences for common tasks
- Page structure patterns
- Error recovery strategies

**Benefits**:
- Faster execution (reuses known patterns)
- Lower LLM costs (fewer AI calls needed)
- More reliable (proven selectors)
- Continuous improvement (cache grows over time)

---

### 3. Visual + Structural Data Approach

**Industry Standard**: Modern browser agents use **both** visual and structural data:

1. **Visual Information**: Screenshots analyzed by vision models
2. **Structural Data**: HTML DOM tree for precise element identification

**Why Both?**: 
- Visual: Understands layout, context, user intent
- Structural: Provides precise selectors, attributes, relationships

---

## Training Data Structures

### Element Selector Cache

```json
{
  "task": "create_workflow",
  "page_url": "https://app.gohighlevel.com/v2/location/*/workflows",
  "selectors": {
    "create_button": {
      "selector": "button[data-testid='create-workflow']",
      "success_rate": 0.98,
      "last_verified": "2025-11-18T10:30:00Z",
      "fallback_selectors": [
        "button:has-text('Create Workflow')",
        "//button[contains(text(), 'Create')]"
      ]
    }
  }
}
```

---

### Action Sequence Templates

```json
{
  "task_id": "workflow_creation",
  "task_name": "Create Basic Email Workflow",
  "complexity": "moderate",
  "steps": [
    {
      "step": 1,
      "action": "navigate",
      "target": "https://app.gohighlevel.com/v2/location/{locationId}/workflows"
    },
    {
      "step": 2,
      "action": "click",
      "selector": "button[data-testid='create-workflow']",
      "wait_for": "input[name='workflow-name']"
    },
    {
      "step": 3,
      "action": "type",
      "selector": "input[name='workflow-name']",
      "value": "{workflow_name}",
      "variables": ["workflow_name"]
    }
  ],
  "success_count": 127,
  "failure_count": 3,
  "last_updated": "2025-11-18T10:30:00Z"
}
```

---

### Error Recovery Patterns

```json
{
  "error_type": "element_not_found",
  "context": "workflow_builder",
  "recovery_strategies": [
    {
      "strategy": "wait_and_retry",
      "max_attempts": 3,
      "wait_time_ms": 2000,
      "success_rate": 0.85
    },
    {
      "strategy": "refresh_page",
      "success_rate": 0.60
    },
    {
      "strategy": "use_fallback_selector",
      "success_rate": 0.92
    }
  ]
}
```

---

## Knowledge Storage Architecture

### Recommended Structure

```
ghl-agent-knowledge/
├── tasks/
│   ├── workflow_creation.json
│   ├── contact_management.json
│   ├── funnel_building.json
│   └── ...
├── selectors/
│   ├── workflow_builder.json
│   ├── contact_page.json
│   └── ...
├── screenshots/
│   ├── workflow_builder_initial.png
│   ├── workflow_builder_with_steps.png
│   └── ...
├── error_patterns/
│   ├── authentication_failures.json
│   ├── element_not_found.json
│   └── ...
└── performance_metrics/
    ├── task_success_rates.json
    └── execution_times.json
```

---

## Continuous Learning System

### Feedback Loop

```
1. Execute Task
   ↓
2. Record Outcome (success/failure)
   ↓
3. Update Success Rates in Cache
   ↓
4. If Failure: Store Error Pattern
   ↓
5. If Success: Reinforce Selector/Sequence
   ↓
6. Periodically Prune Low-Success Patterns
   ↓
7. Optimize High-Success Patterns
```

---

## Training Documentation Templates

Based on industry research, here are the essential training documents needed:

### 1. Task Definition Document

**Purpose**: Define what the agent should accomplish

**Template**:
```markdown
# Task: [Task Name]

## Objective
[What should the agent accomplish?]

## Prerequisites
- User must be logged into GHL
- Sub-account must have [specific permissions]
- [Any other requirements]

## Input Parameters
- `workflow_name`: String (required)
- `trigger_type`: Enum ["form_submission", "tag_added", "appointment_booked"]
- `steps`: Array of workflow steps

## Expected Outcome
- Workflow created and activated
- Workflow ID returned
- Confirmation message displayed

## Success Criteria
- Workflow appears in workflow list
- Workflow status is "Active"
- All steps configured correctly

## Edge Cases
- Duplicate workflow name
- Invalid trigger type
- Missing required fields
```

---

### 2. Element Mapping Document

**Purpose**: Map UI elements to selectors

**Template**:
```markdown
# Page: Workflow Builder

## URL Pattern
`https://app.gohighlevel.com/v2/location/*/workflows`

## Key Elements

### Create Workflow Button
- **Primary Selector**: `button[data-testid='create-workflow']`
- **Fallback Selectors**: 
  - `button:has-text('Create Workflow')`
  - `//button[contains(text(), 'Create')]`
- **Visual Description**: Blue button in top-right corner
- **Screenshot**: ![Create Button](screenshots/create_button.png)

### Workflow Name Input
- **Primary Selector**: `input[name='workflow-name']`
- **Fallback Selectors**: 
  - `input[placeholder='Enter workflow name']`
- **Visual Description**: Text input at top of modal
- **Screenshot**: ![Name Input](screenshots/workflow_name_input.png)
```

---

### 3. Action Sequence Document

**Purpose**: Define step-by-step automation sequences

**Template**:
```markdown
# Action Sequence: Create Email Workflow

## Overview
Creates a basic email workflow with form submission trigger and email action.

## Steps

### Step 1: Navigate to Workflows
```typescript
await page.goto('https://app.gohighlevel.com/v2/location/{locationId}/workflows');
```

### Step 2: Click Create Button
```typescript
await stagehand.act("click the Create Workflow button");
```

### Step 3: Enter Workflow Name
```typescript
await stagehand.act("type %workflow_name% into the workflow name field", {
  variables: { workflow_name: "Welcome Email Sequence" }
});
```

### Step 4: Select Trigger
```typescript
await stagehand.act("select Form Submission from the trigger dropdown");
```

### Step 5: Add Email Action
```typescript
await stagehand.act("click the Add Action button");
await stagehand.act("select Send Email from the action menu");
```

### Step 6: Configure Email
```typescript
await stagehand.act("select Welcome Email template");
```

### Step 7: Activate Workflow
```typescript
await stagehand.act("click the Activate button");
```

## Validation
```typescript
const isActive = await stagehand.extract("check if workflow status is Active");
assert(isActive === true);
```
```

---

### 4. Error Handling Document

**Purpose**: Define how to handle common errors

**Template**:
```markdown
# Error Handling: Workflow Creation

## Error: Element Not Found

**Symptoms**: Cannot find "Create Workflow" button

**Possible Causes**:
- Page not fully loaded
- User lacks permissions
- GHL UI updated

**Recovery Steps**:
1. Wait 2 seconds and retry
2. Refresh page and retry
3. Try fallback selector
4. If all fail, mark task as failed and alert admin

**Code**:
```typescript
try {
  await stagehand.act("click the Create Workflow button");
} catch (error) {
  if (error.message.includes("element not found")) {
    await page.waitForTimeout(2000);
    await stagehand.act("click the Create Workflow button");
  }
}
```

## Error: Authentication Expired

**Symptoms**: Redirected to login page

**Recovery Steps**:
1. Detect redirect to login URL
2. Trigger re-authentication flow
3. Retry original task

**Code**:
```typescript
if (page.url().includes('/login')) {
  await authenticateGHLAccount(userAccountId, true);
  await retryTask(taskId);
}
```
```

---

## Summary

Based on industry research, successful browser agent training requires:

1. **Structured Knowledge Storage**: JSON-based caches for selectors, sequences, and error patterns
2. **Visual + Structural Data**: Combine screenshots with DOM analysis
3. **Continuous Learning**: Update success rates and prune ineffective patterns
4. **Comprehensive Documentation**: Task definitions, element mappings, action sequences, error handling
5. **Self-Correction Mechanisms**: MCTS, self-critique, and reinforcement learning

The training documents needed are:
- Task Definition Documents (what to accomplish)
- Element Mapping Documents (how to find UI elements)
- Action Sequence Documents (step-by-step instructions)
- Error Handling Documents (recovery strategies)

These documents feed into the Stagehand cache system, enabling continuous improvement over time.
