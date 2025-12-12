import { router } from "../../../_core/trpc";
import { usersRouter } from "./users";
import { systemRouter } from "./system";
import { auditRouter } from "./audit";
import { configRouter } from "./config";

/**
 * Admin Router Aggregator
 *
 * Combines all admin-related routers into a single namespace:
 * - users: User management (list, update, suspend, roles)
 * - system: System health and monitoring
 * - audit: Audit logs and activity tracking
 * - config: Feature flags, system configuration, and maintenance mode
 *
 * Usage:
 * ```typescript
 * import { adminRouter } from "./routers/admin";
 *
 * const appRouter = router({
 *   admin: adminRouter,
 *   // ... other routers
 * });
 * ```
 *
 * Client usage:
 * ```typescript
 * // List users
 * await trpc.admin.users.list.query({ limit: 20 });
 *
 * // Get system health
 * await trpc.admin.system.getHealth.query();
 *
 * // View audit logs
 * await trpc.admin.audit.list.query({ limit: 50 });
 *
 * // Manage feature flags
 * await trpc.admin.config.flags.list.query();
 * await trpc.admin.config.flags.toggle.mutate({ id: 1, enabled: true });
 * ```
 *
 * All procedures in this router are protected with adminProcedure middleware,
 * which ensures only users with role="admin" can access these endpoints.
 */
export const adminRouter = router({
  users: usersRouter,
  system: systemRouter,
  audit: auditRouter,
  config: configRouter,
});
