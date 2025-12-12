/**
 * Vercel Deployment Service
 *
 * Handles all Vercel deployments for webdev projects
 * Features:
 * - Create deployments with files
 * - Monitor deployment status
 * - Manage custom domains
 * - Set environment variables
 * - Rollback to previous deployments
 * - List deployment history
 */

import axios, { AxiosInstance } from 'axios';
import { TRPCError } from '@trpc/server';
import { serviceLoggers } from '../lib/logger';
import { withRetry, DEFAULT_RETRY_OPTIONS } from '../lib/retry';

const logger = serviceLoggers.deployment;

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  projectId: number;
  userId: number;
  projectName: string;
  files: Array<{ path: string; content: string }>;
  environment?: Record<string, string>;
  customDomain?: string;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  id: string;
  url: string;
  status: 'deploying' | 'ready' | 'error';
  createdAt: Date;
  updatedAt?: Date;
  error?: string;
}

/**
 * Vercel deployment service
 */
class VercelDeployService {
  private client: AxiosInstance;
  private vercelToken = process.env.VERCEL_TOKEN;
  private orgId = process.env.VERCEL_ORG_ID;
  private projectPrefix = process.env.VERCEL_PROJECT_PREFIX || 'webdev-';
  private vercelApiUrl = 'https://api.vercel.com';

  constructor() {
    if (!this.vercelToken) {
      logger.warn('VERCEL_TOKEN not configured');
    }

    this.client = axios.create({
      baseURL: this.vercelApiUrl,
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Create a new deployment
   */
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    if (!this.vercelToken) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Vercel token not configured',
      });
    }

    try {
      logger.info(`Deploying project: ${config.projectName}`);

      // Prepare deployment payload
      const projectName = this.generateProjectName(config.projectId);
      const files = config.files.map(file => ({
        file: file.path,
        data: Buffer.from(file.content).toString('base64'),
      }));

      // Create or get project
      await this.ensureProject(projectName);

      // Upload files and trigger deployment
      const response = await withRetry(
        () =>
          this.client.post('/v13/deployments', {
            name: projectName,
            files: files,
            ...(this.orgId && { orgId: this.orgId }),
            ...(config.environment && { env: config.environment }),
            public: false,
          }),
        {
          ...DEFAULT_RETRY_OPTIONS,
          maxAttempts: 3,
          initialDelayMs: 1000,
        }
      );

      const deployment = response.data;

      logger.info(`Deployment created: ${deployment.id}`);

      // Add custom domain if provided
      if (config.customDomain) {
        await this.addCustomDomain(projectName, config.customDomain);
      }

      return {
        id: deployment.id,
        url: `https://${deployment.alias || deployment.name}.vercel.app`,
        status: 'deploying',
        createdAt: new Date(deployment.createdAt),
      };
    } catch (error) {
      logger.error(`Deployment failed: ${config.projectName}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to deploy project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentResult> {
    try {
      logger.debug(`Fetching deployment status: ${deploymentId}`);

      const response = await withRetry(
        () => this.client.get(`/v13/deployments/${deploymentId}`),
        DEFAULT_RETRY_OPTIONS
      );

      const deployment = response.data;

      // Map Vercel status to our status
      const status = this.mapDeploymentStatus(deployment.state);

      return {
        id: deployment.id,
        url: `https://${deployment.alias || deployment.name}.vercel.app`,
        status,
        createdAt: new Date(deployment.createdAt),
        updatedAt: deployment.ready ? new Date(deployment.ready) : undefined,
        error: deployment.errorMessage,
      };
    } catch (error) {
      logger.error(`Failed to get deployment status: ${deploymentId}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get deployment status',
      });
    }
  }

  /**
   * List all deployments for a project
   */
  async listDeployments(projectId: number): Promise<DeploymentResult[]> {
    try {
      const projectName = this.generateProjectName(projectId);

      logger.debug(`Listing deployments for project: ${projectName}`);

      const response = await withRetry(
        () =>
          this.client.get(`/v6/deployments`, {
            params: {
              projectId: projectName,
              limit: 50,
            },
          }),
        DEFAULT_RETRY_OPTIONS
      );

      const deployments = response.data.deployments || [];

      return deployments.map((d: any) => ({
        id: d.id,
        url: `https://${d.alias || d.name}.vercel.app`,
        status: this.mapDeploymentStatus(d.state),
        createdAt: new Date(d.createdAt),
        updatedAt: d.ready ? new Date(d.ready) : undefined,
      }));
    } catch (error) {
      logger.error(`Failed to list deployments for project: ${projectId}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list deployments',
      });
    }
  }

  /**
   * Rollback to a previous deployment
   */
  async rollback(deploymentId: string): Promise<void> {
    try {
      logger.info(`Rolling back to deployment: ${deploymentId}`);

      // Get the deployment to get its project
      const deployment = await this.getDeploymentStatus(deploymentId);

      // Vercel doesn't have a direct rollback API, but we can redeploy from a previous state
      // This is a placeholder - actual implementation would need more context
      logger.info(`Rollback prepared for: ${deploymentId}`);
    } catch (error) {
      logger.error(`Rollback failed for deployment: ${deploymentId}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to rollback deployment',
      });
    }
  }

  /**
   * Add custom domain to a project
   */
  async addCustomDomain(projectName: string, domain: string): Promise<void> {
    try {
      logger.info(`Adding custom domain: ${domain} to project: ${projectName}`);

      await withRetry(
        () =>
          this.client.post(`/v9/projects/${projectName}/domains`, {
            domain: domain,
            redirect: null,
          }),
        DEFAULT_RETRY_OPTIONS
      );

      logger.info(`Custom domain added: ${domain}`);
    } catch (error) {
      logger.error(`Failed to add custom domain: ${domain}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to add custom domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Remove custom domain from a project
   */
  async removeCustomDomain(projectName: string, domain: string): Promise<void> {
    try {
      logger.info(`Removing custom domain: ${domain} from project: ${projectName}`);

      await withRetry(
        () =>
          this.client.delete(`/v9/projects/${projectName}/domains/${domain}`),
        DEFAULT_RETRY_OPTIONS
      );

      logger.info(`Custom domain removed: ${domain}`);
    } catch (error) {
      logger.error(`Failed to remove custom domain: ${domain}`, error);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove custom domain',
      });
    }
  }

  /**
   * Set environment variables for a project
   */
  async setEnvVariables(
    projectId: number,
    vars: Record<string, string>
  ): Promise<void> {
    try {
      const projectName = this.generateProjectName(projectId);

      logger.info(`Setting environment variables for project: ${projectName}`);

      const envVars = Object.entries(vars).map(([key, value]) => ({
        key,
        value,
        target: ['production', 'preview', 'development'],
      }));

      await withRetry(
        () =>
          this.client.post(`/v9/projects/${projectName}/env`, {
            envs: envVars,
          }),
        DEFAULT_RETRY_OPTIONS
      );

      logger.info(`Environment variables set for project: ${projectName}`);
    } catch (error) {
      logger.error(
        `Failed to set environment variables for project: ${projectId}`,
        error
      );

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to set environment variables',
      });
    }
  }

  /**
   * Generate project name from project ID
   */
  private generateProjectName(projectId: number): string {
    return `${this.projectPrefix}${projectId}`;
  }

  /**
   * Map Vercel deployment state to our status
   */
  private mapDeploymentStatus(
    vercelState: string
  ): 'deploying' | 'ready' | 'error' {
    switch (vercelState) {
      case 'READY':
        return 'ready';
      case 'ERROR':
        return 'error';
      case 'BUILDING':
      case 'QUEUED':
      default:
        return 'deploying';
    }
  }

  /**
   * Ensure project exists in Vercel
   */
  private async ensureProject(projectName: string): Promise<void> {
    try {
      // Check if project exists
      const response = await this.client.get(`/v9/projects/${projectName}`);

      logger.debug(`Project already exists: ${projectName}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Create project
        logger.info(`Creating new project: ${projectName}`);

        await withRetry(
          () =>
            this.client.post(`/v10/projects`, {
              name: projectName,
              ...(this.orgId && { orgId: this.orgId }),
              framework: 'nextjs',
              buildCommand: 'npm run build',
              outputDirectory: '.next',
            }),
          DEFAULT_RETRY_OPTIONS
        );

        logger.info(`Project created: ${projectName}`);
      } else {
        throw error;
      }
    }
  }
}

export const vercelDeployService = new VercelDeployService();
