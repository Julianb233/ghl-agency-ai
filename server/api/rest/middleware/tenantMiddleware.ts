/**
 * Tenant Isolation Middleware
 * Extracts tenant context from authenticated requests and makes it available throughout request lifecycle
 *
 * This middleware should be used AFTER authentication middleware (authMiddleware)
 * It uses AsyncLocalStorage to maintain tenant context across async operations
 */

import type { Request, Response, NextFunction } from "express";
import { getTenantService, TenantIsolationService } from "../../../services/tenantIsolation.service";
import type { AuthenticatedRequest } from "./authMiddleware";

/**
 * Extended request with tenant context
 */
export interface TenantRequest extends AuthenticatedRequest {
  tenantContext?: {
    userId: number;
    tenantId: string;
    email?: string;
    role?: string;
  };
}

/**
 * Tenant Context Middleware
 *
 * Establishes tenant context from authenticated user for the duration of the request.
 * All downstream operations will have access to tenant context via AsyncLocalStorage.
 *
 * Usage:
 * ```typescript
 * router.use(requireApiKey);        // First: Authenticate
 * router.use(tenantContextMiddleware); // Second: Establish tenant context
 * router.get('/api/v1/data', handler); // Third: Use tenant-aware operations
 * ```
 */
export async function tenantContextMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantService = getTenantService();

    // Check if user is authenticated
    if (!req.user) {
      // No authenticated user - skip tenant context
      // This allows optional auth endpoints to work
      next();
      return;
    }

    // Create tenant context from authenticated user
    const tenantContext = TenantIsolationService.createContext({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      // You can customize tenant ID logic here:
      // - Same as userId (user-based tenancy)
      // - From user profile (organization-based tenancy)
      // - From subdomain (subdomain-based tenancy)
      tenantId: `tenant_${req.user.id}`, // Default: user-based
    });

    // Attach to request for convenience
    req.tenantContext = {
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      email: tenantContext.email,
      role: tenantContext.role,
    };

    // Run the rest of the request within tenant context
    await tenantService.runInTenantContext(tenantContext, async () => {
      // Create a promise wrapper for Express next()
      await new Promise<void>((resolve, reject) => {
        // Store original res.end to ensure we resolve when response completes
        const originalEnd = res.end.bind(res);

        res.end = function (this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
          resolve();
          return originalEnd(chunk, encoding as BufferEncoding, cb);
        } as typeof res.end;

        // Call next middleware
        next();

        // If response is already sent, resolve immediately
        if (res.headersSent) {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Tenant context middleware error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to establish tenant context",
      code: "TENANT_CONTEXT_ERROR",
    });
  }
}

/**
 * Strict Tenant Context Middleware
 *
 * Requires tenant context to be present (authenticated user required)
 * Returns 401 if user is not authenticated
 *
 * Use this for endpoints that absolutely require tenant context
 */
export async function requireTenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required for this endpoint",
      code: "AUTH_REQUIRED",
    });
    return;
  }

  // User exists, proceed with tenant context
  await tenantContextMiddleware(req, res, next);
}

/**
 * Organization-based Tenant Context Middleware
 *
 * For applications with organization/team-based multi-tenancy
 * Extracts tenant ID from organization ID instead of user ID
 *
 * Prerequisites:
 * - User must be authenticated
 * - Organization ID must be provided (via header, query, or JWT claim)
 */
export async function orgBasedTenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Extract organization ID from request
    // This could come from:
    // 1. Custom header: x-organization-id
    // 2. Query parameter: ?orgId=...
    // 3. JWT claim
    // 4. User profile lookup
    const orgId =
      req.headers["x-organization-id"] as string ||
      req.query.orgId as string ||
      undefined;

    if (!orgId) {
      res.status(400).json({
        error: "Bad Request",
        message: "Organization ID required (provide via x-organization-id header)",
        code: "ORG_ID_REQUIRED",
      });
      return;
    }

    // TODO: Validate user has access to this organization
    // const hasAccess = await validateUserOrgAccess(req.user.id, orgId);
    // if (!hasAccess) { ... }

    const tenantService = getTenantService();

    const tenantContext = TenantIsolationService.createContext({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tenantId: `org_${orgId}`, // Organization-based tenant ID
    });

    req.tenantContext = {
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      email: tenantContext.email,
      role: tenantContext.role,
    };

    await tenantService.runInTenantContext(tenantContext, async () => {
      await new Promise<void>((resolve) => {
        const originalEnd = res.end.bind(res);
        res.end = function (this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
          resolve();
          return originalEnd(chunk, encoding as BufferEncoding, cb);
        } as typeof res.end;
        next();
        if (res.headersSent) {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Organization tenant context error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to establish organization context",
      code: "ORG_CONTEXT_ERROR",
    });
  }
}

/**
 * Subdomain-based Tenant Context Middleware
 *
 * For applications with subdomain-based multi-tenancy
 * Extracts tenant ID from subdomain (e.g., acme.app.com -> tenant: acme)
 */
export async function subdomainBasedTenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Extract subdomain from host header
    const host = req.headers.host || "";
    const subdomain = host.split(".")[0];

    // Validate subdomain (exclude common non-tenant subdomains)
    const excludedSubdomains = ["www", "api", "app", "admin", "localhost"];
    if (!subdomain || excludedSubdomains.includes(subdomain)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid or missing subdomain for tenant identification",
        code: "INVALID_SUBDOMAIN",
      });
      return;
    }

    // TODO: Validate subdomain exists and user has access
    // const tenant = await getTenantBySubdomain(subdomain);
    // if (!tenant) { ... }

    const tenantService = getTenantService();

    const tenantContext = TenantIsolationService.createContext({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tenantId: `subdomain_${subdomain}`,
    });

    req.tenantContext = {
      userId: tenantContext.userId,
      tenantId: tenantContext.tenantId,
      email: tenantContext.email,
      role: tenantContext.role,
    };

    await tenantService.runInTenantContext(tenantContext, async () => {
      await new Promise<void>((resolve) => {
        const originalEnd = res.end.bind(res);
        res.end = function (this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
          resolve();
          return originalEnd(chunk, encoding as BufferEncoding, cb);
        } as typeof res.end;
        next();
        if (res.headersSent) {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Subdomain tenant context error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to establish subdomain context",
      code: "SUBDOMAIN_CONTEXT_ERROR",
    });
  }
}
