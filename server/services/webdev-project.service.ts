/**
 * Webdev Project Service
 * Manages webdev projects created by the agent
 * Handles project CRUD, file operations, scaffolding, and versioning
 */

import { getDb } from "../db";
import { generatedProjects } from "../../drizzle/schema-agent";
import { eq, and, desc } from "drizzle-orm";
import * as path from "path";

export interface ProjectFile {
  path: string;
  content: string;
  isDirectory?: boolean;
}

export interface CreateProjectInput {
  userId: number;
  name: string;
  description?: string;
  techStack: 'react' | 'vue' | 'static' | 'nextjs';
  features?: {
    server?: boolean;
    database?: boolean;
    auth?: boolean;
    stripe?: boolean;
  };
  executionId?: number;
}

export interface WebdevProject {
  id: number;
  userId: number;
  executionId?: number;
  name: string;
  description?: string;
  techStack: string;
  features: Record<string, boolean>;
  filesSnapshot: ProjectFile[];
  status: string;
  devServerPort?: number;
  previewUrl?: string;
  deploymentUrl?: string;
  createdAt: Date;
}

export interface ProjectCheckpoint {
  version: number;
  description: string;
  filesSnapshot: ProjectFile[];
  createdAt: Date;
}

class WebdevProjectService {
  // ========================================
  // PROJECT CRUD
  // ========================================

  /**
   * Create a new webdev project
   */
  async createProject(input: CreateProjectInput): Promise<WebdevProject> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const features = input.features || {};

    const result = await db.insert(generatedProjects).values({
      userId: input.userId,
      executionId: input.executionId,
      name: input.name,
      description: input.description,
      techStack: input.techStack,
      features: features as any,
      filesSnapshot: [] as any,
      status: "active",
      createdAt: new Date(),
    }).returning();

    if (result.length === 0) {
      throw new Error("Failed to create project");
    }

    return this.mapDbProjectToWebdevProject(result[0]);
  }

  /**
   * Get a project by ID (with user validation)
   */
  async getProject(projectId: number, userId: number): Promise<WebdevProject> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const result = await db
      .select()
      .from(generatedProjects)
      .where(
        and(
          eq(generatedProjects.id, projectId),
          eq(generatedProjects.userId, userId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      throw new Error(`Project ${projectId} not found or access denied`);
    }

    return this.mapDbProjectToWebdevProject(result[0]);
  }

  /**
   * List all projects for a user
   */
  async listProjects(userId: number): Promise<WebdevProject[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const results = await db
      .select()
      .from(generatedProjects)
      .where(eq(generatedProjects.userId, userId))
      .orderBy(desc(generatedProjects.createdAt));

    return results.map(this.mapDbProjectToWebdevProject);
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: number,
    userId: number,
    updates: Partial<WebdevProject>
  ): Promise<WebdevProject> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Verify project ownership
    await this.getProject(projectId, userId);

    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.techStack !== undefined) updateData.techStack = updates.techStack;
    if (updates.features !== undefined) updateData.features = updates.features;
    if (updates.filesSnapshot !== undefined) updateData.filesSnapshot = updates.filesSnapshot;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.devServerPort !== undefined) updateData.devServerPort = updates.devServerPort;
    if (updates.previewUrl !== undefined) updateData.previewUrl = updates.previewUrl;
    if (updates.deploymentUrl !== undefined) updateData.deploymentUrl = updates.deploymentUrl;

    const result = await db
      .update(generatedProjects)
      .set(updateData)
      .where(eq(generatedProjects.id, projectId))
      .returning();

    if (result.length === 0) {
      throw new Error("Failed to update project");
    }

    return this.mapDbProjectToWebdevProject(result[0]);
  }

  /**
   * Delete a project (soft delete by setting status)
   */
  async deleteProject(projectId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Verify project ownership
    await this.getProject(projectId, userId);

    await db
      .update(generatedProjects)
      .set({ status: "deleted" })
      .where(eq(generatedProjects.id, projectId));
  }

  // ========================================
  // FILE OPERATIONS
  // ========================================

  /**
   * Get all files for a project
   */
  async getFiles(projectId: number, userId: number): Promise<ProjectFile[]> {
    const project = await this.getProject(projectId, userId);
    return project.filesSnapshot;
  }

  /**
   * Read a specific file from the project
   */
  async readFile(projectId: number, userId: number, filePath: string): Promise<string> {
    this.validateFilePath(filePath);

    const files = await this.getFiles(projectId, userId);
    const file = files.find(f => f.path === filePath);

    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (file.isDirectory) {
      throw new Error(`Cannot read directory as file: ${filePath}`);
    }

    return file.content;
  }

  /**
   * Write or update a file in the project
   */
  async writeFile(
    projectId: number,
    userId: number,
    filePath: string,
    content: string
  ): Promise<void> {
    this.validateFilePath(filePath);

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);
    const files = [...project.filesSnapshot];

    // Find existing file
    const existingIndex = files.findIndex(f => f.path === filePath);

    if (existingIndex >= 0) {
      // Update existing file
      files[existingIndex] = {
        path: filePath,
        content,
        isDirectory: false,
      };
    } else {
      // Add new file
      files.push({
        path: filePath,
        content,
        isDirectory: false,
      });

      // Ensure parent directories exist
      const dirPath = path.dirname(filePath);
      if (dirPath !== '.' && dirPath !== '/') {
        this.ensureDirectoriesExist(files, dirPath);
      }
    }

    // Sort files for consistency
    files.sort((a, b) => a.path.localeCompare(b.path));

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: files as any })
      .where(eq(generatedProjects.id, projectId));
  }

  /**
   * Delete a file from the project
   */
  async deleteFile(projectId: number, userId: number, filePath: string): Promise<void> {
    this.validateFilePath(filePath);

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);
    const files = project.filesSnapshot.filter(f => {
      // Remove the file and any files within it if it's a directory
      return !f.path.startsWith(filePath);
    });

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: files as any })
      .where(eq(generatedProjects.id, projectId));
  }

  /**
   * Create a directory in the project
   */
  async createDirectory(projectId: number, userId: number, dirPath: string): Promise<void> {
    this.validateFilePath(dirPath);

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);
    const files = [...project.filesSnapshot];

    // Check if directory already exists
    const existing = files.find(f => f.path === dirPath && f.isDirectory);
    if (existing) {
      return; // Directory already exists
    }

    this.ensureDirectoriesExist(files, dirPath);

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: files as any })
      .where(eq(generatedProjects.id, projectId));
  }

  // ========================================
  // SCAFFOLDING
  // ========================================

  /**
   * Scaffold a project based on tech stack
   */
  async scaffoldProject(projectId: number, userId: number): Promise<void> {
    const project = await this.getProject(projectId, userId);

    let files: ProjectFile[];

    switch (project.techStack) {
      case 'react':
        files = this.scaffoldReactProject(project);
        break;
      case 'vue':
        files = this.scaffoldVueProject(project);
        break;
      case 'nextjs':
        files = this.scaffoldNextJsProject(project);
        break;
      case 'static':
        files = this.scaffoldStaticProject(project);
        break;
      default:
        throw new Error(`Unknown tech stack: ${project.techStack}`);
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: files as any })
      .where(eq(generatedProjects.id, projectId));
  }

  /**
   * Apply a template to the project
   */
  async applyTemplate(projectId: number, userId: number, templateName: string): Promise<void> {
    const templates: Record<string, () => ProjectFile[]> = {
      'auth-page': () => this.generateAuthTemplate(),
      'dashboard': () => this.generateDashboardTemplate(),
      'landing-page': () => this.generateLandingPageTemplate(),
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);
    const existingFiles = project.filesSnapshot;
    const templateFiles = templateFn();

    // Merge template files with existing files
    const fileMap = new Map<string, ProjectFile>();

    existingFiles.forEach(f => fileMap.set(f.path, f));
    templateFiles.forEach(f => fileMap.set(f.path, f));

    const files = Array.from(fileMap.values()).sort((a, b) => a.path.localeCompare(b.path));

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: files as any })
      .where(eq(generatedProjects.id, projectId));
  }

  // ========================================
  // CHECKPOINTS/VERSIONS
  // ========================================

  /**
   * Create a checkpoint (version) of the current project state
   */
  async createCheckpoint(
    projectId: number,
    userId: number,
    description?: string
  ): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);

    // Get current features and add checkpoints array if not exists
    const features = project.features as any;
    if (!features.checkpoints) {
      features.checkpoints = [];
    }

    const version = features.checkpoints.length + 1;

    const checkpoint: ProjectCheckpoint = {
      version,
      description: description || `Version ${version}`,
      filesSnapshot: project.filesSnapshot,
      createdAt: new Date(),
    };

    features.checkpoints.push(checkpoint);

    await db
      .update(generatedProjects)
      .set({ features: features })
      .where(eq(generatedProjects.id, projectId));

    return version;
  }

  /**
   * List all checkpoints for a project
   */
  async listCheckpoints(
    projectId: number,
    userId: number
  ): Promise<{ version: number; description: string; createdAt: Date }[]> {
    const project = await this.getProject(projectId, userId);
    const features = project.features as any;

    if (!features.checkpoints || !Array.isArray(features.checkpoints)) {
      return [];
    }

    return features.checkpoints.map((cp: ProjectCheckpoint) => ({
      version: cp.version,
      description: cp.description,
      createdAt: cp.createdAt,
    }));
  }

  /**
   * Restore a project to a previous checkpoint
   */
  async restoreCheckpoint(projectId: number, userId: number, version: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const project = await this.getProject(projectId, userId);
    const features = project.features as any;

    if (!features.checkpoints || !Array.isArray(features.checkpoints)) {
      throw new Error("No checkpoints found");
    }

    const checkpoint = features.checkpoints.find((cp: ProjectCheckpoint) => cp.version === version);

    if (!checkpoint) {
      throw new Error(`Checkpoint version ${version} not found`);
    }

    await db
      .update(generatedProjects)
      .set({ filesSnapshot: checkpoint.filesSnapshot as any })
      .where(eq(generatedProjects.id, projectId));
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Map database project to WebdevProject interface
   */
  private mapDbProjectToWebdevProject(dbProject: any): WebdevProject {
    return {
      id: dbProject.id,
      userId: dbProject.userId,
      executionId: dbProject.executionId || undefined,
      name: dbProject.name,
      description: dbProject.description || undefined,
      techStack: dbProject.techStack,
      features: (dbProject.features as Record<string, boolean>) || {},
      filesSnapshot: (dbProject.filesSnapshot as ProjectFile[]) || [],
      status: dbProject.status,
      devServerPort: dbProject.devServerPort || undefined,
      previewUrl: dbProject.previewUrl || undefined,
      deploymentUrl: dbProject.deploymentUrl || undefined,
      createdAt: dbProject.createdAt,
    };
  }

  /**
   * Validate file path to prevent directory traversal
   */
  private validateFilePath(filePath: string): void {
    if (!filePath || filePath.trim() === '') {
      throw new Error("File path cannot be empty");
    }

    // Prevent directory traversal
    if (filePath.includes('..')) {
      throw new Error("File path cannot contain '..'");
    }

    // Prevent absolute paths
    if (path.isAbsolute(filePath)) {
      throw new Error("File path must be relative");
    }
  }

  /**
   * Ensure all parent directories exist in the file list
   */
  private ensureDirectoriesExist(files: ProjectFile[], dirPath: string): void {
    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '';

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const exists = files.find(f => f.path === currentPath && f.isDirectory);
      if (!exists) {
        files.push({
          path: currentPath,
          content: '',
          isDirectory: true,
        });
      }
    }
  }

  // ========================================
  // SCAFFOLDING TEMPLATES
  // ========================================

  private scaffoldReactProject(project: WebdevProject): ProjectFile[] {
    const files: ProjectFile[] = [];

    // package.json
    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: project.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview',
          lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          ...(project.features.server ? { express: '^4.18.2' } : {}),
          ...(project.features.auth ? { '@auth/core': '^0.18.0' } : {}),
          ...(project.features.stripe ? { stripe: '^14.0.0', '@stripe/stripe-js': '^2.0.0' } : {}),
        },
        devDependencies: {
          '@types/react': '^18.2.43',
          '@types/react-dom': '^18.2.17',
          '@typescript-eslint/eslint-plugin': '^6.14.0',
          '@typescript-eslint/parser': '^6.14.0',
          '@vitejs/plugin-react': '^4.2.1',
          eslint: '^8.55.0',
          'eslint-plugin-react-hooks': '^4.6.0',
          'eslint-plugin-react-refresh': '^0.4.5',
          typescript: '^5.2.2',
          vite: '^5.0.8'
        }
      }, null, 2),
    });

    // tsconfig.json
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }]
      }, null, 2),
    });

    // vite.config.ts
    files.push({
      path: 'vite.config.ts',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
`,
    });

    // index.html
    files.push({
      path: 'index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    });

    // src/main.tsx
    files.push({
      path: 'src/main.tsx',
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
    });

    // src/App.tsx
    files.push({
      path: 'src/App.tsx',
      content: `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>${project.name}</h1>
      <p>${project.description || 'Welcome to your new React app!'}</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  )
}

export default App
`,
    });

    // src/App.css
    files.push({
      path: 'src/App.css',
      content: `.App {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
`,
    });

    // src/index.css
    files.push({
      path: 'src/index.css',
      content: `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}
`,
    });

    // .gitignore
    files.push({
      path: '.gitignore',
      content: `# Logs
logs
*.log
npm-debug.log*

# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage

# Production
dist
build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Editor
.vscode/
.idea/
`,
    });

    // README.md
    files.push({
      path: 'README.md',
      content: `# ${project.name}

${project.description || 'A React application'}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Tech Stack

- React 18
- TypeScript
- Vite
${project.features.server ? '- Express.js' : ''}
${project.features.auth ? '- Authentication' : ''}
${project.features.stripe ? '- Stripe' : ''}
`,
    });

    return files;
  }

  private scaffoldVueProject(project: WebdevProject): ProjectFile[] {
    const files: ProjectFile[] = [];

    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: project.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vue-tsc && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          vue: '^3.3.11'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^5.0.0',
          typescript: '^5.2.2',
          'vue-tsc': '^1.8.25',
          vite: '^5.0.8'
        }
      }, null, 2),
    });

    files.push({
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    });

    files.push({
      path: 'src/main.ts',
      content: `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
`,
    });

    files.push({
      path: 'src/App.vue',
      content: `<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>${project.name}</h1>
    <p>${project.description || 'Welcome to your new Vue app!'}</p>
    <button @click="count++">Count is: {{ count }}</button>
  </div>
</template>

<style scoped>
.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
</style>
`,
    });

    return files;
  }

  private scaffoldNextJsProject(project: WebdevProject): ProjectFile[] {
    const files: ProjectFile[] = [];

    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: project.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        },
        dependencies: {
          next: '^14.0.4',
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          typescript: '^5'
        }
      }, null, 2),
    });

    files.push({
      path: 'app/page.tsx',
      content: `export default function Home() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>${project.name}</h1>
      <p>${project.description || 'Welcome to your new Next.js app!'}</p>
    </main>
  )
}
`,
    });

    files.push({
      path: 'app/layout.tsx',
      content: `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,
    });

    return files;
  }

  private scaffoldStaticProject(project: WebdevProject): ProjectFile[] {
    const files: ProjectFile[] = [];

    files.push({
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>${project.name}</h1>
        <p>${project.description || 'Welcome to your new website!'}</p>
    </div>
    <script src="script.js"></script>
</body>
</html>
`,
    });

    files.push({
      path: 'styles.css',
      content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f4f4f4;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}

h1 {
    margin-bottom: 1rem;
    color: #2c3e50;
}
`,
    });

    files.push({
      path: 'script.js',
      content: `console.log('${project.name} loaded');

// Add your JavaScript here
`,
    });

    return files;
  }

  // ========================================
  // TEMPLATE GENERATORS
  // ========================================

  private generateAuthTemplate(): ProjectFile[] {
    return [
      {
        path: 'src/components/LoginForm.tsx',
        content: `import { useState } from 'react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login:', { email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
    </form>
  )
}
`,
      },
    ];
  }

  private generateDashboardTemplate(): ProjectFile[] {
    return [
      {
        path: 'src/components/Dashboard.tsx',
        content: `export function Dashboard() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>Dashboard</h2>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#analytics">Analytics</a>
          <a href="#settings">Settings</a>
        </nav>
      </aside>
      <main className="main-content">
        <h1>Welcome to Dashboard</h1>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-value">1,234</p>
          </div>
          <div className="stat-card">
            <h3>Revenue</h3>
            <p className="stat-value">$12,345</p>
          </div>
          <div className="stat-card">
            <h3>Active Projects</h3>
            <p className="stat-value">42</p>
          </div>
        </div>
      </main>
    </div>
  )
}
`,
      },
    ];
  }

  private generateLandingPageTemplate(): ProjectFile[] {
    return [
      {
        path: 'src/components/LandingPage.tsx',
        content: `export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="hero">
        <h1>Welcome to Our Product</h1>
        <p>The best solution for your needs</p>
        <button className="cta-button">Get Started</button>
      </header>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-grid">
          <div className="feature">
            <h3>Fast</h3>
            <p>Lightning fast performance</p>
          </div>
          <div className="feature">
            <h3>Secure</h3>
            <p>Bank-level security</p>
          </div>
          <div className="feature">
            <h3>Scalable</h3>
            <p>Grows with your business</p>
          </div>
        </div>
      </section>

      <footer>
        <p>&copy; 2024 Your Company. All rights reserved.</p>
      </footer>
    </div>
  )
}
`,
      },
    ];
  }
}

export const webdevProjectService = new WebdevProjectService();
