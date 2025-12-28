/**
 * MCP Resources Implementation
 * Provides resource listing and reading capabilities for MCP protocol
 *
 * Resources expose read-only data and content that can be accessed by clients
 * Examples: files, templates, documentation, configuration, data exports
 */

import type { MCPContext } from './types';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * MCP Resource Definition
 * Represents a single resource that can be accessed
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resource Content
 * The actual content returned when reading a resource
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string; // base64 encoded binary data
  metadata?: Record<string, unknown>;
}

/**
 * Resource Provider Interface
 * Implement this to add custom resource providers
 */
export interface ResourceProvider {
  /**
   * Get the scheme this provider handles (e.g., "file", "template", "data")
   */
  getScheme(): string;

  /**
   * List all resources this provider can serve
   */
  listResources(context?: MCPContext): Promise<MCPResource[]>;

  /**
   * Read a specific resource
   */
  readResource(uri: string, context?: MCPContext): Promise<ResourceContent>;

  /**
   * Check if a resource exists
   */
  hasResource(uri: string, context?: MCPContext): Promise<boolean>;
}

/**
 * File Resource Provider
 * Exposes files as resources with file:// scheme
 */
export class FileResourceProvider implements ResourceProvider {
  private allowedPaths: string[];
  private basePath: string;

  constructor(basePath: string, allowedPaths: string[] = []) {
    this.basePath = basePath;
    this.allowedPaths = allowedPaths.length > 0 ? allowedPaths : [basePath];
  }

  getScheme(): string {
    return 'file';
  }

  async listResources(context?: MCPContext): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    for (const allowedPath of this.allowedPaths) {
      const fullPath = join(this.basePath, allowedPath);

      try {
        const files = await this.listFilesRecursive(fullPath);

        for (const file of files) {
          const relativePath = file.replace(this.basePath, '').replace(/^\//, '');
          resources.push({
            uri: `file:///${relativePath}`,
            name: file.split('/').pop() || file,
            description: `File at ${relativePath}`,
            mimeType: this.getMimeType(file),
            metadata: {
              path: file,
              size: (await fs.stat(file)).size,
            },
          });
        }
      } catch (error) {
        console.error(`Error listing files in ${allowedPath}:`, error);
      }
    }

    return resources;
  }

  async readResource(uri: string, context?: MCPContext): Promise<ResourceContent> {
    // Extract path from file:/// URI
    const path = uri.replace(/^file:\/\/\//, '');
    const fullPath = join(this.basePath, path);

    // Security: Verify path is within allowed paths
    if (!this.isPathAllowed(fullPath)) {
      throw new Error(`Access denied: Path ${path} is not in allowed paths`);
    }

    try {
      const stats = await fs.stat(fullPath);
      const mimeType = this.getMimeType(fullPath);

      if (this.isTextFile(mimeType)) {
        const text = await fs.readFile(fullPath, 'utf-8');
        return {
          uri,
          mimeType,
          text,
          metadata: {
            size: stats.size,
            modified: stats.mtime,
          },
        };
      } else {
        const buffer = await fs.readFile(fullPath);
        return {
          uri,
          mimeType,
          blob: buffer.toString('base64'),
          metadata: {
            size: stats.size,
            modified: stats.mtime,
          },
        };
      }
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hasResource(uri: string, context?: MCPContext): Promise<boolean> {
    const path = uri.replace(/^file:\/\/\//, '');
    const fullPath = join(this.basePath, path);

    if (!this.isPathAllowed(fullPath)) {
      return false;
    }

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
          files.push(...await this.listFilesRecursive(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return files;
  }

  private isPathAllowed(fullPath: string): boolean {
    return this.allowedPaths.some(allowed => {
      const allowedFull = join(this.basePath, allowed);
      return fullPath.startsWith(allowedFull);
    });
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'xml': 'application/xml',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private isTextFile(mimeType: string): boolean {
    return mimeType.startsWith('text/') ||
           mimeType === 'application/json' ||
           mimeType === 'application/xml';
  }
}

/**
 * Template Resource Provider
 * Exposes template files as resources with template:// scheme
 */
export class TemplateResourceProvider implements ResourceProvider {
  private templates = new Map<string, { content: string; description?: string }>();

  constructor(templates?: Record<string, { content: string; description?: string }>) {
    if (templates) {
      for (const [name, template] of Object.entries(templates)) {
        this.templates.set(name, template);
      }
    }
  }

  getScheme(): string {
    return 'template';
  }

  addTemplate(name: string, content: string, description?: string): void {
    this.templates.set(name, { content, description });
  }

  async listResources(context?: MCPContext): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    for (const [name, template] of this.templates.entries()) {
      resources.push({
        uri: `template:///${name}`,
        name,
        description: template.description || `Template: ${name}`,
        mimeType: 'text/plain',
        metadata: {
          size: template.content.length,
        },
      });
    }

    return resources;
  }

  async readResource(uri: string, context?: MCPContext): Promise<ResourceContent> {
    const name = uri.replace(/^template:\/\/\//, '');
    const template = this.templates.get(name);

    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    return {
      uri,
      mimeType: 'text/plain',
      text: template.content,
      metadata: {
        size: template.content.length,
      },
    };
  }

  async hasResource(uri: string, context?: MCPContext): Promise<boolean> {
    const name = uri.replace(/^template:\/\/\//, '');
    return this.templates.has(name);
  }
}

/**
 * Data Resource Provider
 * Exposes structured data as JSON resources with data:// scheme
 */
export class DataResourceProvider implements ResourceProvider {
  private datasets = new Map<string, { data: any; description?: string }>();

  constructor(datasets?: Record<string, { data: any; description?: string }>) {
    if (datasets) {
      for (const [name, dataset] of Object.entries(datasets)) {
        this.datasets.set(name, dataset);
      }
    }
  }

  getScheme(): string {
    return 'data';
  }

  addDataset(name: string, data: any, description?: string): void {
    this.datasets.set(name, { data, description });
  }

  async listResources(context?: MCPContext): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    for (const [name, dataset] of this.datasets.entries()) {
      resources.push({
        uri: `data:///${name}`,
        name,
        description: dataset.description || `Dataset: ${name}`,
        mimeType: 'application/json',
        metadata: {
          type: typeof dataset.data,
          isArray: Array.isArray(dataset.data),
        },
      });
    }

    return resources;
  }

  async readResource(uri: string, context?: MCPContext): Promise<ResourceContent> {
    const name = uri.replace(/^data:\/\/\//, '');
    const dataset = this.datasets.get(name);

    if (!dataset) {
      throw new Error(`Dataset not found: ${name}`);
    }

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(dataset.data, null, 2),
      metadata: {
        type: typeof dataset.data,
        isArray: Array.isArray(dataset.data),
      },
    };
  }

  async hasResource(uri: string, context?: MCPContext): Promise<boolean> {
    const name = uri.replace(/^data:\/\/\//, '');
    return this.datasets.has(name);
  }
}

/**
 * Resource Registry
 * Manages multiple resource providers and routes resource requests
 */
export class ResourceRegistry extends EventEmitter {
  private providers = new Map<string, ResourceProvider>();

  /**
   * Register a resource provider
   */
  registerProvider(provider: ResourceProvider): void {
    const scheme = provider.getScheme();

    if (this.providers.has(scheme)) {
      throw new Error(`Resource provider already registered for scheme: ${scheme}`);
    }

    this.providers.set(scheme, provider);
    this.emit('providerRegistered', { scheme });
  }

  /**
   * Unregister a resource provider
   */
  unregisterProvider(scheme: string): void {
    this.providers.delete(scheme);
    this.emit('providerUnregistered', { scheme });
  }

  /**
   * List all available resources from all providers
   */
  async listResources(context?: MCPContext): Promise<MCPResource[]> {
    const allResources: MCPResource[] = [];

    for (const provider of this.providers.values()) {
      try {
        const resources = await provider.listResources(context);
        allResources.push(...resources);
      } catch (error) {
        console.error(`Error listing resources from provider ${provider.getScheme()}:`, error);
      }
    }

    return allResources;
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string, context?: MCPContext): Promise<ResourceContent> {
    const scheme = this.extractScheme(uri);
    const provider = this.providers.get(scheme);

    if (!provider) {
      throw new Error(`No resource provider found for scheme: ${scheme}`);
    }

    return await provider.readResource(uri, context);
  }

  /**
   * Check if a resource exists
   */
  async hasResource(uri: string, context?: MCPContext): Promise<boolean> {
    const scheme = this.extractScheme(uri);
    const provider = this.providers.get(scheme);

    if (!provider) {
      return false;
    }

    return await provider.hasResource(uri, context);
  }

  /**
   * Subscribe to resource changes (if provider supports it)
   */
  async subscribeToResource(uri: string, context?: MCPContext): Promise<void> {
    // TODO: Implement resource change notifications
    // This would require providers to emit change events
    throw new Error('Resource subscription not yet implemented');
  }

  /**
   * Get list of registered schemes
   */
  getSchemes(): string[] {
    return Array.from(this.providers.keys());
  }

  private extractScheme(uri: string): string {
    const match = uri.match(/^([a-z][a-z0-9+.-]*):\/\//i);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }
    return match[1].toLowerCase();
  }
}
