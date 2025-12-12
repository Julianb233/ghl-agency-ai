import { z } from "zod";
import { router, adminProcedure } from "../../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../../db";
import { featureFlags, systemConfig } from "../../../../drizzle/schema-admin";
import { eq, desc } from "drizzle-orm";

/**
 * Admin Config Router
 *
 * Provides configuration management capabilities for administrators:
 * - Feature flags (list, create, update, delete, toggle)
 * - System configuration (list, get, upsert, delete)
 * - Maintenance mode management
 *
 * All procedures are protected with adminProcedure middleware
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

// Feature Flags
const createFlagSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  userWhitelist: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateFlagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  userWhitelist: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
});

const deleteFlagSchema = z.object({
  id: z.number().int().positive(),
});

const toggleFlagSchema = z.object({
  id: z.number().int().positive(),
  enabled: z.boolean(),
});

// System Config
const getConfigSchema = z.object({
  key: z.string().min(1).max(100),
});

const upsertConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  description: z.string().optional(),
});

const deleteConfigSchema = z.object({
  key: z.string().min(1).max(100),
});

const setMaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().optional(),
});

// ========================================
// ADMIN CONFIG ROUTER
// ========================================

export const configRouter = router({
  // ========================================
  // FEATURE FLAGS
  // ========================================
  flags: router({
    /**
     * List all feature flags
     */
    list: adminProcedure.query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const flags = await db
          .select()
          .from(featureFlags)
          .orderBy(desc(featureFlags.createdAt));

        return { flags };
      } catch (error) {
        console.error("[Admin] Failed to list feature flags:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list feature flags",
          cause: error,
        });
      }
    }),

    /**
     * Create new feature flag
     */
    create: adminProcedure
      .input(createFlagSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Check if flag with same name already exists
          const [existing] = await db
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.name, input.name))
            .limit(1);

          if (existing) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A feature flag with this name already exists",
            });
          }

          const [flag] = await db
            .insert(featureFlags)
            .values({
              name: input.name,
              description: input.description,
              enabled: input.enabled,
              rolloutPercentage: input.rolloutPercentage,
              userWhitelist: input.userWhitelist || null,
              metadata: input.metadata || null,
            })
            .returning();

          console.log(`[Admin] Feature flag created: ${input.name} by admin ${ctx.user.id}`);

          return {
            success: true,
            flag,
            message: "Feature flag created successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to create feature flag:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create feature flag",
            cause: error,
          });
        }
      }),

    /**
     * Update feature flag
     */
    update: adminProcedure
      .input(updateFlagSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Check if flag exists
          const [existing] = await db
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.id, input.id))
            .limit(1);

          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Feature flag not found",
            });
          }

          // If name is being changed, check it's not already taken
          if (input.name && input.name !== existing.name) {
            const [nameCheck] = await db
              .select()
              .from(featureFlags)
              .where(eq(featureFlags.name, input.name))
              .limit(1);

            if (nameCheck) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A feature flag with this name already exists",
              });
            }
          }

          const updateData: any = {
            updatedAt: new Date(),
          };

          if (input.name !== undefined) updateData.name = input.name;
          if (input.description !== undefined) updateData.description = input.description;
          if (input.enabled !== undefined) updateData.enabled = input.enabled;
          if (input.rolloutPercentage !== undefined) updateData.rolloutPercentage = input.rolloutPercentage;
          if (input.userWhitelist !== undefined) updateData.userWhitelist = input.userWhitelist;
          if (input.metadata !== undefined) updateData.metadata = input.metadata;

          const [flag] = await db
            .update(featureFlags)
            .set(updateData)
            .where(eq(featureFlags.id, input.id))
            .returning();

          console.log(`[Admin] Feature flag updated: ${flag.name} by admin ${ctx.user.id}`);

          return {
            success: true,
            flag,
            message: "Feature flag updated successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to update feature flag:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update feature flag",
            cause: error,
          });
        }
      }),

    /**
     * Delete feature flag
     */
    delete: adminProcedure
      .input(deleteFlagSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Check if flag exists
          const [existing] = await db
            .select()
            .from(featureFlags)
            .where(eq(featureFlags.id, input.id))
            .limit(1);

          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Feature flag not found",
            });
          }

          await db
            .delete(featureFlags)
            .where(eq(featureFlags.id, input.id));

          console.log(`[Admin] Feature flag deleted: ${existing.name} by admin ${ctx.user.id}`);

          return {
            success: true,
            message: "Feature flag deleted successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to delete feature flag:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete feature flag",
            cause: error,
          });
        }
      }),

    /**
     * Quick toggle feature flag enabled status
     */
    toggle: adminProcedure
      .input(toggleFlagSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          const [flag] = await db
            .update(featureFlags)
            .set({
              enabled: input.enabled,
              updatedAt: new Date(),
            })
            .where(eq(featureFlags.id, input.id))
            .returning();

          if (!flag) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Feature flag not found",
            });
          }

          console.log(`[Admin] Feature flag toggled: ${flag.name} to ${input.enabled} by admin ${ctx.user.id}`);

          return {
            success: true,
            flag,
            message: `Feature flag ${input.enabled ? 'enabled' : 'disabled'}`,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to toggle feature flag:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to toggle feature flag",
            cause: error,
          });
        }
      }),
  }),

  // ========================================
  // SYSTEM CONFIG
  // ========================================
  config: router({
    /**
     * List all system configurations
     */
    list: adminProcedure.query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const configs = await db
          .select()
          .from(systemConfig)
          .orderBy(systemConfig.key);

        return { configs };
      } catch (error) {
        console.error("[Admin] Failed to list system configs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list system configurations",
          cause: error,
        });
      }
    }),

    /**
     * Get single system configuration by key
     */
    get: adminProcedure
      .input(getConfigSchema)
      .query(async ({ input }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          const [config] = await db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, input.key))
            .limit(1);

          if (!config) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Configuration not found",
            });
          }

          return { config };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to get system config:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get system configuration",
            cause: error,
          });
        }
      }),

    /**
     * Create or update system configuration
     */
    upsert: adminProcedure
      .input(upsertConfigSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Check if config exists
          const [existing] = await db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, input.key))
            .limit(1);

          let config;
          let isNew = false;

          if (existing) {
            // Update existing
            [config] = await db
              .update(systemConfig)
              .set({
                value: input.value,
                description: input.description,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              })
              .where(eq(systemConfig.key, input.key))
              .returning();
          } else {
            // Create new
            [config] = await db
              .insert(systemConfig)
              .values({
                key: input.key,
                value: input.value,
                description: input.description,
                updatedBy: ctx.user.id,
              })
              .returning();
            isNew = true;
          }

          console.log(`[Admin] System config ${isNew ? 'created' : 'updated'}: ${input.key} by admin ${ctx.user.id}`);

          return {
            success: true,
            config,
            message: `Configuration ${isNew ? 'created' : 'updated'} successfully`,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to upsert system config:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to save configuration",
            cause: error,
          });
        }
      }),

    /**
     * Delete system configuration
     */
    delete: adminProcedure
      .input(deleteConfigSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          // Check if config exists
          const [existing] = await db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, input.key))
            .limit(1);

          if (!existing) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Configuration not found",
            });
          }

          await db
            .delete(systemConfig)
            .where(eq(systemConfig.key, input.key));

          console.log(`[Admin] System config deleted: ${input.key} by admin ${ctx.user.id}`);

          return {
            success: true,
            message: "Configuration deleted successfully",
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to delete system config:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete configuration",
            cause: error,
          });
        }
      }),
  }),

  // ========================================
  // MAINTENANCE MODE
  // ========================================
  maintenance: router({
    /**
     * Get maintenance mode status
     */
    get: adminProcedure.query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const [config] = await db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, "maintenance_mode"))
          .limit(1);

        const enabled = config ? (config.value as any)?.enabled === true : false;
        const message = config ? (config.value as any)?.message : null;

        return {
          enabled,
          message,
        };
      } catch (error) {
        console.error("[Admin] Failed to get maintenance mode:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get maintenance mode status",
          cause: error,
        });
      }
    }),

    /**
     * Set maintenance mode
     */
    set: adminProcedure
      .input(setMaintenanceSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not available",
            });
          }

          const maintenanceValue = {
            enabled: input.enabled,
            message: input.message || "System is currently under maintenance. Please check back later.",
          };

          // Check if config exists
          const [existing] = await db
            .select()
            .from(systemConfig)
            .where(eq(systemConfig.key, "maintenance_mode"))
            .limit(1);

          if (existing) {
            await db
              .update(systemConfig)
              .set({
                value: maintenanceValue,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              })
              .where(eq(systemConfig.key, "maintenance_mode"));
          } else {
            await db
              .insert(systemConfig)
              .values({
                key: "maintenance_mode",
                value: maintenanceValue,
                description: "System maintenance mode configuration",
                updatedBy: ctx.user.id,
              });
          }

          console.log(`[Admin] Maintenance mode ${input.enabled ? 'enabled' : 'disabled'} by admin ${ctx.user.id}`);

          return {
            success: true,
            enabled: input.enabled,
            message: `Maintenance mode ${input.enabled ? 'enabled' : 'disabled'}`,
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("[Admin] Failed to set maintenance mode:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to set maintenance mode",
            cause: error,
          });
        }
      }),
  }),
});
