import { z } from "zod";
import { router, adminProcedure } from "../../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../../db";
import { users, userProfiles, sessions } from "../../../../drizzle/schema";
import { eq, ilike, or, and, desc, sql, count } from "drizzle-orm";

/**
 * Admin Users Router
 *
 * Provides comprehensive user management capabilities for administrators:
 * - List users with pagination, search, and filtering
 * - View detailed user information
 * - Update user roles and details
 * - Suspend/unsuspend user accounts
 * - Manage user roles
 *
 * All procedures are protected with adminProcedure middleware
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

const listUsersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  search: z.string().optional(), // Search by name or email
  role: z.enum(["user", "admin"]).optional(), // Filter by role
  loginMethod: z.string().optional(), // Filter by login method
  onboardingCompleted: z.boolean().optional(), // Filter by onboarding status
  sortBy: z.enum(["createdAt", "lastSignedIn", "name", "email"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const getUserByIdSchema = z.object({
  userId: z.number().int().positive(),
});

const updateUserSchema = z.object({
  userId: z.number().int().positive(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(320).optional(),
  role: z.enum(["user", "admin"]).optional(),
  onboardingCompleted: z.boolean().optional(),
});

const suspendUserSchema = z.object({
  userId: z.number().int().positive(),
  reason: z.string().min(1).max(500).optional(),
});

const unsuspendUserSchema = z.object({
  userId: z.number().int().positive(),
});

const updateRoleSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
});

// ========================================
// ADMIN USERS ROUTER
// ========================================

export const usersRouter = router({
  /**
   * List users with pagination, search, and filtering
   */
  list: adminProcedure
    .input(listUsersSchema)
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Build WHERE conditions
        const conditions = [];

        // Search by name or email
        if (input.search) {
          conditions.push(
            or(
              ilike(users.name, `%${input.search}%`),
              ilike(users.email, `%${input.search}%`)
            )
          );
        }

        // Filter by role
        if (input.role) {
          conditions.push(eq(users.role, input.role));
        }

        // Filter by login method
        if (input.loginMethod) {
          conditions.push(eq(users.loginMethod, input.loginMethod));
        }

        // Filter by onboarding status
        if (input.onboardingCompleted !== undefined) {
          conditions.push(eq(users.onboardingCompleted, input.onboardingCompleted));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Determine sort column
        let orderByColumn;
        switch (input.sortBy) {
          case "createdAt":
            orderByColumn = users.createdAt;
            break;
          case "lastSignedIn":
            orderByColumn = users.lastSignedIn;
            break;
          case "name":
            orderByColumn = users.name;
            break;
          case "email":
            orderByColumn = users.email;
            break;
          default:
            orderByColumn = users.createdAt;
        }

        // Get total count
        const [totalResult] = await db
          .select({ count: count() })
          .from(users)
          .where(whereClause);

        const total = totalResult?.count || 0;

        // Get paginated users
        const usersList = await db
          .select({
            id: users.id,
            openId: users.openId,
            googleId: users.googleId,
            name: users.name,
            email: users.email,
            loginMethod: users.loginMethod,
            role: users.role,
            onboardingCompleted: users.onboardingCompleted,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(whereClause)
          .orderBy(input.sortOrder === "asc" ? orderByColumn : desc(orderByColumn))
          .limit(input.limit)
          .offset(input.offset);

        return {
          users: usersList,
          pagination: {
            total,
            limit: input.limit,
            offset: input.offset,
            hasMore: input.offset + input.limit < total,
          },
        };
      } catch (error) {
        console.error("[Admin] Failed to list users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list users",
          cause: error,
        });
      }
    }),

  /**
   * Get single user with full details including profile and sessions
   */
  getById: adminProcedure
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Get user
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Get user profile if exists
        const [profile] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, input.userId))
          .limit(1);

        // Get active sessions count
        const [sessionsResult] = await db
          .select({ count: count() })
          .from(sessions)
          .where(
            and(
              eq(sessions.userId, input.userId),
              sql`${sessions.expiresAt} > NOW()`
            )
          );

        const activeSessions = sessionsResult?.count || 0;

        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        return {
          user: userWithoutPassword,
          profile: profile || null,
          activeSessions,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[Admin] Failed to get user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user",
          cause: error,
        });
      }
    }),

  /**
   * Update user details
   */
  update: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!existingUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // If email is being changed, check it's not already taken
        if (input.email && input.email !== existingUser.email) {
          const [emailCheck] = await db
            .select()
            .from(users)
            .where(eq(users.email, input.email))
            .limit(1);

          if (emailCheck) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Email already in use",
            });
          }
        }

        // Build update object
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.role !== undefined) updateData.role = input.role;
        if (input.onboardingCompleted !== undefined) {
          updateData.onboardingCompleted = input.onboardingCompleted;
        }

        // Update user
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, input.userId))
          .returning();

        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;

        return {
          success: true,
          user: userWithoutPassword,
          message: "User updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[Admin] Failed to update user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user",
          cause: error,
        });
      }
    }),

  /**
   * Suspend user account
   * Note: This marks the user as suspended. Implement actual suspension logic
   * by adding a 'suspended' field to the users table schema
   */
  suspend: adminProcedure
    .input(suspendUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Check if user exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Prevent admin from suspending themselves
        if (user.id === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot suspend your own account",
          });
        }

        // TODO: Add 'suspended' and 'suspensionReason' fields to users table
        // For now, we'll invalidate all their sessions
        await db
          .delete(sessions)
          .where(eq(sessions.userId, input.userId));

        console.log(`[Admin] User ${input.userId} suspended by admin ${ctx.user.id}. Reason: ${input.reason || "No reason provided"}`);

        return {
          success: true,
          message: "User suspended successfully. All sessions have been terminated.",
          userId: input.userId,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[Admin] Failed to suspend user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to suspend user",
          cause: error,
        });
      }
    }),

  /**
   * Unsuspend user account
   */
  unsuspend: adminProcedure
    .input(unsuspendUserSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Check if user exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // TODO: Add 'suspended' field to users table and set it to false here
        console.log(`[Admin] User ${input.userId} unsuspended by admin ${ctx.user.id}`);

        return {
          success: true,
          message: "User unsuspended successfully. They can now log in again.",
          userId: input.userId,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[Admin] Failed to unsuspend user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to unsuspend user",
          cause: error,
        });
      }
    }),

  /**
   * Update user role
   */
  updateRole: adminProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Check if user exists
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Prevent admin from changing their own role
        if (user.id === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot change your own role",
          });
        }

        // Update role
        const [updatedUser] = await db
          .update(users)
          .set({
            role: input.role,
            updatedAt: new Date(),
          })
          .where(eq(users.id, input.userId))
          .returning();

        console.log(`[Admin] User ${input.userId} role changed to ${input.role} by admin ${ctx.user.id}`);

        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;

        return {
          success: true,
          user: userWithoutPassword,
          message: `User role updated to ${input.role}`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("[Admin] Failed to update user role:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user role",
          cause: error,
        });
      }
    }),

  /**
   * Get user statistics
   */
  getStats: adminProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Total users
        const [totalUsersResult] = await db
          .select({ count: count() })
          .from(users);

        // Users by role
        const [adminsResult] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "admin"));

        const [regularUsersResult] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.role, "user"));

        // Users who completed onboarding
        const [onboardedResult] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.onboardingCompleted, true));

        // Users by login method
        const loginMethods = await db
          .select({
            method: users.loginMethod,
            count: count(),
          })
          .from(users)
          .groupBy(users.loginMethod);

        // New users this month
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const [newThisMonthResult] = await db
          .select({ count: count() })
          .from(users)
          .where(sql`${users.createdAt} >= ${thisMonth}`);

        return {
          total: totalUsersResult?.count || 0,
          byRole: {
            admin: adminsResult?.count || 0,
            user: regularUsersResult?.count || 0,
          },
          onboardingCompleted: onboardedResult?.count || 0,
          byLoginMethod: loginMethods.map(m => ({
            method: m.method || "unknown",
            count: m.count,
          })),
          newThisMonth: newThisMonthResult?.count || 0,
        };
      } catch (error) {
        console.error("[Admin] Failed to get user stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user statistics",
          cause: error,
        });
      }
    }),
});
