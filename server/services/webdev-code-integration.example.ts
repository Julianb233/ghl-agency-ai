/**
 * Integration Example: Webdev Project Service + Code Generator
 *
 * This example shows how to integrate the code generator service
 * with your existing webdev-project.service.ts for automated
 * project scaffolding and component generation.
 */

import { codeGeneratorService } from './code-generator.service';
import type { ProjectContext, GeneratedCode } from './code-generator.service';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enhanced project creation with AI code generation
 */
export async function createProjectWithAI(config: {
  name: string;
  description: string;
  techStack: string;
  features: string[];
  outputPath: string;
}) {
  console.log(`Creating AI-powered project: ${config.name}`);

  // Step 1: Generate full project structure
  const projectPrompt = `
Create a ${config.description} with the following features:
${config.features.map(f => `- ${f}`).join('\n')}

Requirements:
- Clean, production-ready code
- TypeScript strict mode
- Tailwind CSS for styling
- Responsive design
- Error handling and loading states
- Accessibility best practices
- Well-documented code
`;

  const projectResult = await codeGeneratorService.generateFullProject(
    projectPrompt,
    config.techStack
  );

  // Step 2: Write files to disk
  const projectPath = path.join(config.outputPath, config.name);

  for (const file of projectResult.files) {
    const filePath = path.join(projectPath, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`Created: ${file.path}`);
  }

  // Step 3: Create package.json if not generated
  const hasPackageJson = projectResult.files.some(f => f.path.includes('package.json'));
  if (!hasPackageJson && projectResult.dependencies?.length) {
    const packageJson = {
      name: config.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        test: 'vitest'
      },
      dependencies: Object.fromEntries(
        projectResult.dependencies.map(dep => [dep, 'latest'])
      )
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
  }

  // Step 4: Generate README
  const readmeContent = `# ${config.name}

${config.description}

## Features

${config.features.map(f => `- ${f}`).join('\n')}

## Tech Stack

${config.techStack}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Generated Files

${projectResult.files.map(f => `- ${f.path}`).join('\n')}

## AI Generation Info

${projectResult.explanation}

---

Generated with GHL Agency AI Code Generator
`;

  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    readmeContent,
    'utf-8'
  );

  return {
    path: projectPath,
    filesCreated: projectResult.files.length,
    dependencies: projectResult.dependencies,
    explanation: projectResult.explanation
  };
}

/**
 * Add a new page to an existing project
 */
export async function addPageToProject(config: {
  projectPath: string;
  pageName: string;
  description: string;
  techStack: string;
}) {
  console.log(`Adding page: ${config.pageName}`);

  // Load existing project files for context
  const existingFiles = await loadProjectFiles(config.projectPath);

  const context: ProjectContext = {
    projectId: 1,
    techStack: config.techStack,
    existingFiles,
  };

  const result = await codeGeneratorService.generatePage(
    config.description,
    context
  );

  // Write new files
  for (const file of result.files) {
    const filePath = path.join(config.projectPath, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`${file.action}: ${file.path}`);
  }

  return result;
}

/**
 * Add a component to an existing project
 */
export async function addComponentToProject(config: {
  projectPath: string;
  componentName: string;
  description: string;
  techStack: string;
}) {
  console.log(`Adding component: ${config.componentName}`);

  const existingFiles = await loadProjectFiles(config.projectPath);

  const context: ProjectContext = {
    projectId: 1,
    techStack: config.techStack,
    existingFiles,
  };

  const result = await codeGeneratorService.generateComponent(
    config.description,
    context
  );

  // Write component file(s)
  for (const file of result.files) {
    const filePath = path.join(config.projectPath, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`Created: ${file.path}`);
  }

  return result;
}

/**
 * Refactor/enhance an existing file
 */
export async function enhanceProjectFile(config: {
  projectPath: string;
  filePath: string;
  instruction: string;
  techStack: string;
}) {
  console.log(`Enhancing: ${config.filePath}`);

  const existingFiles = await loadProjectFiles(config.projectPath);

  const context: ProjectContext = {
    projectId: 1,
    techStack: config.techStack,
    existingFiles,
  };

  const result = await codeGeneratorService.modifyFile(
    config.filePath,
    config.instruction,
    context
  );

  // Update the file
  const fullPath = path.join(config.projectPath, config.filePath);
  await fs.writeFile(fullPath, result.files[0].content, 'utf-8');
  console.log(`Updated: ${config.filePath}`);

  return result;
}

/**
 * Generate a complete feature (multiple related components and pages)
 */
export async function generateFeature(config: {
  projectPath: string;
  featureName: string;
  description: string;
  techStack: string;
}) {
  console.log(`Generating feature: ${config.featureName}`);

  const existingFiles = await loadProjectFiles(config.projectPath);

  const context: ProjectContext = {
    projectId: 1,
    techStack: config.techStack,
    existingFiles,
  };

  const prompt = `
Create a complete ${config.featureName} feature with:

${config.description}

Include:
- Main page component
- Related UI components
- API integration hooks
- TypeScript types/interfaces
- Error handling
- Loading states
- Responsive design
`;

  const result = await codeGeneratorService.generatePage(prompt, context);

  // Organize files by feature
  const featurePath = path.join(config.projectPath, 'src', 'features', config.featureName);

  for (const file of result.files) {
    const filePath = path.join(featurePath, path.basename(file.path));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content, 'utf-8');
    console.log(`Created: ${path.relative(config.projectPath, filePath)}`);
  }

  return result;
}

/**
 * Analyze project and generate improvement suggestions
 */
export async function analyzeAndImproveProject(config: {
  projectPath: string;
  techStack: string;
  autoApply?: boolean;
}) {
  console.log('Analyzing project...');

  const existingFiles = await loadProjectFiles(config.projectPath);

  const context: ProjectContext = {
    projectId: 1,
    techStack: config.techStack,
    existingFiles,
  };

  const analysis = await codeGeneratorService.analyzeProject(context);

  console.log('\nProject Analysis:');
  console.log('----------------');
  console.log(analysis.summary);
  console.log('\nComponents:', analysis.components.join(', '));
  console.log('\nDependencies:', analysis.dependencies.join(', '));
  console.log('\nSuggestions:');
  analysis.suggestions.forEach((s, i) => console.log(`${i + 1}. ${s}`));

  if (config.autoApply) {
    console.log('\nApplying suggestions...');
    // You could implement auto-applying suggestions here
  }

  return analysis;
}

/**
 * Generate a design system/component library
 */
export async function generateComponentLibrary(config: {
  projectPath: string;
  components: string[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
}) {
  console.log('Generating component library...');

  const context: ProjectContext = {
    projectId: 1,
    techStack: 'React 19 + TypeScript + Tailwind CSS',
    existingFiles: [],
    features: {
      theme: true,
      darkMode: true,
    },
  };

  const results: GeneratedCode[] = [];

  // Generate each component
  for (const componentName of config.components) {
    const prompt = `
Create a ${componentName} component for a design system with:
- Consistent styling using Tailwind CSS
- Primary color: ${config.theme.primaryColor}
- Secondary color: ${config.theme.secondaryColor}
- Font family: ${config.theme.fontFamily}
- Multiple variants/sizes
- Dark mode support
- Accessibility features
- TypeScript types
- Usage examples in comments
`;

    const result = await codeGeneratorService.generateComponent(prompt, context);

    // Write to components library
    const libPath = path.join(config.projectPath, 'src', 'components', 'ui');
    for (const file of result.files) {
      const filePath = path.join(libPath, path.basename(file.path));
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
      console.log(`Created: ${componentName}`);
    }

    results.push(result);

    // Add to context for next components
    context.existingFiles.push(...result.files.map(f => ({
      path: f.path,
      content: f.content
    })));
  }

  // Generate index file for exports
  const indexContent = results
    .flatMap(r => r.files)
    .map(f => {
      const componentName = path.basename(f.path, '.tsx');
      return `export { ${componentName} } from './${componentName}';`;
    })
    .join('\n');

  await fs.writeFile(
    path.join(config.projectPath, 'src', 'components', 'ui', 'index.ts'),
    indexContent,
    'utf-8'
  );

  return results;
}

/**
 * Helper: Load project files for context
 */
async function loadProjectFiles(projectPath: string): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, dist, build, etc.
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.match(/\.(tsx?|jsx?|css)$/)) {
        const content = await fs.readFile(fullPath, 'utf-8');
        const relativePath = path.relative(projectPath, fullPath);
        files.push({ path: relativePath, content });
      }
    }
  }

  try {
    await walk(projectPath);
  } catch (error) {
    console.warn('Could not load project files:', error);
  }

  return files;
}

/**
 * EXAMPLE USAGE
 */

// Example 1: Create a complete e-commerce project
async function exampleCreateEcommerceProject() {
  await createProjectWithAI({
    name: 'my-ecommerce-store',
    description: 'Modern e-commerce platform',
    techStack: 'React 19 + TypeScript + Tailwind CSS + Vite',
    features: [
      'Product catalog with categories',
      'Shopping cart with persistence',
      'Checkout flow with payment',
      'User authentication',
      'Order history',
      'Admin dashboard',
    ],
    outputPath: '/tmp/projects',
  });
}

// Example 2: Add a blog feature to existing project
async function exampleAddBlogFeature() {
  await generateFeature({
    projectPath: '/tmp/projects/my-app',
    featureName: 'blog',
    description: `
      - Blog post list with pagination
      - Individual post view with comments
      - Post editor with markdown support
      - Category filtering
      - Search functionality
    `,
    techStack: 'React 19 + TypeScript + Tailwind CSS',
  });
}

// Example 3: Generate UI component library
async function exampleCreateDesignSystem() {
  await generateComponentLibrary({
    projectPath: '/tmp/projects/my-app',
    components: [
      'Button',
      'Input',
      'Card',
      'Modal',
      'Dropdown',
      'Tabs',
      'Alert',
      'Badge',
      'Avatar',
      'Spinner',
    ],
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#8B5CF6',
      fontFamily: 'Inter, sans-serif',
    },
  });
}

// Example 4: Enhance existing component
async function exampleEnhanceComponent() {
  await enhanceProjectFile({
    projectPath: '/tmp/projects/my-app',
    filePath: 'src/components/Button.tsx',
    instruction: `
      Add the following enhancements:
      - Loading state with spinner
      - Icon support (left and right)
      - Tooltip on hover
      - Keyboard shortcuts (data-shortcut prop)
      - Better accessibility
    `,
    techStack: 'React 19 + TypeScript + Tailwind CSS',
  });
}

// Example 5: Analyze and improve
async function exampleAnalyzeProject() {
  await analyzeAndImproveProject({
    projectPath: '/tmp/projects/my-app',
    techStack: 'React 19 + TypeScript + Tailwind CSS',
    autoApply: false,
  });
}

// Uncomment to run examples:
// exampleCreateEcommerceProject();
// exampleAddBlogFeature();
// exampleCreateDesignSystem();
// exampleEnhanceComponent();
// exampleAnalyzeProject();
