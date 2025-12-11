import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { userProfiles, users } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Onboarding Router
 * Handles collection of comprehensive business information during user onboarding
 * for upselling opportunities and customer segmentation
 */

// ========================================
// ENCRYPTION HELPERS
// ========================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "PLACEHOLDER_ENCRYPTION_KEY_REPLACE_ME_32_BYTES_HEX";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data (GHL API key)
 */
function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to encrypt sensitive data",
    });
  }
}

// ========================================
// VALIDATION SCHEMAS
// ========================================

const onboardingDataSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  companyName: z.string().min(1, "Company name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  industry: z.enum([
    "marketing-agency",
    "real-estate",
    "healthcare",
    "ecommerce",
    "saas",
    "other",
  ]),
  monthlyRevenue: z.enum([
    "0-10k",
    "10k-50k",
    "50k-100k",
    "100k-500k",
    "500k+",
  ]),
  employeeCount: z.enum([
    "just-me",
    "2-5",
    "6-20",
    "21-50",
    "50+",
  ]),
  // Website URL is optional - accepts valid URL, empty string, or undefined
  websiteUrl: z.string().url().optional().or(z.literal("")),
  goals: z.array(z.string()).min(1, "At least one goal is required"),
  otherGoal: z.string().optional(),
  // GHL API key is optional - users can add it later from settings
  ghlApiKey: z.string().optional().or(z.literal("")),
});

// ========================================
// ONBOARDING ROUTER
// ========================================

export const onboardingRouter = router({
  /**
   * Submit onboarding data
   * Creates or updates user profile with collected business information
   */
  submit: protectedProcedure
    .input(onboardingDataSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Encrypt the GHL API key only if provided
        const encryptedApiKey = input.ghlApiKey && input.ghlApiKey.trim()
          ? encrypt(input.ghlApiKey)
          : null;

        // Prepare goals array (include other goal if specified)
        const goals = [...input.goals];
        if (input.otherGoal && input.otherGoal.trim()) {
          goals.push(input.otherGoal);
        }

        // Check if profile already exists
        const [existingProfile] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, ctx.user.id))
          .limit(1);

        if (existingProfile) {
          // Update existing profile
          await db
            .update(userProfiles)
            .set({
              companyName: input.companyName,
              industry: input.industry,
              monthlyRevenue: input.monthlyRevenue,
              employeeCount: input.employeeCount,
              website: input.websiteUrl || null,
              phone: input.phoneNumber,
              goals: JSON.stringify(goals),
              ghlApiKey: encryptedApiKey,
              updatedAt: new Date(),
            })
            .where(eq(userProfiles.userId, ctx.user.id));
        } else {
          // Create new profile
          await db.insert(userProfiles).values({
            userId: ctx.user.id,
            companyName: input.companyName,
            industry: input.industry,
            monthlyRevenue: input.monthlyRevenue,
            employeeCount: input.employeeCount,
            website: input.websiteUrl || null,
            phone: input.phoneNumber,
            goals: JSON.stringify(goals),
            ghlApiKey: encryptedApiKey,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Update user's name and mark onboarding as completed
        await db
          .update(users)
          .set({
            name: input.fullName,
            onboardingCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        // TODO: Trigger post-onboarding actions:
        // - Send welcome email with personalized content based on industry/goals
        // - Create initial GHL sub-account discovery job
        // - Notify sales team of high-value lead (based on revenue/employee count)
        // - Set up recommended automation templates based on goals
        // - Track onboarding completion event in analytics

        console.log(`[Onboarding] User ${ctx.user.id} completed onboarding`, {
          companyName: input.companyName,
          industry: input.industry,
          monthlyRevenue: input.monthlyRevenue,
          employeeCount: input.employeeCount,
          goals: goals.length,
        });

        return {
          success: true,
          message: "Onboarding completed successfully",
          data: {
            companyName: input.companyName,
            industry: input.industry,
          },
        };
      } catch (error) {
        console.error("[Onboarding] Error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save onboarding data",
          cause: error,
        });
      }
    }),

  /**
   * Get user profile data
   * Returns existing onboarding data if available
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [profile] = await db
        .select({
          id: userProfiles.id,
          companyName: userProfiles.companyName,
          industry: userProfiles.industry,
          monthlyRevenue: userProfiles.monthlyRevenue,
          employeeCount: userProfiles.employeeCount,
          website: userProfiles.website,
          phone: userProfiles.phone,
          goals: userProfiles.goals,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);

      if (!profile) {
        return {
          exists: false,
          data: null,
        };
      }

      return {
        exists: true,
        data: {
          ...profile,
          goals: typeof profile.goals === "string"
            ? JSON.parse(profile.goals)
            : profile.goals,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch profile",
        cause: error,
      });
    }
  }),

  /**
   * Check onboarding status
   * Returns whether user has completed onboarding
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [user] = await db
        .select({
          onboardingCompleted: users.onboardingCompleted,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      return {
        completed: user?.onboardingCompleted || false,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check onboarding status",
        cause: error,
      });
    }
  }),
});
