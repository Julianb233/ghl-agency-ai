import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { webdevProjectService } from "../../services/webdev-project.service";
import { devServerManager } from "../../services/dev-server.service";
import { codeGeneratorService } from "../../services/code-generator.service";
import * as path from "path";

/**
 * Webdev tRPC Router
 * Provides API endpoints for webdev project management
 *
 * Features:
 * - Create and manage webdev projects
 * - File operations (read, write, list)
 * - Dev server management (start, stop, status)
 * - AI code generation
 * - Project checkpoints/versioning
 */

// ========================================
// INPUT SCHEMAS
// ========================================

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  techStack: z.enum(['react', 'vue', 'static', 'nextjs']).default('react'),
  description: z.string().optional(),
  features: z.object({
    server: z.boolean().optional(),
    database: z.boolean().optional(),
    auth: z.boolean().optional(),
    stripe: z.boolean().optional(),
  }).optional(),
  scaffold: z.boolean().default(true), // Auto-scaffold project after creation
});

const getProjectSchema = z.object({
  projectId: z.number().int().positive(),
});

const deleteProjectSchema = z.object({
  projectId: z.number().int().positive(),
  stopServer: z.boolean().default(true), // Automatically stop dev server if running
});

const readFileSchema = z.object({
  projectId: z.number().int().positive(),
  path: z.string().min(1),
});

const writeFileSchema = z.object({
  projectId: z.number().int().positive(),
  path: z.string().min(1),
  content: z.string(),
  triggerReload: z.boolean().default(true), // Trigger HMR after write
});

const listFilesSchema = z.object({
  projectId: z.number().int().positive(),
});

const startDevServerSchema = z.object({
  projectId: z.number().int().positive(),
  port: z.number().int().min(3000).max(9999).optional(),
});

const stopDevServerSchema = z.object({
  projectId: z.number().int().positive(),
});

const getDevServerStatusSchema = z.object({
  projectId: z.number().int().positive(),
});

const generateCodeSchema = z.object({
  projectId: z.number().int().positive(),
  prompt: z.string().min(1).max(5000),
  targetFile: z.string().optional(),
  applyChanges: z.boolean().default(true), // Automatically apply generated code to project
});

const saveCheckpointSchema = z.object({
  projectId: z.number().int().positive(),
  description: z.string().max(500).optional(),
});

const listCheckpointsSchema = z.object({
  projectId: z.number().int().positive(),
});

const rollbackCheckpointSchema = z.object({
  projectId: z.number().int().positive(),
  version: z.number().int().positive(),
  restartServer: z.boolean().default(true), // Restart dev server after rollback
});

// ========================================
// WEBDEV ROUTER
// ========================================

export const webdevRouter = router({
  /**
   * Create a new webdev project
   * Creates project and optionally scaffolds initial files
   */
  createProject: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Create project
        const project = await webdevProjectService.createProject({
          userId,
          name: input.name,
          techStack: input.techStack,
          description: input.description,
          features: input.features,
        });

        // Auto-scaffold if requested
        if (input.scaffold) {
          await webdevProjectService.scaffoldProject(project.id, userId);
        }

        return {
          success: true,
          project: {
            id: project.id,
            name: project.name,
            techStack: project.techStack,
            description: project.description,
            features: project.features,
            status: project.status,
            createdAt: project.createdAt,
          },
        };
      } catch (error) {
        console.error("Failed to create project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all projects for the authenticated user
   */
  listProjects: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      try {
        const projects = await webdevProjectService.listProjects(userId);

        return projects.map(project => ({
          id: project.id,
          name: project.name,
          techStack: project.techStack,
          description: project.description,
          features: project.features,
          status: project.status,
          devServerPort: project.devServerPort,
          previewUrl: project.previewUrl,
          deploymentUrl: project.deploymentUrl,
          fileCount: project.filesSnapshot.length,
          createdAt: project.createdAt,
        }));
      } catch (error) {
        console.error("Failed to list projects:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single project with all files
   */
  getProject: protectedProcedure
    .input(getProjectSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const project = await webdevProjectService.getProject(input.projectId, userId);

        // Get dev server status if running
        const serverStatus = devServerManager.getStatus(input.projectId);

        return {
          id: project.id,
          name: project.name,
          techStack: project.techStack,
          description: project.description,
          features: project.features,
          files: project.filesSnapshot,
          status: project.status,
          devServerPort: project.devServerPort,
          previewUrl: project.previewUrl,
          deploymentUrl: project.deploymentUrl,
          createdAt: project.createdAt,
          serverStatus,
        };
      } catch (error) {
        console.error("Failed to get project:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get project: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a project
   * Optionally stops dev server first
   */
  deleteProject: protectedProcedure
    .input(deleteProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Stop dev server if running and requested
        if (input.stopServer) {
          const serverStatus = devServerManager.getStatus(input.projectId);
          if (serverStatus && (serverStatus.status === 'running' || serverStatus.status === 'starting')) {
            await devServerManager.stopServer(input.projectId);
          }
        }

        // Delete project (soft delete)
        await webdevProjectService.deleteProject(input.projectId, userId);

        return {
          success: true,
          projectId: input.projectId,
        };
      } catch (error) {
        console.error("Failed to delete project:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete project: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // FILE OPERATIONS
  // ========================================

  /**
   * Read a file from the project
   */
  readFile: protectedProcedure
    .input(readFileSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const content = await webdevProjectService.readFile(
          input.projectId,
          userId,
          input.path
        );

        return {
          path: input.path,
          content,
        };
      } catch (error) {
        console.error("Failed to read file:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Write a file to the project
   * Automatically triggers hot reload if dev server is running
   */
  writeFile: protectedProcedure
    .input(writeFileSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        await webdevProjectService.writeFile(
          input.projectId,
          userId,
          input.path,
          input.content
        );

        // Trigger hot reload if requested and server is running
        if (input.triggerReload) {
          const serverStatus = devServerManager.getStatus(input.projectId);
          if (serverStatus && serverStatus.status === 'running') {
            await devServerManager.triggerReload(input.projectId);
          }
        }

        return {
          success: true,
          path: input.path,
        };
      } catch (error) {
        console.error("Failed to write file:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all files in the project as a tree structure
   */
  listFiles: protectedProcedure
    .input(listFilesSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const files = await webdevProjectService.getFiles(input.projectId, userId);

        // Build tree structure
        const tree = buildFileTree(files);

        return {
          files,
          tree,
        };
      } catch (error) {
        console.error("Failed to list files:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // DEV SERVER OPERATIONS
  // ========================================

  /**
   * Start the Vite dev server for a project
   */
  startDevServer: protectedProcedure
    .input(startDevServerSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Verify project ownership
        const project = await webdevProjectService.getProject(input.projectId, userId);

        // Determine project path (in production, this would be a real directory)
        const projectPath = path.join(process.cwd(), '.webdev-projects', `project-${input.projectId}`);

        // Start dev server
        const serverInfo = await devServerManager.startServer({
          projectId: input.projectId,
          userId,
          projectPath,
          port: input.port,
        });

        // Update project with server info
        await webdevProjectService.updateProject(input.projectId, userId, {
          devServerPort: serverInfo.port,
          previewUrl: serverInfo.url,
        });

        return {
          success: true,
          server: {
            port: serverInfo.port,
            url: serverInfo.url,
            status: serverInfo.status,
            startedAt: serverInfo.startedAt,
          },
        };
      } catch (error) {
        console.error("Failed to start dev server:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start dev server: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Stop the dev server for a project
   */
  stopDevServer: protectedProcedure
    .input(stopDevServerSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Verify project ownership
        await webdevProjectService.getProject(input.projectId, userId);

        // Stop server
        await devServerManager.stopServer(input.projectId);

        // Update project
        await webdevProjectService.updateProject(input.projectId, userId, {
          devServerPort: undefined,
          previewUrl: undefined,
        });

        return {
          success: true,
          projectId: input.projectId,
        };
      } catch (error) {
        console.error("Failed to stop dev server:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to stop dev server: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get dev server status for a project
   */
  getDevServerStatus: protectedProcedure
    .input(getDevServerStatusSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Verify project ownership
        await webdevProjectService.getProject(input.projectId, userId);

        // Get server status
        const serverStatus = devServerManager.getStatus(input.projectId);

        if (!serverStatus) {
          return {
            running: false,
            status: 'stopped',
          };
        }

        return {
          running: serverStatus.status === 'running',
          status: serverStatus.status,
          port: serverStatus.port,
          url: serverStatus.url,
          pid: serverStatus.pid,
          startedAt: serverStatus.startedAt,
          errorMessage: serverStatus.errorMessage,
        };
      } catch (error) {
        console.error("Failed to get dev server status:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get dev server status: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // CODE GENERATION
  // ========================================

  /**
   * Generate code with Claude AI
   * Optionally applies changes to the project automatically
   */
  generateCode: protectedProcedure
    .input(generateCodeSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Get project for context
        const project = await webdevProjectService.getProject(input.projectId, userId);

        // Prepare context for code generation
        const context = {
          projectId: input.projectId,
          techStack: project.techStack,
          existingFiles: project.filesSnapshot.map(f => ({
            path: f.path,
            content: f.content,
          })),
          features: project.features,
        };

        // Generate code
        const generated = input.targetFile
          ? await codeGeneratorService.modifyFile(input.targetFile, input.prompt, context)
          : await codeGeneratorService.generateComponent(input.prompt, context);

        // Apply changes if requested
        if (input.applyChanges) {
          for (const file of generated.files) {
            if (file.action === 'create' || file.action === 'update') {
              await webdevProjectService.writeFile(
                input.projectId,
                userId,
                file.path,
                file.content
              );
            } else if (file.action === 'delete') {
              await webdevProjectService.deleteFile(
                input.projectId,
                userId,
                file.path
              );
            }
          }

          // Trigger hot reload if dev server is running
          const serverStatus = devServerManager.getStatus(input.projectId);
          if (serverStatus && serverStatus.status === 'running') {
            await devServerManager.triggerReload(input.projectId);
          }
        }

        return {
          success: true,
          generated: {
            files: generated.files,
            explanation: generated.explanation,
            dependencies: generated.dependencies,
          },
          applied: input.applyChanges,
        };
      } catch (error) {
        console.error("Failed to generate code:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate code: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // CHECKPOINTS / VERSIONING
  // ========================================

  /**
   * Save a checkpoint of the current project state
   */
  saveCheckpoint: protectedProcedure
    .input(saveCheckpointSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const version = await webdevProjectService.createCheckpoint(
          input.projectId,
          userId,
          input.description
        );

        return {
          success: true,
          version,
          description: input.description || `Version ${version}`,
        };
      } catch (error) {
        console.error("Failed to save checkpoint:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save checkpoint: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all checkpoints for a project
   */
  listCheckpoints: protectedProcedure
    .input(listCheckpointsSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const checkpoints = await webdevProjectService.listCheckpoints(
          input.projectId,
          userId
        );

        return checkpoints;
      } catch (error) {
        console.error("Failed to list checkpoints:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list checkpoints: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Rollback project to a previous checkpoint
   * Optionally restarts dev server after rollback
   */
  rollbackCheckpoint: protectedProcedure
    .input(rollbackCheckpointSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Restore checkpoint
        await webdevProjectService.restoreCheckpoint(
          input.projectId,
          userId,
          input.version
        );

        // Restart dev server if requested and running
        if (input.restartServer) {
          const serverStatus = devServerManager.getStatus(input.projectId);
          if (serverStatus && serverStatus.status === 'running') {
            await devServerManager.restartServer(input.projectId);
          }
        }

        return {
          success: true,
          version: input.version,
        };
      } catch (error) {
        console.error("Failed to rollback checkpoint:", error);
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to rollback checkpoint: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});

/**
 * Helper: Build file tree structure from flat file list
 */
function buildFileTree(files: Array<{ path: string; isDirectory?: boolean }>) {
  const tree: any = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast && !file.isDirectory) {
        current[part] = { type: 'file', path: file.path };
      } else {
        if (!current[part]) {
          current[part] = { type: 'directory', children: {} };
        }
        current = current[part].children || current[part];
      }
    }
  }

  return tree;
}
