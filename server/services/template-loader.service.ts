import * as fs from 'fs/promises';
import * as path from 'path';

interface TemplateFile {
  path: string;
  content: string;
}

interface TemplateVariables {
  PROJECT_NAME: string;
  PORT: number;
  [key: string]: string | number;
}

class TemplateLoaderService {
  private templatesDir = path.join(__dirname, '../templates/webdev');

  /**
   * Get list of available template types
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.templatesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      console.error('Error reading templates directory:', error);
      return [];
    }
  }

  /**
   * Load all files from a template
   */
  async loadTemplate(techStack: string): Promise<TemplateFile[]> {
    const templatePath = path.join(this.templatesDir, techStack);

    try {
      // Verify template exists
      await fs.access(templatePath);
    } catch (error) {
      throw new Error(`Template "${techStack}" not found`);
    }

    const files: TemplateFile[] = [];
    await this.readDirectoryRecursive(templatePath, templatePath, files);
    return files;
  }

  /**
   * Recursively read all files in a directory
   */
  private async readDirectoryRecursive(
    currentPath: string,
    basePath: string,
    files: TemplateFile[]
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await this.readDirectoryRecursive(fullPath, basePath, files);
      } else {
        const content = await fs.readFile(fullPath, 'utf-8');
        const relativePath = path.relative(basePath, fullPath);
        files.push({
          path: relativePath,
          content: content
        });
      }
    }
  }

  /**
   * Apply template variables to content
   */
  async applyVariables(content: string, variables: TemplateVariables): Promise<string> {
    let result = content;

    // Replace all template variables in the format {{VARIABLE_NAME}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Load template and apply variables to all files
   */
  async loadTemplateWithVariables(
    techStack: string,
    variables: TemplateVariables
  ): Promise<TemplateFile[]> {
    const templateFiles = await this.loadTemplate(techStack);

    const processedFiles = await Promise.all(
      templateFiles.map(async (file) => ({
        path: file.path,
        content: await this.applyVariables(file.content, variables)
      }))
    );

    return processedFiles;
  }

  /**
   * Write template files to a destination directory
   */
  async writeTemplateFiles(
    files: TemplateFile[],
    destinationDir: string
  ): Promise<void> {
    // Ensure destination directory exists
    await fs.mkdir(destinationDir, { recursive: true });

    for (const file of files) {
      const filePath = path.join(destinationDir, file.path);
      const fileDir = path.dirname(filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(fileDir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
  }

  /**
   * Create a new project from template
   */
  async createProject(
    techStack: string,
    projectName: string,
    destinationDir: string,
    port: number = 3000
  ): Promise<void> {
    const variables: TemplateVariables = {
      PROJECT_NAME: projectName,
      PORT: port
    };

    const files = await this.loadTemplateWithVariables(techStack, variables);
    await this.writeTemplateFiles(files, destinationDir);
  }

  /**
   * Get template metadata
   */
  async getTemplateMetadata(techStack: string): Promise<{
    name: string;
    description: string;
    files: number;
  }> {
    const files = await this.loadTemplate(techStack);

    const metadata: Record<string, { description: string }> = {
      'react-ts': {
        description: 'React 19 + TypeScript + Vite + Tailwind CSS'
      },
      'nextjs': {
        description: 'Next.js 15 + React 19 + TypeScript + Tailwind CSS'
      },
      'static': {
        description: 'Static HTML + CSS + JavaScript'
      }
    };

    return {
      name: techStack,
      description: metadata[techStack]?.description || 'Unknown template',
      files: files.length
    };
  }
}

export const templateLoader = new TemplateLoaderService();
