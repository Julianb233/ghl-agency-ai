# Browser Automation API Reference

Quick reference guide for all new browser automation features.

## StagehandService Methods

### Multi-Tab Management

#### `openTab(sessionId, url?, background?)`
```typescript
openTab(
  sessionId: string,
  url?: string,
  background?: boolean
): Promise<{ success: boolean; tabId?: string; error?: string }>
```
Opens a new tab. Returns unique `tabId` for future reference.

**Example:**
```typescript
const result = await stagehandService.openTab(sessionId, 'https://google.com', false);
console.log(result.tabId); // "tab_1234567890_1"
```

---

#### `switchTab(sessionId, tabId)`
```typescript
switchTab(
  sessionId: string,
  tabId: string
): Promise<{ success: boolean; error?: string }>
```
Switches focus to specified tab.

---

#### `closeTab(sessionId, tabId)`
```typescript
closeTab(
  sessionId: string,
  tabId: string
): Promise<{ success: boolean; error?: string }>
```
Closes specified tab. Cannot close the last tab.

---

#### `listTabs(sessionId)`
```typescript
listTabs(sessionId: string): Promise<{
  success: boolean;
  tabs?: Array<{ id: string; title: string; url: string; isActive: boolean }>;
  error?: string;
}>
```
Lists all tabs with details.

---

### File Handling

#### `uploadFile(sessionId, selector, filePath)`
```typescript
uploadFile(
  sessionId: string,
  selector: string,
  filePath: string
): Promise<{ success: boolean; filename?: string; error?: string }>
```
Uploads file to specified file input.

**Example:**
```typescript
await stagehandService.uploadFile(
  sessionId,
  'input[type="file"]',
  '/path/to/document.pdf'
);
```

---

#### `getDownloads(sessionId)`
```typescript
getDownloads(sessionId: string): Promise<{
  success: boolean;
  downloads?: Array<{ filename: string; path: string; timestamp: Date; size?: number }>;
  error?: string;
}>
```
Returns list of downloaded files.

---

### Action Verification

#### `verifyActionPreconditions(sessionId, selector, actionType)`
```typescript
verifyActionPreconditions(
  sessionId: string,
  selector: string,
  actionType: 'click' | 'type' | 'navigate'
): Promise<{
  canProceed: boolean;
  issues: string[];
  elementInfo?: {
    exists: boolean;
    visible: boolean;
    enabled: boolean;
    selector: string;
  };
}>
```
Verifies element is ready for action.

**Example:**
```typescript
const verification = await stagehandService.verifyActionPreconditions(
  sessionId,
  'button#submit',
  'click'
);

if (verification.canProceed) {
  // Safe to proceed
} else {
  console.log('Issues:', verification.issues);
  // ["Element is disabled", "Element is not visible"]
}
```

---

#### `verifyActionSuccess(sessionId, actionType, expectedChange)`
```typescript
verifyActionSuccess(
  sessionId: string,
  actionType: 'click' | 'type' | 'navigate',
  expectedChange: {
    urlPattern?: string;
    elementSelector?: string;
    elementProperty?: { selector: string; property: string; expectedValue: any };
  }
): Promise<{
  success: boolean;
  changes: string[];
  issues: string[];
}>
```
Verifies expected changes occurred after action.

**Example:**
```typescript
const result = await stagehandService.verifyActionSuccess(
  sessionId,
  'click',
  {
    urlPattern: '.*/dashboard.*',
    elementSelector: '.welcome-message'
  }
);

console.log(result.changes); // ["URL changed to: .../dashboard", "Element appeared: .welcome-message"]
```

---

### DOM Inspection

#### `inspectElement(sessionId, selector)`
```typescript
inspectElement(
  sessionId: string,
  selector: string
): Promise<{
  success: boolean;
  element?: {
    tagName: string;
    attributes: Record<string, string>;
    text: string;
    html: string;
    isVisible: boolean;
    isEnabled: boolean;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  error?: string;
}>
```
Returns detailed information about specific element.

**Example:**
```typescript
const inspection = await stagehandService.inspectElement(sessionId, 'button#submit');
console.log(inspection.element?.tagName); // "button"
console.log(inspection.element?.attributes); // { id: "submit", class: "btn primary" }
console.log(inspection.element?.isVisible); // true
console.log(inspection.element?.boundingBox); // { x: 100, y: 200, width: 120, height: 40 }
```

---

#### `getPageStructure(sessionId)`
```typescript
getPageStructure(sessionId: string): Promise<{
  success: boolean;
  structure?: {
    forms: Array<{ selector: string; action?: string; method?: string }>;
    links: Array<{ text: string; href: string; selector: string }>;
    buttons: Array<{ text: string; selector: string; type?: string }>;
    inputs: Array<{ type: string; name?: string; placeholder?: string; selector: string }>;
  };
  error?: string;
}>
```
Returns overview of all interactive elements on page.

**Example:**
```typescript
const structure = await stagehandService.getPageStructure(sessionId);
console.log(structure.structure?.forms); // [{ selector: "#login-form", action: "/api/login", method: "POST" }]
console.log(structure.structure?.buttons); // [{ selector: "#submit", text: "Submit", type: "submit" }]
console.log(structure.structure?.inputs); // [{ selector: "#email", type: "email", name: "email", placeholder: "Enter email" }]
```

---

## Agent Browser Tools

All methods above are available as agent tools with the `browser_` prefix:

| StagehandService Method | Agent Tool Name |
|------------------------|-----------------|
| `openTab` | `browser_open_tab` |
| `switchTab` | `browser_switch_tab` |
| `closeTab` | `browser_close_tab` |
| `listTabs` | `browser_list_tabs` |
| `uploadFile` | `browser_upload_file` |
| `getDownloads` | `browser_get_downloads` |
| `verifyActionPreconditions` | `browser_verify_action` |
| `verifyActionSuccess` | `browser_verify_success` |
| `inspectElement` | `browser_inspect_element` |
| `getPageStructure` | `browser_get_page_structure` |

### Agent Tool Usage Example

```typescript
// AI agent can use tools with natural language parameters
const result = await browser_open_tab({
  sessionId: 'session_123',
  url: 'https://example.com',
  background: false
});
```

---

## tRPC Endpoints

All features are exposed via tRPC for client-server communication:

### Mutations (State-changing operations)

```typescript
// Open tab
trpc.browser.openTab.mutate({
  sessionId: string;
  url?: string;
  background?: boolean;
});

// Switch tab
trpc.browser.switchTab.mutate({
  sessionId: string;
  tabId: string;
});

// Close tab
trpc.browser.closeTab.mutate({
  sessionId: string;
  tabId: string;
});

// Upload file
trpc.browser.uploadFile.mutate({
  sessionId: string;
  selector: string;
  filePath: string;
});
```

### Queries (Read-only operations)

```typescript
// List tabs
trpc.browser.listTabsInSession.query({
  sessionId: string;
});

// Get downloads
trpc.browser.getDownloads.query({
  sessionId: string;
});

// Verify action
trpc.browser.verifyAction.query({
  sessionId: string;
  selector: string;
  actionType: 'click' | 'type' | 'navigate';
});

// Verify success
trpc.browser.verifySuccess.query({
  sessionId: string;
  actionType: 'click' | 'type' | 'navigate';
  expectedChange: {
    urlPattern?: string;
    elementSelector?: string;
    elementProperty?: { selector: string; property: string; expectedValue: any };
  };
});

// Inspect element
trpc.browser.inspectElement.query({
  sessionId: string;
  selector: string;
});

// Get page structure
trpc.browser.getPageStructure.query({
  sessionId: string;
});
```

---

## Response Types

### Success Response
```typescript
{
  success: true,
  // ... relevant data
  timestamp: Date
}
```

### Error Response
```typescript
{
  success: false,
  error: string,
  timestamp: Date
}
```

---

## Common Patterns

### Pattern 1: Safe Action Execution
```typescript
// 1. Verify preconditions
const verification = await stagehandService.verifyActionPreconditions(
  sessionId,
  selector,
  'click'
);

// 2. Execute only if safe
if (verification.canProceed) {
  await stagehandService.act(sessionId, instruction);

  // 3. Verify success
  const success = await stagehandService.verifyActionSuccess(
    sessionId,
    'click',
    { urlPattern: expectedUrl }
  );
}
```

### Pattern 2: Multi-Tab Research
```typescript
// 1. Open multiple tabs in background
const tabs = await Promise.all([
  stagehandService.openTab(sessionId, 'https://source1.com', true),
  stagehandService.openTab(sessionId, 'https://source2.com', true),
  stagehandService.openTab(sessionId, 'https://source3.com', true),
]);

// 2. Process each tab
for (const tab of tabs) {
  await stagehandService.switchTab(sessionId, tab.tabId!);
  const structure = await stagehandService.getPageStructure(sessionId);
  // ... extract data
}

// 3. Close all tabs
for (const tab of tabs) {
  await stagehandService.closeTab(sessionId, tab.tabId!);
}
```

### Pattern 3: Form Submission with Validation
```typescript
// 1. Inspect page structure
const structure = await stagehandService.getPageStructure(sessionId);

// 2. Find and verify form
const form = structure.structure?.forms[0];
if (form) {
  // 3. Upload file if needed
  const fileInput = structure.structure?.inputs.find(i => i.type === 'file');
  if (fileInput) {
    await stagehandService.uploadFile(sessionId, fileInput.selector, filePath);
  }

  // 4. Verify submit button
  const submitBtn = structure.structure?.buttons.find(b => b.type === 'submit');
  if (submitBtn) {
    const verification = await stagehandService.verifyActionPreconditions(
      sessionId,
      submitBtn.selector,
      'click'
    );

    // 5. Submit if ready
    if (verification.canProceed) {
      await stagehandService.act(sessionId, 'click the submit button');

      // 6. Verify submission
      const success = await stagehandService.verifyActionSuccess(
        sessionId,
        'click',
        { elementSelector: '.success-message' }
      );
    }
  }
}
```

---

## Error Handling

All methods return structured error information:

```typescript
const result = await stagehandService.openTab(sessionId, url);

if (!result.success) {
  console.error('Error:', result.error);
  // Handle error appropriately
}
```

For tRPC, errors are thrown as `TRPCError`:

```typescript
try {
  await trpc.browser.openTab.mutate({ sessionId, url });
} catch (error) {
  if (error instanceof TRPCError) {
    console.error('Browser error:', error.message);
  }
}
```

---

## TypeScript Interfaces

All interfaces are exported from `stagehand.service.ts`:

```typescript
import type {
  TabInfo,
  ActionVerificationResult,
  ElementInspectionResult,
  PageStructureResult,
  UploadFileResult,
  DownloadInfo,
} from '@/server/services/stagehand.service';
```
