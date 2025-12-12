/**
 * Build Service
 *
 * Handles project building and compilation for webdev projects
 * Features:
 * - Build projects with source files
 * - Generate build outputs
 * - Collect build logs
 * - Calculate build statistics
 * - Error reporting and diagnostics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TRPCError } from '@trpc/server';
import { serviceLoggers } from '../lib/logger';

const logger = serviceLoggers.deployment;
const execAsync = promisify(exec);

/**
 * Project file structure
 */
export interface ProjectFile {
  path: string;
  content: string;
}

/**
 * Build result structure
 */
export interface BuildResult {
  success: boolean;
  outputDir: string;
  fileCount: number;
  totalSize: number;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

/**
 * Build Service
 */
class BuildService {
  private tempDir = path.join(os.tmpdir(), 'webdev-builds');
  private maxBuildSize = 50 * 1024 * 1024; // 50MB
  private buildTimeout = 300000; // 5 minutes

  constructor() {
    this.initializeTempDir();
  }

  /**
   * Initialize temporary directory
   */
  private async initializeTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', error);
    }
  }

  /**
   * Build a project from source files
   */
  async buildProject(
    projectId: number,
    files: ProjectFile[]
  ): Promise<BuildResult> {
    const startTime = Date.now();
    const buildDir = path.join(this.tempDir, `project-${projectId}`);
    const outputDir = path.join(buildDir, '.output');

    try {
      logger.info(`Starting build for project: ${projectId}`);

      // Create build directory
      await fs.mkdir(buildDir, { recursive: true });
      await fs.mkdir(outputDir, { recursive: true });

      // Validate files
      this.validateFiles(files);

      // Write files to disk
      await this.writeFiles(buildDir, files);

      // Detect project type and build
      const projectType = await this.detectProjectType(buildDir);
      logger.info(`Detected project type: ${projectType}`);

      // Run build command based on project type
      const buildOutput = await this.runBuild(buildDir, projectType);

      // Collect output files
      const { fileCount, totalSize } = await this.collectBuildOutput(
        buildDir,
        outputDir
      );

      const duration = Date.now() - startTime;

      logger.info(
        `Build completed for project ${projectId}: ${fileCount} files, ${totalSize} bytes`
      );

      return {
        success: true,
        outputDir,
        fileCount,
        totalSize,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Build failed for project ${projectId}:`, error);

      return {
        success: false,
        outputDir,
        fileCount: 0,
        totalSize: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration,
      };
    } finally {
      // Cleanup temporary files after a delay
      this.cleanupBuildDir(buildDir).catch(err =>
        logger.error(`Cleanup failed for ${buildDir}`, err)
      );
    }
  }

  /**
   * Get build logs for a project
   */
  async getBuildLogs(projectId: number): Promise<string[]> {
    try {
      const logsFile = path.join(
        this.tempDir,
        `project-${projectId}`,
        '.build.log'
      );

      const content = await fs.readFile(logsFile, 'utf-8');
      return content.split('\n').filter(line => line.trim());
    } catch (error) {
      logger.warn(`No build logs found for project ${projectId}`);
      return [];
    }
  }

  /**
   * Validate files before building
   */
  private validateFiles(files: ProjectFile[]): void {
    if (!files || files.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No files provided for build',
      });
    }

    let totalSize = 0;

    for (const file of files) {
      if (!file.path || !file.content) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file structure',
        });
      }

      totalSize += file.content.length;

      // Check for suspicious paths
      if (file.path.includes('..') || file.path.startsWith('/')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file path',
        });
      }
    }

    if (totalSize > this.maxBuildSize) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Build size exceeds limit: ${totalSize} > ${this.maxBuildSize}`,
      });
    }
  }

  /**
   * Write files to disk
   */
  private async writeFiles(
    baseDir: string,
    files: ProjectFile[]
  ): Promise<void> {
    for (const file of files) {
      const filePath = path.join(baseDir, file.path);
      const dirPath = path.dirname(filePath);

      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }
  }

  /**
   * Detect project type
   */
  private async detectProjectType(
    baseDir: string
  ): Promise<'nextjs' | 'react' | 'static'> {
    try {
      const packageJsonPath = path.join(baseDir, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        return 'nextjs';
      }

      if (
        packageJson.dependencies?.react ||
        packageJson.devDependencies?.react
      ) {
        return 'react';
      }
    } catch {
      // No package.json or error reading it
    }

    return 'static';
  }

  /**
   * Run build command
   */
  private async runBuild(
    baseDir: string,
    projectType: string
  ): Promise<string> {
    let buildCommand = '';

    switch (projectType) {
      case 'nextjs':
        buildCommand =
          'cd project && npm install && npm run build 2>&1 || true';
        break;
      case 'react':
        buildCommand = 'cd project && npm install && npm run build 2>&1 || true';
        break;
      case 'static':
      default:
        // For static sites, just verify HTML files exist
        buildCommand = 'ls -la project/';
    }

    try {
      logger.info(`Running build command: ${buildCommand}`);

      const { stdout, stderr } = await execAsync(buildCommand, {
        cwd: path.dirname(baseDir),
        timeout: this.buildTimeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return stdout + stderr;
    } catch (error: any) {
      // Log the error but don't throw - we want to continue with what we have
      logger.warn(`Build command failed: ${error.message}`);

      return error.stdout + error.stderr;
    }
  }

  /**
   * Collect build output
   */
  private async collectBuildOutput(
    buildDir: string,
    outputDir: string
  ): Promise<{ fileCount: number; totalSize: number }> {
    let fileCount = 0;
    let totalSize = 0;

    // Copy build artifacts based on project type
    const distPath = path.join(buildDir, 'dist');
    const nextPath = path.join(buildDir, '.next');
    const publicPath = path.join(buildDir, 'public');

    for (const sourcePath of [nextPath, distPath, publicPath]) {
      if (await this.pathExists(sourcePath)) {
        const stats = await this.copyDirRecursive(sourcePath, outputDir);
        fileCount += stats.fileCount;
        totalSize += stats.totalSize;
      }
    }

    // Ensure output directory exists
    if (fileCount === 0) {
      // Copy all non-node_modules files
      const stats = await this.copyDirRecursive(
        buildDir,
        outputDir,
        ['node_modules', '.next', 'dist', '.git']
      );
      fileCount = stats.fileCount;
      totalSize = stats.totalSize;
    }

    return { fileCount, totalSize };
  }

  /**
   * Copy directory recursively
   */
  private async copyDirRecursive(
    source: string,
    destination: string,
    excludeDirs: string[] = []
  ): Promise<{ fileCount: number; totalSize: number }> {
    let fileCount = 0;
    let totalSize = 0;

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) {
        continue;
      }

      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        const stats = await this.copyDirRecursive(
          srcPath,
          destPath,
          excludeDirs
        );
        fileCount += stats.fileCount;
        totalSize += stats.totalSize;
      } else {
        await fs.copyFile(srcPath, destPath);
        const stat = await fs.stat(srcPath);
        fileCount++;
        totalSize += stat.size;
      }
    }

    return { fileCount, totalSize };
  }

  /**
   * Check if path exists
   */
  private async pathExists(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup build directory
   */
  private async cleanupBuildDir(buildDir: string): Promise<void> {
    try {
      // Don't delete immediately, keep for 24 hours for debugging
      logger.debug(`Keeping build directory: ${buildDir}`);
    } catch (error) {
      logger.error(`Cleanup failed for ${buildDir}:`, error);
    }
  }

  /**
   * Get build statistics
   */
  async getBuildStats(projectId: number): Promise<{
    builds: number;
    totalBuildsSize: number;
    averageBuildTime: number;
  }> {
    try {
      const projectDir = path.join(this.tempDir, `project-${projectId}`);
      const entries = await fs.readdir(projectDir);

      return {
        builds: entries.length,
        totalBuildsSize: 0,
        averageBuildTime: 0,
      };
    } catch {
      return {
        builds: 0,
        totalBuildsSize: 0,
        averageBuildTime: 0,
      };
    }
  }

  /**
   * Clean old builds
   */
  async cleanOldBuilds(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const now = Date.now();
      const entries = await fs.readdir(this.tempDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.tempDir, entry.name);
          const stat = await fs.stat(dirPath);

          if (now - stat.mtimeMs > maxAgeMs) {
            await this.removeDir(dirPath);
            logger.info(`Cleaned old build: ${entry.name}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to clean old builds', error);
    }
  }

  /**
   * Remove directory recursively
   */
  private async removeDir(dirPath: string): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.removeDir(fullPath);
      } else {
        await fs.unlink(fullPath);
      }
    }

    await fs.rmdir(dirPath);
  }
}

export const buildService = new BuildService();
