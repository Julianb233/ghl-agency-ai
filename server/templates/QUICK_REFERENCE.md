# Template System Quick Reference

## Import

```typescript
import { templateLoader } from './services/template-loader.service';
```

## Common Operations

### List Templates
```typescript
const templates = await templateLoader.getAvailableTemplates();
// Returns: ['react-ts', 'nextjs', 'static']
```

### Get Template Info
```typescript
const info = await templateLoader.getTemplateMetadata('react-ts');
// Returns: { name: 'react-ts', description: '...', files: 13 }
```

### Create Project
```typescript
await templateLoader.createProject(
  'react-ts',              // Template type
  'my-project',            // Project name
  '/path/to/destination',  // Destination directory
  3000                     // Port number
);
```

### Load Template Files
```typescript
const files = await templateLoader.loadTemplate('react-ts');
// Returns: [{ path: 'package.json', content: '...' }, ...]
```

### Apply Variables
```typescript
const content = await templateLoader.applyVariables(
  'Project: {{PROJECT_NAME}}',
  { PROJECT_NAME: 'test-app', PORT: 3000 }
);
// Returns: 'Project: test-app'
```

### Load with Variables
```typescript
const files = await templateLoader.loadTemplateWithVariables(
  'nextjs',
  { PROJECT_NAME: 'my-app', PORT: 4000 }
);
```

### Write Template Files
```typescript
await templateLoader.writeTemplateFiles(
  files,
  '/destination/path'
);
```

## Available Templates

| Template | Tech Stack | Files | Description |
|----------|-----------|-------|-------------|
| `react-ts` | React 19 + TS + Vite + Tailwind | 13 | Modern React with Vite |
| `nextjs` | Next.js 15 + React 19 + TS | 11 | Full-stack React framework |
| `static` | HTML + CSS + JS | 3 | Simple static website |

## Template Variables

```typescript
interface TemplateVariables {
  PROJECT_NAME: string;  // Required: Project name
  PORT: number;          // Required: Dev server port
  [key: string]: any;    // Optional: Custom variables
}
```

## Error Handling

```typescript
try {
  await templateLoader.createProject(...);
} catch (error) {
  if (error.message.includes('not found')) {
    // Invalid template
  } else {
    // Other error
  }
}
```

## Complete Workflow Example

```typescript
// 1. List available templates
const templates = await templateLoader.getAvailableTemplates();

// 2. Get template metadata
const metadata = await templateLoader.getTemplateMetadata('react-ts');

// 3. Create project
await templateLoader.createProject(
  'react-ts',
  'my-awesome-app',
  '/projects/my-awesome-app',
  3000
);

// 4. Install dependencies (external)
import { exec } from 'child_process';
exec('cd /projects/my-awesome-app && npm install');
```

## API Endpoint Examples

### Express Router
```typescript
router.post('/projects/create', async (req, res) => {
  const { techStack, projectName, port } = req.body;
  await templateLoader.createProject(techStack, projectName, `/projects/${projectName}`, port);
  res.json({ success: true });
});

router.get('/templates', async (req, res) => {
  const templates = await templateLoader.getAvailableTemplates();
  res.json(templates);
});
```

## Testing

```bash
# Run test suite
npx ts-node server/services/template-loader.test.ts
```

## File Locations

```
server/
├── templates/webdev/
│   ├── react-ts/      (13 files)
│   ├── nextjs/        (11 files)
│   └── static/        (3 files)
└── services/
    └── template-loader.service.ts
```

## Common Patterns

### Validate Template
```typescript
const available = await templateLoader.getAvailableTemplates();
if (!available.includes(techStack)) {
  throw new Error(`Invalid template: ${techStack}`);
}
```

### Create with Custom Variables
```typescript
const files = await templateLoader.loadTemplateWithVariables('react-ts', {
  PROJECT_NAME: name,
  PORT: port,
  AUTHOR: 'John Doe',
  VERSION: '1.0.0'
});
await templateLoader.writeTemplateFiles(files, destDir);
```

### Get All Template Metadata
```typescript
const templates = await templateLoader.getAvailableTemplates();
const allMetadata = await Promise.all(
  templates.map(t => templateLoader.getTemplateMetadata(t))
);
```

---

**Pro Tips:**
- Always use absolute paths for destinations
- Verify template exists before using
- Install dependencies after project creation
- Check port availability before assignment
- Handle errors gracefully with try/catch
