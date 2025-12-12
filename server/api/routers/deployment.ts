/**
 * Deployment Router
 *
 * Handles all deployment operations for webdev projects
 * Features:
 * - Deploy projects to Vercel
 * - Monitor deployment status
 * - Manage custom domains
 * - Rollback deployments
 * - List deployment history
 * - Configure environment variables
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../../_core/trpc';
import { vercelDeployService } from '../../services/vercel-deploy.service';
import { s3StorageService } from '../../services/s3-storage.service';
import { buildService } from '../../services/build.service';
import { getDb } from '../../db';
import { eq } from 'drizzle-orm';
import { serviceLoggers } from '../../lib/logger';

const logger = serviceLoggers.deployment;

/**
 * Validation schemas
 */
const deploymentConfigSchema = z.object({
  projectId: z.number().positive('Project ID must be positive'),
  projectName: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long'),
  files: z
    .array(
      z.object({
        path: z.string().min(1, 'File path is required'),
        content: z.string().min(1, 'File content is required'),
      })
    )
    .min(1, 'At least one file is required'),
  environment: z
    .record(z.string(), z.string())
    .optional()
    .describe('Environment variables for deployment'),
  customDomain: z
    .string()
    .optional()
    .describe('Custom domain for the deployment'),
});

const deploymentStatusSchema = z.object({
  deploymentId: z.string().min(1, 'Deployment ID is required'),
});

const domainManagementSchema = z.object({
  projectId: z.number().positive('Project ID must be positive'),
  domain: z.string().min(1, 'Domain is required'),
});

const envVariablesSchema = z.object({
  projectId: z.number().positive('Project ID must be positive'),
  variables: z.record(z.string(), z.string()),
});

/**
 * Deployment Router
 */
export const deploymentRouter = router({
  /**
   * Deploy a project to Vercel
   *
   * Creates a new deployment with the provided files and configuration.
   * Automatically builds the project and uploads it to Vercel.
   *
   * @example
   * ```ts
   * const deployment = await trpc.deployment.deploy.mutate({
   *   projectId: 1,
   *   projectName: 'my-webdev-project',
   *   files: [{
   *     path: 'index.html',
   *     content: '<html>...</html>'
   *   }],
   *   environment: { NODE_ENV: 'production' },
   * });
   * ```
   */
  deploy: protectedProcedure
    .input(deploymentConfigSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logger.info(`Deploy requested by user ${ctx.user?.id}: ${input.projectName}`);

        // TODO: Verify user ownership of project
        // const project = await getDb().query.projects.findFirst({
        //   where: eq(projects.id, input.projectId),
        // });
        // if (!project || project.userId !== ctx.user?.id) {
        //   throw new TRPCError({
        //     code: 'FORBIDDEN',
        //     message: 'You do not have permission to deploy this project',
        //   });
        // }

        // Build the project first
        const buildResult = await buildService.buildProject(
          input.projectId,
          input.files
        );

        if (!buildResult.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Build failed: ${buildResult.errors?.join(', ') || 'Unknown error'}`,
          });
        }

        logger.info(`Build successful: ${buildResult.fileCount} files`);

        // Deploy to Vercel
        const deployment = await vercelDeployService.deploy({
          projectId: input.projectId,
          userId: ctx.user?.id || 0,
          projectName: input.projectName,
          files: input.files,
          environment: input.environment,
          customDomain: input.customDomain,
        });

        // TODO: Store deployment record in database
        // await getDb().insert(deployments).values({
        //   id: deployment.id,
        //   projectId: input.projectId,
        //   url: deployment.url,
        //   status: deployment.status,
        //   createdAt: new Date(),
        // });

        logger.info(`Deployment created: ${deployment.id}`);

        return {
          success: true,
          deployment,
          buildStats: {
            fileCount: buildResult.fileCount,
            totalSize: buildResult.totalSize,
            duration: buildResult.duration,
          },
        };
      } catch (error) {
        logger.error(`Deployment failed: ${input.projectName}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  /**
   * Get deployment status
   *
   * Retrieves the current status of a deployment including URL and state.
   *
   * @example
   * ```ts
   * const status = await trpc.deployment.getStatus.query({
   *   deploymentId: 'deploy_xyz123'
   * });
   * console.log('Status:', status.status);
   * ```
   */
  getStatus: protectedProcedure
    .input(deploymentStatusSchema)
    .query(async ({ input, ctx }) => {
      try {
        logger.debug(`Getting deployment status: ${input.deploymentId}`);

        const status = await vercelDeployService.getDeploymentStatus(
          input.deploymentId
        );

        return {
          success: true,
          deployment: status,
        };
      } catch (error) {
        logger.error(`Failed to get deployment status: ${input.deploymentId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment status',
        });
      }
    }),

  /**
   * List all deployments for a project
   *
   * Retrieves deployment history for a specific project.
   *
   * @example
   * ```ts
   * const deployments = await trpc.deployment.listDeployments.query({
   *   projectId: 1
   * });
   * ```
   */
  listDeployments: protectedProcedure
    .input(
      z.object({
        projectId: z.number().positive('Project ID must be positive'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        logger.debug(`Listing deployments for project: ${input.projectId}`);

        // TODO: Verify user ownership
        // const project = await getDb().query.projects.findFirst({
        //   where: eq(projects.id, input.projectId),
        // });
        // if (!project || project.userId !== ctx.user?.id) {
        //   throw new TRPCError({
        //     code: 'FORBIDDEN',
        //     message: 'You do not have permission to view this project',
        //   });
        // }

        const deployments = await vercelDeployService.listDeployments(
          input.projectId
        );

        return {
          success: true,
          deployments,
          total: deployments.length,
        };
      } catch (error) {
        logger.error(`Failed to list deployments: ${input.projectId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list deployments',
        });
      }
    }),

  /**
   * Rollback to a previous deployment
   *
   * Reverts the project to a previous deployment version.
   *
   * @example
   * ```ts
   * await trpc.deployment.rollback.mutate({
   *   deploymentId: 'deploy_prev123'
   * });
   * ```
   */
  rollback: protectedProcedure
    .input(deploymentStatusSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logger.info(`Rollback requested for deployment: ${input.deploymentId}`);

        // TODO: Verify user ownership
        // Get deployment and check user ownership of project

        await vercelDeployService.rollback(input.deploymentId);

        logger.info(`Rollback completed for deployment: ${input.deploymentId}`);

        return {
          success: true,
          message: `Successfully rolled back to deployment ${input.deploymentId}`,
        };
      } catch (error) {
        logger.error(`Rollback failed for deployment: ${input.deploymentId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Rollback failed',
        });
      }
    }),

  /**
   * Add a custom domain to a project
   *
   * Associates a custom domain with a deployment project.
   *
   * @example
   * ```ts
   * await trpc.deployment.addDomain.mutate({
   *   projectId: 1,
   *   domain: 'mysite.com'
   * });
   * ```
   */
  addDomain: protectedProcedure
    .input(domainManagementSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logger.info(
          `Adding domain ${input.domain} to project: ${input.projectId}`
        );

        // TODO: Verify user ownership
        const projectName = `webdev-${input.projectId}`;

        await vercelDeployService.addCustomDomain(projectName, input.domain);

        logger.info(`Domain added: ${input.domain}`);

        return {
          success: true,
          message: `Domain ${input.domain} has been added`,
        };
      } catch (error) {
        logger.error(`Failed to add domain: ${input.domain}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add domain',
        });
      }
    }),

  /**
   * Remove a custom domain from a project
   *
   * Disassociates a custom domain from a deployment project.
   *
   * @example
   * ```ts
   * await trpc.deployment.removeDomain.mutate({
   *   projectId: 1,
   *   domain: 'mysite.com'
   * });
   * ```
   */
  removeDomain: protectedProcedure
    .input(domainManagementSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logger.info(
          `Removing domain ${input.domain} from project: ${input.projectId}`
        );

        // TODO: Verify user ownership
        const projectName = `webdev-${input.projectId}`;

        await vercelDeployService.removeCustomDomain(projectName, input.domain);

        logger.info(`Domain removed: ${input.domain}`);

        return {
          success: true,
          message: `Domain ${input.domain} has been removed`,
        };
      } catch (error) {
        logger.error(`Failed to remove domain: ${input.domain}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove domain',
        });
      }
    }),

  /**
   * Set environment variables for a project
   *
   * Configures environment variables for a deployment project.
   *
   * @example
   * ```ts
   * await trpc.deployment.setEnvVariables.mutate({
   *   projectId: 1,
   *   variables: {
   *     API_KEY: 'secret123',
   *     NODE_ENV: 'production'
   *   }
   * });
   * ```
   */
  setEnvVariables: protectedProcedure
    .input(envVariablesSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        logger.info(
          `Setting ${Object.keys(input.variables).length} environment variables for project: ${input.projectId}`
        );

        // TODO: Verify user ownership
        // Validate that sensitive variables are handled securely
        const sensitiveKeys = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
        const hasSensitive = Object.keys(input.variables).some(key =>
          sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))
        );

        if (hasSensitive) {
          logger.warn(`Sensitive variables detected for project: ${input.projectId}`);
        }

        await vercelDeployService.setEnvVariables(
          input.projectId,
          input.variables
        );

        logger.info(
          `Environment variables set for project: ${input.projectId}`
        );

        return {
          success: true,
          message: `Environment variables have been configured`,
          count: Object.keys(input.variables).length,
        };
      } catch (error) {
        logger.error(
          `Failed to set environment variables for project: ${input.projectId}`,
          error
        );

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set environment variables',
        });
      }
    }),

  /**
   * Get deployment build logs
   *
   * Retrieves build logs for a specific project.
   *
   * @example
   * ```ts
   * const logs = await trpc.deployment.getBuildLogs.query({
   *   projectId: 1
   * });
   * ```
   */
  getBuildLogs: protectedProcedure
    .input(
      z.object({
        projectId: z.number().positive('Project ID must be positive'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        logger.debug(`Getting build logs for project: ${input.projectId}`);

        const logs = await buildService.getBuildLogs(input.projectId);

        return {
          success: true,
          logs,
          totalLines: logs.length,
        };
      } catch (error) {
        logger.error(`Failed to get build logs for project: ${input.projectId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get build logs',
        });
      }
    }),

  /**
   * Get deployment storage info
   *
   * Retrieves storage and asset information for a deployment.
   *
   * @example
   * ```ts
   * const info = await trpc.deployment.getStorageInfo.query({
   *   projectId: 1
   * });
   * ```
   */
  getStorageInfo: protectedProcedure
    .input(
      z.object({
        projectId: z.number().positive('Project ID must be positive'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const bucketInfo = s3StorageService.getBucketInfo();

        return {
          success: true,
          storage: {
            bucket: bucketInfo.bucket,
            region: bucketInfo.region,
            prefix: `webdev-${input.projectId}/`,
          },
        };
      } catch (error) {
        logger.error(`Failed to get storage info for project: ${input.projectId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get storage information',
        });
      }
    }),

  /**
   * Get deployment analytics
   *
   * Retrieves deployment statistics and metrics.
   *
   * @example
   * ```ts
   * const analytics = await trpc.deployment.getAnalytics.query({
   *   projectId: 1
   * });
   * ```
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        projectId: z.number().positive('Project ID must be positive'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        logger.debug(`Getting analytics for project: ${input.projectId}`);

        const buildStats = await buildService.getBuildStats(input.projectId);

        return {
          success: true,
          analytics: {
            totalBuilds: buildStats.builds,
            totalBuildSize: buildStats.totalBuildsSize,
            averageBuildTime: buildStats.averageBuildTime,
          },
        };
      } catch (error) {
        logger.error(`Failed to get analytics for project: ${input.projectId}`, error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment analytics',
        });
      }
    }),
});
