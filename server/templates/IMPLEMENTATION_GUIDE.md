# Template System Implementation Guide

## Overview

The template system provides ready-to-use project templates for the GHL Agency AI webdev functionality. This guide explains how to integrate and use the templates in your application.

## Directory Structure

```
server/
├── templates/
│   └── webdev/
│       ├── README.md
│       ├── react-ts/          (13 files)
│       ├── nextjs/            (11 files)
│       └── static/            (3 files)
└── services/
    ├── template-loader.service.ts
    └── template-loader.test.ts
```

## Template Files Created

### React + TypeScript Template (13 files)
```
react-ts/
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    └── components/
        └── Button.tsx
```

### Next.js Template (11 files)
```
nextjs/
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css
    └── components/
        └── Button.tsx
```

### Static HTML Template (3 files)
```
static/
├── index.html
├── styles.css
└── script.js
```

## Integration Steps

### 1. Import the Template Loader

```typescript
import { templateLoader } from './services/template-loader.service';
```

### 2. Use in Your Webdev Service

Add to your existing webdev service or create a new project creation endpoint:

```typescript
// Example integration in your webdev service
import { templateLoader } from './services/template-loader.service';
import * as path from 'path';

export class WebdevService {
  async createNewProject(
    techStack: 'react-ts' | 'nextjs' | 'static',
    projectName: string,
    port: number
  ) {
    // Define project directory
    const projectDir = path.join(
      process.cwd(),
      'projects',
      projectName
    );

    // Create project from template
    await templateLoader.createProject(
      techStack,
      projectName,
      projectDir,
      port
    );

    return {
      success: true,
      projectPath: projectDir,
      projectName,
      techStack,
      port
    };
  }

  async listTemplates() {
    return await templateLoader.getAvailableTemplates();
  }

  async getTemplateInfo(techStack: string) {
    return await templateLoader.getTemplateMetadata(techStack);
  }
}
```

### 3. API Endpoint Example

```typescript
// In your routes file
import { Router } from 'express';
import { WebdevService } from './services/webdev.service';

const router = Router();
const webdevService = new WebdevService();

// Create new project
router.post('/projects/create', async (req, res) => {
  try {
    const { techStack, projectName, port } = req.body;

    const result = await webdevService.createNewProject(
      techStack,
      projectName,
      port || 3000
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// List available templates
router.get('/templates', async (req, res) => {
  const templates = await webdevService.listTemplates();
  res.json(templates);
});

// Get template info
router.get('/templates/:techStack', async (req, res) => {
  const info = await webdevService.getTemplateInfo(req.params.techStack);
  res.json(info);
});

export default router;
```

### 4. Testing the Template Loader

Run the test file to verify everything works:

```bash
npx ts-node server/services/template-loader.test.ts
```

Expected output:
```
🧪 Testing Template Loader Service

Test 1: Getting available templates...
✅ Available templates: [ 'nextjs', 'react-ts', 'static' ]

Test 2: Getting template metadata...
✅ nextjs: { description: 'Next.js 15 + React 19 + TypeScript + Tailwind CSS', files: 11 }
✅ react-ts: { description: 'React 19 + TypeScript + Vite + Tailwind CSS', files: 13 }
✅ static: { description: 'Static HTML + CSS + JavaScript', files: 3 }

...
🎉 All tests completed!
```

## Advanced Usage

### Custom Variable Replacement

Add your own template variables:

```typescript
interface CustomVariables {
  PROJECT_NAME: string;
  PORT: number;
  AUTHOR?: string;
  DESCRIPTION?: string;
  API_URL?: string;
}

const files = await templateLoader.loadTemplateWithVariables('react-ts', {
  PROJECT_NAME: 'my-app',
  PORT: 3000,
  AUTHOR: 'John Doe',
  DESCRIPTION: 'My awesome app'
});
```

Then in your templates, use:
```json
{
  "name": "{{PROJECT_NAME}}",
  "author": "{{AUTHOR}}",
  "description": "{{DESCRIPTION}}"
}
```

### Programmatic Project Creation

```typescript
// Complete workflow example
async function setupNewProject(name: string) {
  // 1. List available templates
  const templates = await templateLoader.getAvailableTemplates();
  console.log('Available:', templates);

  // 2. Get template metadata
  const metadata = await templateLoader.getTemplateMetadata('react-ts');
  console.log('Using:', metadata.description);

  // 3. Create project
  await templateLoader.createProject(
    'react-ts',
    name,
    `/projects/${name}`,
    3000
  );

  // 4. Install dependencies (if needed)
  const { exec } = require('child_process');
  exec(`cd /projects/${name} && npm install`, (err, stdout) => {
    if (err) throw err;
    console.log('Dependencies installed');
  });
}
```

## Template Variables Reference

All templates support these variables:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `{{PROJECT_NAME}}` | string | Name of the project | `my-awesome-app` |
| `{{PORT}}` | number | Development server port | `3000` |

## Error Handling

The template loader includes error handling:

```typescript
try {
  await templateLoader.createProject('invalid-template', 'test', '/path', 3000);
} catch (error) {
  if (error.message.includes('not found')) {
    // Template doesn't exist
    console.error('Invalid template selected');
  } else {
    // Other error
    console.error('Failed to create project:', error);
  }
}
```

## Best Practices

1. **Always validate template names** before calling `loadTemplate()`
2. **Use absolute paths** for destination directories
3. **Handle errors gracefully** and provide user feedback
4. **Install dependencies** after project creation
5. **Verify port availability** before assigning to projects
6. **Clean up** failed project creations

## Next Steps

1. Integrate the template loader into your webdev service
2. Add API endpoints for project creation
3. Add frontend UI for template selection
4. Implement dependency installation automation
5. Add project management features (start, stop, delete)
6. Consider adding more templates (Vue, Svelte, etc.)

## Troubleshooting

### Template not found
```
Error: Template "xyz" not found
```
**Solution**: Check available templates with `getAvailableTemplates()`

### Permission errors
```
Error: EACCES: permission denied
```
**Solution**: Ensure write permissions for destination directory

### Variables not replaced
**Solution**: Verify variable names match exactly (case-sensitive)

## Support

For issues or questions:
1. Check the README in `/server/templates/webdev/`
2. Review the test file for usage examples
3. Examine the template files directly for reference

---

**Created**: December 2024
**Version**: 1.0.0
**Templates**: 3 (React TS, Next.js, Static HTML)
**Total Files**: 27
