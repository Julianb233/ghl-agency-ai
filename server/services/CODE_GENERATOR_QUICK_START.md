# Code Generator Service - Quick Start Guide

Get started with AI-powered code generation in under 5 minutes.

## Prerequisites

- Node.js 18+
- Anthropic API key (already configured in `.env`)
- TypeScript and React knowledge

## Quick Setup

### 1. Environment Variables

The API key is already configured in `/root/github-repos/active/ghl-agency-ai/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 2. Import the Service

```typescript
import { codeGeneratorService } from './services/code-generator.service';
```

### 3. Generate Your First Component

```typescript
const context = {
  projectId: 1,
  techStack: "React 19 + TypeScript + Tailwind CSS",
  existingFiles: []
};

const result = await codeGeneratorService.generateComponent(
  "Create a Button component with primary and secondary variants",
  context
);

console.log(result.files[0].content);
```

## 5-Minute Tutorial

### Example 1: Generate a Card Component

```typescript
import { codeGeneratorService } from './services/code-generator.service';

async function generateCard() {
  const result = await codeGeneratorService.generateComponent(
    `Create a Card component with:
    - Header with title and optional icon
    - Body content area
    - Footer with action buttons
    - Hover effect
    - Optional image`,
    {
      projectId: 1,
      techStack: "React 19 + TypeScript + Tailwind CSS",
      existingFiles: []
    }
  );

  // Access generated code
  const filePath = result.files[0].path;
  const fileContent = result.files[0].content;

  console.log(`Generated: ${filePath}`);
  console.log(result.explanation);
}

generateCard();
```

### Example 2: Generate a Login Page

```typescript
async function generateLoginPage() {
  const result = await codeGeneratorService.generatePage(
    `Create a login page with:
    - Email and password inputs
    - Remember me checkbox
    - Forgot password link
    - Login button
    - Link to registration
    - Form validation
    - Loading state`,
    {
      projectId: 1,
      techStack: "React 19 + TypeScript + Tailwind CSS + React Router",
      existingFiles: []
    }
  );

  // Multiple files generated
  result.files.forEach(file => {
    console.log(`${file.action}: ${file.path}`);
  });

  // Dependencies to install
  if (result.dependencies?.length) {
    console.log(`npm install ${result.dependencies.join(' ')}`);
  }
}

generateLoginPage();
```

### Example 3: Modify Existing Code

```typescript
async function enhanceButton() {
  const existingCode = `
export const Button = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
`;

  const result = await codeGeneratorService.modifyFile(
    "src/components/Button.tsx",
    "Add TypeScript types, Tailwind styling, and variant prop (primary/secondary)",
    {
      projectId: 1,
      techStack: "React 19 + TypeScript + Tailwind CSS",
      existingFiles: [{
        path: "src/components/Button.tsx",
        content: existingCode
      }]
    }
  );

  console.log(result.files[0].content);
}

enhanceButton();
```

## Common Use Cases

### 1. Generate UI Components

```typescript
// Button, Card, Modal, Form inputs, etc.
const result = await codeGeneratorService.generateComponent(
  "Create a Modal with overlay, title, content, and close button",
  context
);
```

### 2. Generate Complete Pages

```typescript
// Dashboard, settings, profile, etc.
const result = await codeGeneratorService.generatePage(
  "Create a user profile page with avatar, bio, and settings",
  context
);
```

### 3. Generate Full Projects

```typescript
const result = await codeGeneratorService.generateFullProject(
  "A todo app with authentication and categories",
  "React + TypeScript + Express + PostgreSQL"
);
```

### 4. Analyze Existing Code

```typescript
const analysis = await codeGeneratorService.analyzeProject({
  projectId: 1,
  techStack: "React + TypeScript",
  existingFiles: [/* your files */]
});

console.log(analysis.suggestions);
```

## API Endpoints

### REST API Usage

Start the server and use these endpoints:

```bash
# Generate Component
curl -X POST http://localhost:3000/api/code-generator/component \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a Button component",
    "techStack": "React 19 + TypeScript + Tailwind CSS"
  }'

# Generate Page
curl -X POST http://localhost:3000/api/code-generator/page \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a dashboard page",
    "techStack": "React 19 + TypeScript + Tailwind CSS"
  }'

# Modify File
curl -X POST http://localhost:3000/api/code-generator/modify \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "src/components/Button.tsx",
    "instruction": "Add size prop",
    "existingFiles": [
      {
        "path": "src/components/Button.tsx",
        "content": "..."
      }
    ]
  }'
```

### JavaScript/TypeScript Client

```typescript
// Generate component
const response = await fetch('/api/code-generator/component', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Create a Navbar component",
    techStack: "React 19 + TypeScript + Tailwind CSS"
  })
});

const { data } = await response.json();
console.log(data.files);
```

## Best Practices

### 1. Be Specific in Prompts

Bad:
```typescript
"Create a form"
```

Good:
```typescript
"Create a contact form with name, email, message fields, validation, error messages, and submit handling with loading state"
```

### 2. Provide Context

```typescript
const context = {
  projectId: 1,
  techStack: "React 19 + TypeScript + Tailwind CSS",
  existingFiles: [/* existing components */],
  features: {
    darkMode: true,
    authentication: true
  }
};
```

### 3. Iterative Refinement

```typescript
// 1. Generate initial version
const v1 = await codeGeneratorService.generateComponent("Create a Card", context);

// 2. Enhance with more features
context.existingFiles = v1.files;
const v2 = await codeGeneratorService.modifyFile(
  v1.files[0].path,
  "Add hover animation and shadow",
  context
);

// 3. Add final touches
const final = await codeGeneratorService.modifyFile(
  v2.files[0].path,
  "Add dark mode support",
  context
);
```

### 4. Validate Generated Code

```typescript
const result = await codeGeneratorService.generateComponent(prompt, context);

// Check the code
console.log(result.explanation);

// Verify dependencies
if (result.dependencies?.length) {
  console.log(`Install: ${result.dependencies.join(', ')}`);
}

// Review the files
result.files.forEach(file => {
  console.log(`${file.path}:\n${file.content.substring(0, 200)}...`);
});
```

## Common Patterns

### Pattern 1: Component Library Generation

```typescript
const components = [
  "Button with variants",
  "Input with validation",
  "Card with header/body/footer",
  "Modal with overlay",
  "Dropdown menu"
];

for (const component of components) {
  const result = await codeGeneratorService.generateComponent(
    component,
    context
  );
  // Save to files...
}
```

### Pattern 2: Page Template Generation

```typescript
const pages = {
  dashboard: "Dashboard with stats, charts, and recent activity",
  profile: "User profile with avatar, bio, and edit form",
  settings: "Settings page with tabs and forms",
  login: "Login page with email/password and OAuth"
};

for (const [name, description] of Object.entries(pages)) {
  const result = await codeGeneratorService.generatePage(
    description,
    context
  );
  // Save to files...
}
```

### Pattern 3: Progressive Enhancement

```typescript
// Start simple
let code = await codeGeneratorService.generateComponent(
  "Basic Button",
  context
);

// Add features progressively
const features = [
  "Add variant prop (primary, secondary, danger)",
  "Add size prop (sm, md, lg)",
  "Add loading state with spinner",
  "Add icon support"
];

for (const feature of features) {
  code = await codeGeneratorService.modifyFile(
    code.files[0].path,
    feature,
    { ...context, existingFiles: code.files }
  );
}
```

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY is required"

**Solution:** Check `.env` file:
```bash
cat /root/github-repos/active/ghl-agency-ai/.env | grep ANTHROPIC
```

### Issue: "Failed to parse generated code"

**Solution:** The AI returned invalid JSON. Try:
- Making the prompt more specific
- Reducing complexity
- Trying again (AI responses can vary)

### Issue: Generated code doesn't match requirements

**Solution:**
- Be more specific in your prompt
- Provide examples in the prompt
- Use iterative refinement
- Include existing files as context

### Issue: Missing dependencies

**Solution:** Check `result.dependencies` and install:
```bash
npm install ${result.dependencies.join(' ')}
```

## Next Steps

1. Read the full documentation: `CODE_GENERATOR_README.md`
2. Explore examples: `code-generator.examples.ts`
3. Run tests: `npm test code-generator.service.test.ts`
4. Check API routes: `code-generator.routes.ts`
5. Integrate with your workflow

## Support

- Documentation: `CODE_GENERATOR_README.md`
- Examples: `code-generator.examples.ts`
- Tests: `code-generator.service.test.ts`
- API Routes: `code-generator.routes.ts`

## Quick Reference

```typescript
// Generate component
codeGeneratorService.generateComponent(prompt, context)

// Generate page
codeGeneratorService.generatePage(prompt, context)

// Modify file
codeGeneratorService.modifyFile(filePath, instruction, context)

// Generate project
codeGeneratorService.generateFullProject(description, techStack)

// Analyze project
codeGeneratorService.analyzeProject(context)

// Stream generation
codeGeneratorService.generateWithStreaming(prompt, context, onChunk)
```

Happy coding! 🚀
