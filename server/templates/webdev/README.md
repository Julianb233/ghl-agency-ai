# Web Development Templates

This directory contains project templates for the GHL Agency AI webdev system.

## Available Templates

### 1. React + TypeScript (`react-ts`)

Modern React application with TypeScript, Vite, and Tailwind CSS.

**Tech Stack:**
- React 19
- TypeScript 5.7
- Vite 6.0 (build tool)
- Tailwind CSS 3.4
- PostCSS + Autoprefixer

**Features:**
- Fast HMR with Vite
- Component-based architecture
- Type-safe development
- Utility-first CSS with Tailwind
- Example Button component

**Usage:**
```bash
npm install
npm run dev    # Start dev server
npm run build  # Build for production
```

### 2. Next.js (`nextjs`)

Full-stack React framework with server-side rendering.

**Tech Stack:**
- Next.js 15
- React 19
- TypeScript 5.7
- Tailwind CSS 3.4
- App Router

**Features:**
- Server-side rendering (SSR)
- App Router architecture
- File-based routing
- API routes support
- Image optimization
- Font optimization with next/font

**Usage:**
```bash
npm install
npm run dev    # Start dev server
npm run build  # Build for production
npm start      # Start production server
```

### 3. Static HTML (`static`)

Simple static website with HTML, CSS, and vanilla JavaScript.

**Tech Stack:**
- HTML5
- CSS3 (modern features)
- Vanilla JavaScript

**Features:**
- No build process required
- Responsive design
- CSS Grid and Flexbox
- Modern CSS custom properties
- Interactive counter example

**Usage:**
Open `index.html` in a browser or serve with any static file server.

## Template Variables

All templates support the following variables that will be replaced during project creation:

- `{{PROJECT_NAME}}` - The name of the project
- `{{PORT}}` - The development server port

## Template Loader Service

The `TemplateLoaderService` provides methods to:

1. **List templates**: `getAvailableTemplates()`
2. **Load template**: `loadTemplate(techStack)`
3. **Apply variables**: `applyVariables(content, variables)`
4. **Create project**: `createProject(techStack, projectName, destinationDir, port)`
5. **Get metadata**: `getTemplateMetadata(techStack)`

### Example Usage

```typescript
import { templateLoader } from './services/template-loader.service';

// List available templates
const templates = await templateLoader.getAvailableTemplates();
console.log(templates); // ['react-ts', 'nextjs', 'static']

// Create a new project
await templateLoader.createProject(
  'react-ts',           // Template type
  'my-awesome-app',     // Project name
  '/path/to/projects',  // Destination directory
  3000                  // Port number
);

// Get template info
const metadata = await templateLoader.getTemplateMetadata('react-ts');
console.log(metadata);
// {
//   name: 'react-ts',
//   description: 'React 19 + TypeScript + Vite + Tailwind CSS',
//   files: 12
// }
```

## Adding New Templates

To add a new template:

1. Create a new directory under `server/templates/webdev/`
2. Add all necessary project files
3. Use `{{PROJECT_NAME}}` and `{{PORT}}` variables where needed
4. Update the metadata in `template-loader.service.ts`
5. Test the template with the loader service

## Template Structure Best Practices

Each template should include:

- `package.json` (if applicable)
- Configuration files (tsconfig, vite.config, etc.)
- Source code with example components
- `.gitignore` file
- Proper directory structure
- At least one example component

## Notes

- All templates use the latest stable versions of their respective tools
- Templates are optimized for development experience
- Tailwind CSS is included in React and Next.js templates
- TypeScript is used for type safety in modern frameworks
- All templates include responsive design patterns
