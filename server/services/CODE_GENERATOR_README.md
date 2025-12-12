# Code Generator Service

A production-ready AI-powered code generation service using Claude 3.5 Sonnet for generating React components, pages, and complete projects.

## Features

- **Component Generation**: Create reusable React components with TypeScript and Tailwind CSS
- **Page Generation**: Generate complete pages with routing, state management, and child components
- **File Modification**: Intelligently modify existing code based on natural language instructions
- **Full Project Generation**: Scaffold complete full-stack applications
- **Project Analysis**: Analyze existing codebases and provide insights and suggestions
- **Streaming Support**: Real-time code generation with streaming for large responses
- **Dependency Detection**: Automatically extract and list required npm packages

## Installation

The service is already configured with the Anthropic SDK. Ensure you have the API key set in your `.env` file:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

### Import the Service

```typescript
import { codeGeneratorService } from './services/code-generator.service';
import type { ProjectContext, GeneratedCode } from './services/code-generator.service';
```

### Generate a Component

```typescript
const context: ProjectContext = {
  projectId: 1,
  techStack: "React 19 + TypeScript + Tailwind CSS",
  existingFiles: [],
  features: {
    authentication: true,
    database: true
  }
};

const result = await codeGeneratorService.generateComponent(
  "Create a reusable Button component with primary, secondary, and danger variants. Include hover states and disabled support.",
  context
);

console.log(result.explanation);
result.files.forEach(file => {
  console.log(`${file.action}: ${file.path}`);
  // Write file.content to disk
});
```

### Generate a Complete Page

```typescript
const result = await codeGeneratorService.generatePage(
  `Create a user dashboard page with:
  - Header with user profile dropdown
  - Sidebar navigation
  - Main content area with statistics cards
  - Recent activity table
  - Responsive layout`,
  context
);

// Result includes multiple files (page, components, types, etc.)
result.files.forEach(file => {
  console.log(`Generated: ${file.path}`);
});

console.log(`Dependencies to install: ${result.dependencies?.join(', ')}`);
```

### Modify Existing Files

```typescript
const contextWithFiles: ProjectContext = {
  ...context,
  existingFiles: [
    {
      path: "src/components/Button.tsx",
      content: existingButtonCode
    }
  ]
};

const result = await codeGeneratorService.modifyFile(
  "src/components/Button.tsx",
  "Add a 'size' prop that supports 'sm', 'md', and 'lg' sizes with appropriate padding",
  contextWithFiles
);

console.log(result.explanation);
// result.files[0].action will be "update"
```

### Generate a Full Project

```typescript
const result = await codeGeneratorService.generateFullProject(
  "A task management app with user authentication, task CRUD, categories, and due dates",
  "React 19 + TypeScript + Tailwind CSS + Express + PostgreSQL"
);

// Result includes project structure, config files, components, API routes, etc.
console.log(`Generated ${result.files.length} files`);
console.log(`Dependencies: ${result.dependencies?.join(', ')}`);
```

### Analyze a Project

```typescript
const analysis = await codeGeneratorService.analyzeProject(contextWithFiles);

console.log("Project Summary:", analysis.summary);
console.log("Components Found:", analysis.components);
console.log("Dependencies:", analysis.dependencies);
console.log("Suggestions:", analysis.suggestions);
```

### Streaming Generation

```typescript
const result = await codeGeneratorService.generateWithStreaming(
  "Create a complex data visualization dashboard",
  context,
  (chunk) => {
    // Stream chunks to client in real-time
    process.stdout.write(chunk);
  }
);
```

## API Reference

### Types

#### `GeneratedCode`
```typescript
interface GeneratedCode {
  files: Array<{
    path: string;
    content: string;
    action: 'create' | 'update' | 'delete';
  }>;
  explanation: string;
  dependencies?: string[];
}
```

#### `ProjectContext`
```typescript
interface ProjectContext {
  projectId: number;
  techStack: string;
  existingFiles: Array<{ path: string; content: string }>;
  features?: Record<string, boolean>;
}
```

#### `ProjectAnalysis`
```typescript
interface ProjectAnalysis {
  summary: string;
  components: string[];
  dependencies: string[];
  suggestions: string[];
}
```

### Methods

#### `generateComponent(prompt: string, context: ProjectContext): Promise<GeneratedCode>`
Generate a single React component based on the prompt.

#### `generatePage(prompt: string, context: ProjectContext): Promise<GeneratedCode>`
Generate a complete page with all necessary components and routing.

#### `modifyFile(filePath: string, instruction: string, context: ProjectContext): Promise<GeneratedCode>`
Modify an existing file based on natural language instructions.

#### `generateFullProject(description: string, techStack: string): Promise<GeneratedCode>`
Generate a complete full-stack project structure.

#### `analyzeProject(context: ProjectContext): Promise<ProjectAnalysis>`
Analyze an existing project and provide insights.

#### `generateWithStreaming(prompt: string, context: ProjectContext, onChunk: (chunk: string) => void): Promise<GeneratedCode>`
Generate code with real-time streaming support.

## Code Generation Rules

The service follows these best practices:

1. **React 19 with Hooks**: All components use functional components and modern hooks
2. **TypeScript**: Strict type checking with proper interfaces and types
3. **Tailwind CSS**: Utility-first styling with responsive design
4. **Named Exports**: Components use named exports for better tree-shaking
5. **Error Handling**: Proper try-catch blocks and error boundaries
6. **Loading States**: Async operations include loading indicators
7. **Accessibility**: WCAG-compliant components with proper ARIA attributes
8. **Clean Code**: Well-structured, documented, and maintainable code

## Integration Examples

### Express API Endpoint

```typescript
import { Router } from 'express';
import { codeGeneratorService } from './services/code-generator.service';

const router = Router();

router.post('/api/generate/component', async (req, res) => {
  try {
    const { prompt, projectId, techStack } = req.body;

    const context = {
      projectId,
      techStack,
      existingFiles: [] // Load from database
    };

    const result = await codeGeneratorService.generateComponent(prompt, context);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### WebSocket Streaming

```typescript
import { WebSocket } from 'ws';

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (message: string) => {
    const { prompt, context } = JSON.parse(message);

    try {
      const result = await codeGeneratorService.generateWithStreaming(
        prompt,
        context,
        (chunk) => {
          ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
        }
      );

      ws.send(JSON.stringify({ type: 'complete', data: result }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });
});
```

### Integration with File System

```typescript
import fs from 'fs/promises';
import path from 'path';

async function generateAndWriteComponent(prompt: string, outputDir: string) {
  const context = {
    projectId: 1,
    techStack: "React 19 + TypeScript + Tailwind CSS",
    existingFiles: []
  };

  const result = await codeGeneratorService.generateComponent(prompt, context);

  // Write generated files to disk
  for (const file of result.files) {
    const filePath = path.join(outputDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`${file.action}: ${file.path}`);
  }

  // Install dependencies if needed
  if (result.dependencies && result.dependencies.length > 0) {
    console.log(`Install dependencies: npm install ${result.dependencies.join(' ')}`);
  }

  return result;
}
```

## Example Prompts

### Simple Components
```
"Create a Card component with header, body, and footer sections. Support optional image."
"Build a Loading spinner component with different sizes and colors."
"Create a Toast notification component with success, error, warning, and info variants."
```

### Complex Components
```
"Create a data table with sorting, filtering, pagination, row selection, and CSV export."
"Build a multi-step form wizard with progress indicator and validation."
"Create a drag-and-drop file upload component with preview and progress."
```

### Pages
```
"Create a landing page with hero section, features, pricing table, and CTA."
"Build a settings page with tabbed navigation, form sections, and save functionality."
"Create an analytics dashboard with charts, metrics cards, and date range selector."
```

### Full Projects
```
"A blog platform with authentication, post CRUD, comments, and categories."
"An e-commerce store with products, cart, checkout, and order management."
"A project management tool with boards, tasks, team collaboration, and time tracking."
```

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const result = await codeGeneratorService.generateComponent(prompt, context);
  // Success
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle authentication error
  } else if (error.message.includes('parse')) {
    // Handle JSON parsing error
  } else {
    // Handle general error
  }
}
```

## Testing

Run the test suite:

```bash
npm test code-generator.service.test.ts
```

The test suite covers:
- Component generation
- Page generation
- File modification
- Full project generation
- Project analysis
- Streaming
- Error handling
- Real-world scenarios

## Performance Considerations

- **Token Usage**: Claude 3.5 Sonnet has a max token limit of 8000 for output
- **Rate Limits**: Respect Anthropic API rate limits
- **Caching**: Consider caching similar requests
- **Streaming**: Use streaming for large responses to improve perceived performance
- **Context Size**: Limit the number of existing files in context to stay within token limits

## Best Practices

1. **Provide Context**: Include existing files and tech stack for better results
2. **Be Specific**: Detailed prompts produce better code
3. **Validate Output**: Always validate generated code before deploying
4. **Test Generated Code**: Run tests on generated components
5. **Review Dependencies**: Check generated dependencies before installing
6. **Iterative Refinement**: Use `modifyFile` to refine generated code

## Limitations

- Cannot execute or test generated code
- Limited to text-based code generation (no binary files)
- Dependent on Claude API availability and rate limits
- Generated code should be reviewed before production use
- May not capture all project-specific conventions

## Roadmap

- [ ] Support for more AI models (GPT-4, Gemini)
- [ ] Code testing integration
- [ ] Automatic dependency installation
- [ ] Git integration for version control
- [ ] Project template library
- [ ] Code review and suggestions
- [ ] Multi-language support (Vue, Angular, Svelte)

## Support

For issues or questions:
- Check the test suite for examples
- Review the error messages carefully
- Ensure ANTHROPIC_API_KEY is set correctly
- Verify project context is properly structured

## License

Part of the GHL Agency AI platform.
