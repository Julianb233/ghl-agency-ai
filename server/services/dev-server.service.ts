import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createServer } from 'net';
import { join } from 'path';
import { promises as fs } from 'fs';

export interface ServerInfo {
  port: number;
  url: string;
  pid: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  startedAt?: Date;
  errorMessage?: string;
}

export interface DevServerConfig {
  projectId: number;
  userId: number;
  projectPath: string;
  port?: number;
  host?: string;
}

interface ServerInstance {
  process: ChildProcess;
  info: ServerInfo;
}

/**
 * Manages Vite dev server instances for webdev projects
 * Handles port allocation, process lifecycle, and hot reload
 */
class DevServerManager extends EventEmitter {
  private servers = new Map<number, ServerInstance>();
  private portRange = { min: 3001, max: 3999 };
  private usedPorts = new Set<number>();
  private idleTimeout = 30 * 60 * 1000; // 30 minutes
  private idleTimers = new Map<number, NodeJS.Timeout>();
  private readonly defaultHost = '0.0.0.0';

  constructor() {
    super();
    this.setupCleanupHandlers();
  }

  /**
   * Allocates an available port from the configured range
   * @returns Available port number
   * @throws Error if no ports available
   */
  private allocatePort(): number {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  /**
   * Releases a port back to the available pool
   * @param port Port number to release
   */
  private releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  /**
   * Checks if a port is available for binding
   * @param port Port number to check
   * @returns Promise resolving to true if available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Ensures project directory exists and writes necessary files
   * @param config Server configuration
   */
  private async prepareProjectDirectory(config: DevServerConfig): Promise<void> {
    try {
      await fs.access(config.projectPath);
    } catch {
      await fs.mkdir(config.projectPath, { recursive: true });
    }

    // Ensure package.json exists
    const packageJsonPath = join(config.projectPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
    } catch {
      const defaultPackageJson = {
        name: `project-${config.projectId}`,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        devDependencies: {
          vite: '^5.0.0'
        }
      };
      await fs.writeFile(packageJsonPath, JSON.stringify(defaultPackageJson, null, 2));
    }

    // Ensure vite.config.js exists
    const viteConfigPath = join(config.projectPath, 'vite.config.js');
    try {
      await fs.access(viteConfigPath);
    } catch {
      const defaultViteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    strictPort: true,
    hmr: {
      overlay: true
    }
  }
});
`;
      await fs.writeFile(viteConfigPath, defaultViteConfig);
    }

    // Ensure index.html exists
    const indexHtmlPath = join(config.projectPath, 'index.html');
    try {
      await fs.access(indexHtmlPath);
    } catch {
      const defaultIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project ${config.projectId}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;
      await fs.writeFile(indexHtmlPath, defaultIndexHtml);
    }

    // Ensure src directory and main.js exist
    const srcDir = join(config.projectPath, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    const mainJsPath = join(srcDir, 'main.js');
    try {
      await fs.access(mainJsPath);
    } catch {
      const defaultMainJs = `document.querySelector('#app').innerHTML = \`
  <div>
    <h1>Project ${config.projectId}</h1>
    <p>Development server is running!</p>
  </div>
\`;
`;
      await fs.writeFile(mainJsPath, defaultMainJs);
    }
  }

  /**
   * Starts a Vite dev server for a project
   * @param config Server configuration
   * @returns Promise resolving to server information
   */
  async startServer(config: DevServerConfig): Promise<ServerInfo> {
    // Check if server already running
    if (this.servers.has(config.projectId)) {
      const existing = this.servers.get(config.projectId)!;
      if (existing.info.status === 'running' || existing.info.status === 'starting') {
        this.resetIdleTimer(config.projectId);
        return existing.info;
      }
    }

    // Prepare project directory
    await this.prepareProjectDirectory(config);

    // Allocate port
    const port = config.port || this.allocatePort();
    const host = config.host || this.defaultHost;

    // Verify port is available
    const available = await this.isPortAvailable(port);
    if (!available) {
      this.releasePort(port);
      throw new Error(`Port ${port} is already in use`);
    }

    // Create server info
    const serverInfo: ServerInfo = {
      port,
      url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
      pid: 0,
      status: 'starting',
      startedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      // Spawn Vite process
      const viteProcess = spawn('npx', ['vite', '--port', port.toString(), '--host', host], {
        cwd: config.projectPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          FORCE_COLOR: '1'
        }
      });

      serverInfo.pid = viteProcess.pid || 0;

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.releasePort(port);
          viteProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 30000); // 30 second timeout

      // Handle stdout
      viteProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        this.emit('server:log', {
          projectId: config.projectId,
          level: 'info',
          message: output
        });

        // Detect when server is ready
        if (output.includes('Local:') || output.includes('ready in')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            serverInfo.status = 'running';

            this.servers.set(config.projectId, {
              process: viteProcess,
              info: serverInfo
            });

            this.resetIdleTimer(config.projectId);
            this.emit('server:started', { projectId: config.projectId, ...serverInfo });
            resolve(serverInfo);
          }
        }
      });

      // Handle stderr
      viteProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        this.emit('server:log', {
          projectId: config.projectId,
          level: 'error',
          message: output
        });
      });

      // Handle process errors
      viteProcess.on('error', (error: Error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          this.releasePort(port);
          reject(error);
        }

        serverInfo.status = 'error';
        serverInfo.errorMessage = error.message;
        this.emit('server:error', {
          projectId: config.projectId,
          error: error.message
        });
      });

      // Handle process exit
      viteProcess.on('exit', (code: number | null, signal: string | null) => {
        this.releasePort(port);
        this.servers.delete(config.projectId);
        this.clearIdleTimer(config.projectId);

        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          reject(new Error(`Server exited with code ${code}, signal ${signal}`));
        }

        this.emit('server:stopped', {
          projectId: config.projectId,
          code,
          signal
        });
      });
    });
  }

  /**
   * Stops a running dev server
   * @param projectId Project identifier
   */
  async stopServer(projectId: number): Promise<void> {
    const server = this.servers.get(projectId);
    if (!server) {
      return;
    }

    this.clearIdleTimer(projectId);

    return new Promise((resolve) => {
      const { process: viteProcess, info } = server;

      const timeoutId = setTimeout(() => {
        viteProcess.kill('SIGKILL');
        resolve();
      }, 5000);

      viteProcess.once('exit', () => {
        clearTimeout(timeoutId);
        this.releasePort(info.port);
        this.servers.delete(projectId);
        resolve();
      });

      viteProcess.kill('SIGTERM');
    });
  }

  /**
   * Restarts a dev server
   * @param projectId Project identifier
   * @returns Promise resolving to new server information
   */
  async restartServer(projectId: number): Promise<ServerInfo> {
    const server = this.servers.get(projectId);
    if (!server) {
      throw new Error(`No server found for project ${projectId}`);
    }

    const config: DevServerConfig = {
      projectId,
      userId: 0, // Will need to track this separately if needed
      projectPath: server.process.spawnargs[2] || '', // Extract from process args
      port: server.info.port
    };

    await this.stopServer(projectId);

    // Wait a bit for port to be fully released
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.startServer(config);
  }

  /**
   * Gets the status of a dev server
   * @param projectId Project identifier
   * @returns Server information or null if not found
   */
  getStatus(projectId: number): ServerInfo | null {
    const server = this.servers.get(projectId);
    return server ? { ...server.info } : null;
  }

  /**
   * Gets all active server statuses
   * @returns Map of project IDs to server information
   */
  getAllStatuses(): Map<number, ServerInfo> {
    const statuses = new Map<number, ServerInfo>();
    this.servers.forEach((server, projectId) => {
      statuses.set(projectId, { ...server.info });
    });
    return statuses;
  }

  /**
   * Triggers a hot reload for a project
   * This is typically handled automatically by Vite's HMR
   * @param projectId Project identifier
   */
  async triggerReload(projectId: number): Promise<void> {
    const server = this.servers.get(projectId);
    if (!server) {
      throw new Error(`No server found for project ${projectId}`);
    }

    // Reset idle timer on activity
    this.resetIdleTimer(projectId);

    // Vite handles HMR automatically when files change
    // We can emit an event for logging purposes
    this.emit('server:reload', { projectId });
  }

  /**
   * Stops all running dev servers
   */
  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(projectId =>
      this.stopServer(projectId)
    );
    await Promise.all(stopPromises);
  }

  /**
   * Resets the idle timeout timer for a project
   * @param projectId Project identifier
   */
  private resetIdleTimer(projectId: number): void {
    this.clearIdleTimer(projectId);

    const timer = setTimeout(() => {
      this.handleIdleTimeout(projectId);
    }, this.idleTimeout);

    this.idleTimers.set(projectId, timer);
  }

  /**
   * Clears the idle timeout timer for a project
   * @param projectId Project identifier
   */
  private clearIdleTimer(projectId: number): void {
    const timer = this.idleTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(projectId);
    }
  }

  /**
   * Handles idle timeout for a project
   * @param projectId Project identifier
   */
  private async handleIdleTimeout(projectId: number): Promise<void> {
    this.emit('server:idle', { projectId });
    await this.stopServer(projectId);
  }

  /**
   * Sets up cleanup handlers for graceful shutdown
   */
  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      await this.stopAllServers();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }

  /**
   * Updates the idle timeout duration
   * @param milliseconds Timeout in milliseconds
   */
  setIdleTimeout(milliseconds: number): void {
    this.idleTimeout = milliseconds;
  }

  /**
   * Updates the port range for allocation
   * @param min Minimum port number
   * @param max Maximum port number
   */
  setPortRange(min: number, max: number): void {
    if (min >= max) {
      throw new Error('Minimum port must be less than maximum port');
    }
    if (min < 1024 || max > 65535) {
      throw new Error('Ports must be in range 1024-65535');
    }
    this.portRange = { min, max };
  }
}

// Export singleton instance
export const devServerManager = new DevServerManager();
