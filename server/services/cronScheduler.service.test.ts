/**
 * Cron Scheduler Service Tests
 * Demonstrates usage of the cron scheduler service
 */

import { describe, it, expect } from "vitest";
import { cronSchedulerService } from "./cronScheduler.service";

describe("CronSchedulerService", () => {
  describe("validateCronExpression", () => {
    it("should validate correct cron expressions", () => {
      const validExpressions = [
        "0 0 * * *", // Daily at midnight
        "0 12 * * *", // Daily at noon
        "0 9 * * 1", // Every Monday at 9am
        "0 0 1 * *", // First day of month at midnight
        "*/15 * * * *", // Every 15 minutes
        "0 0 * * 0", // Every Sunday at midnight
      ];

      validExpressions.forEach((expression) => {
        const result = cronSchedulerService.validateCronExpression(expression);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it("should reject invalid cron expressions", () => {
      const invalidExpressions = [
        "invalid",
        "0 0 0 0 0",
        "60 * * * *", // Invalid minute
        "* * 32 * *", // Invalid day
        "* * * 13 *", // Invalid month
      ];

      invalidExpressions.forEach((expression) => {
        const result = cronSchedulerService.validateCronExpression(expression);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe("parseCronExpression", () => {
    it("should parse cron expression into fields", () => {
      const expression = "0 12 * * 1";
      const parsed = cronSchedulerService.parseCronExpression(expression);

      expect(parsed).toBeDefined();
      expect(parsed?.expression).toBe(expression);
      expect(parsed?.minute).toBe("0");
      expect(parsed?.hour).toBe("12");
      expect(parsed?.dayOfWeek).toBe("1");
    });

    it("should return null for invalid expression", () => {
      const parsed = cronSchedulerService.parseCronExpression("invalid");
      expect(parsed).toBeNull();
    });
  });

  describe("describeCronExpression", () => {
    it("should generate human-readable descriptions", () => {
      const testCases = [
        { expression: "0 0 * * *", expectedSubstring: "00:00" },
        { expression: "0 12 * * *", expectedSubstring: "12:00" },
        { expression: "0 9 * * 1", expectedSubstring: "Monday" },
        { expression: "*/15 * * * *", expectedSubstring: "15" },
      ];

      testCases.forEach(({ expression, expectedSubstring }) => {
        const description = cronSchedulerService.describeCronExpression(expression);
        expect(description.toLowerCase()).toContain(expectedSubstring.toLowerCase());
      });
    });

    it("should fallback to expression for invalid input", () => {
      const invalid = "invalid expression";
      const description = cronSchedulerService.describeCronExpression(invalid);
      expect(description).toBe(invalid);
    });
  });

  describe("getNextRunTime", () => {
    it("should calculate next run time", () => {
      const expression = "0 12 * * *"; // Daily at noon
      const nextRun = cronSchedulerService.getNextRunTime(expression, "UTC");

      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun).not.toBeNull();

      if (nextRun) {
        expect(nextRun.getUTCHours()).toBe(12);
        expect(nextRun.getUTCMinutes()).toBe(0);
      }
    });

    it("should handle timezone", () => {
      const expression = "0 12 * * *"; // Daily at noon
      const nextRunUTC = cronSchedulerService.getNextRunTime(expression, "UTC");
      const nextRunEST = cronSchedulerService.getNextRunTime(expression, "America/New_York");

      expect(nextRunUTC).toBeInstanceOf(Date);
      expect(nextRunEST).toBeInstanceOf(Date);
      expect(nextRunUTC).not.toEqual(nextRunEST);
    });

    it("should return null for invalid expression", () => {
      const nextRun = cronSchedulerService.getNextRunTime("invalid", "UTC");
      expect(nextRun).toBeNull();
    });
  });

  describe("getNextNRunTimes", () => {
    it("should calculate next N run times", () => {
      const expression = "0 12 * * *"; // Daily at noon
      const count = 5;
      const runTimes = cronSchedulerService.getNextNRunTimes(expression, count, "UTC");

      expect(runTimes).toHaveLength(count);

      // Verify each run time is at noon
      runTimes.forEach((runTime) => {
        expect(runTime).toBeInstanceOf(Date);
        expect(runTime.getUTCHours()).toBe(12);
        expect(runTime.getUTCMinutes()).toBe(0);
      });

      // Verify run times are in ascending order
      for (let i = 1; i < runTimes.length; i++) {
        expect(runTimes[i].getTime()).toBeGreaterThan(runTimes[i - 1].getTime());
      }
    });

    it("should return empty array for invalid expression", () => {
      const runTimes = cronSchedulerService.getNextNRunTimes("invalid", 5, "UTC");
      expect(runTimes).toEqual([]);
    });
  });

  describe("scheduleTypeToCron", () => {
    it("should convert daily schedule", () => {
      const cron = cronSchedulerService.scheduleTypeToCron("daily", {
        hour: 9,
        minute: 30,
      });

      expect(cron).toBe("30 9 * * *");
    });

    it("should convert weekly schedule", () => {
      const cron = cronSchedulerService.scheduleTypeToCron("weekly", {
        hour: 10,
        minute: 0,
        dayOfWeek: 1, // Monday
      });

      expect(cron).toBe("0 10 * * 1");
    });

    it("should convert monthly schedule", () => {
      const cron = cronSchedulerService.scheduleTypeToCron("monthly", {
        hour: 8,
        minute: 0,
        dayOfMonth: 15,
      });

      expect(cron).toBe("0 8 15 * *");
    });

    it("should use default values when config is not provided", () => {
      const cron = cronSchedulerService.scheduleTypeToCron("daily");
      expect(cron).toBe("0 0 * * *");
    });
  });

  describe("isTimeToRun", () => {
    it("should return true when task never ran and time has passed", () => {
      // Create a cron expression for a time that has passed today
      const now = new Date();
      const pastTime = new Date(now.getTime() - 5 * 60 * 1000);
      const minute = pastTime.getUTCMinutes();
      const hour = pastTime.getUTCHours();
      const expression = `${minute} ${hour} * * *`;

      // Set lastRun to before the scheduled time (so it should run)
      const lastRun = new Date(pastTime);
      lastRun.setUTCHours(lastRun.getUTCHours() - 1);

      const shouldRun = cronSchedulerService.isTimeToRun(expression, lastRun, "UTC");
      expect(shouldRun).toBe(true);
    });

    it("should return false when next run is in future", () => {
      // Create a cron that runs in 5 minutes
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      const minute = fiveMinutesFromNow.getUTCMinutes();
      const hour = fiveMinutesFromNow.getUTCHours();
      const expression = `${minute} ${hour} * * *`;

      const shouldRun = cronSchedulerService.isTimeToRun(expression, null, "UTC");
      expect(shouldRun).toBe(false);
    });

    it("should handle last run time", () => {
      const expression = "0 12 * * *"; // Daily at noon
      const lastRun = new Date();
      lastRun.setUTCHours(12, 0, 0, 0);
      lastRun.setDate(lastRun.getDate() - 1); // Yesterday

      const shouldRun = cronSchedulerService.isTimeToRun(expression, lastRun, "UTC");

      // Should run if current time is past noon, otherwise should not
      const now = new Date();
      if (now.getUTCHours() >= 12) {
        expect(shouldRun).toBe(true);
      } else {
        expect(shouldRun).toBe(false);
      }
    });
  });

  describe("getScheduleDescription", () => {
    it("should describe daily schedule", () => {
      const description = cronSchedulerService.getScheduleDescription("daily", {
        hour: 9,
        minute: 30,
      });

      expect(description).toBe("Daily at 09:30");
    });

    it("should describe weekly schedule", () => {
      const description = cronSchedulerService.getScheduleDescription("weekly", {
        hour: 10,
        minute: 0,
        dayOfWeek: 1, // Monday
      });

      expect(description).toBe("Every Monday at 10:00");
    });

    it("should describe monthly schedule", () => {
      const description = cronSchedulerService.getScheduleDescription("monthly", {
        hour: 8,
        minute: 15,
        dayOfMonth: 1,
      });

      expect(description).toBe("Monthly on the 1st at 08:15");
    });

    it("should handle different ordinal suffixes", () => {
      const testCases = [
        { day: 1, suffix: "st" },
        { day: 2, suffix: "nd" },
        { day: 3, suffix: "rd" },
        { day: 4, suffix: "th" },
        { day: 11, suffix: "th" },
        { day: 21, suffix: "st" },
        { day: 22, suffix: "nd" },
        { day: 23, suffix: "rd" },
      ];

      testCases.forEach(({ day, suffix }) => {
        const description = cronSchedulerService.getScheduleDescription("monthly", {
          hour: 8,
          minute: 0,
          dayOfMonth: day,
        });

        expect(description).toContain(`${day}${suffix}`);
      });
    });
  });

  describe("willEverRun", () => {
    it("should return true for valid expressions", () => {
      const validExpressions = [
        "0 0 * * *",
        "0 12 * * 1",
        "*/15 * * * *",
      ];

      validExpressions.forEach((expression) => {
        const willRun = cronSchedulerService.willEverRun(expression, "UTC");
        expect(willRun).toBe(true);
      });
    });

    it("should return false for impossible expressions", () => {
      const impossibleExpressions = [
        "0 0 31 2 *", // Feb 31st (doesn't exist)
        "0 0 30 2 *", // Feb 30th (doesn't exist)
      ];

      impossibleExpressions.forEach((expression) => {
        const willRun = cronSchedulerService.willEverRun(expression, "UTC");
        expect(willRun).toBe(false);
      });
    });
  });

  describe("getTimeUntilNextRun", () => {
    it("should calculate time until next run", () => {
      // Create a cron that runs at the next hour
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const expression = `0 ${nextHour.getUTCHours()} * * *`;

      const timeUntil = cronSchedulerService.getTimeUntilNextRun(expression, "UTC");

      expect(timeUntil).not.toBeNull();
      if (timeUntil !== null) {
        expect(timeUntil).toBeGreaterThan(0);
        expect(timeUntil).toBeLessThanOrEqual(60 * 60 * 1000); // Less than 1 hour
      }
    });

    it("should return null for invalid expression", () => {
      const timeUntil = cronSchedulerService.getTimeUntilNextRun("invalid", "UTC");
      expect(timeUntil).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle every minute expression", () => {
      const expression = "* * * * *";
      const nextRun = cronSchedulerService.getNextRunTime(expression, "UTC");

      expect(nextRun).not.toBeNull();
      if (nextRun) {
        const now = new Date();
        const diffMs = nextRun.getTime() - now.getTime();
        expect(diffMs).toBeLessThan(60000); // Less than 1 minute
      }
    });

    it("should handle complex expressions with ranges", () => {
      const expression = "0 9-17 * * 1-5"; // Weekdays 9am-5pm
      const validation = cronSchedulerService.validateCronExpression(expression);
      expect(validation.valid).toBe(true);

      const nextRun = cronSchedulerService.getNextRunTime(expression, "UTC");
      expect(nextRun).not.toBeNull();

      if (nextRun) {
        const dayOfWeek = nextRun.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);

        const hour = nextRun.getUTCHours();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThanOrEqual(17);
      }
    });

    it("should handle step values", () => {
      const expression = "*/30 * * * *"; // Every 30 minutes
      const runTimes = cronSchedulerService.getNextNRunTimes(expression, 3, "UTC");

      expect(runTimes).toHaveLength(3);

      // Each run should be 30 minutes apart
      for (let i = 1; i < runTimes.length; i++) {
        const diff = runTimes[i].getTime() - runTimes[i - 1].getTime();
        expect(diff).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
      }
    });

    it("should handle DST transitions", () => {
      // Test with timezone that observes DST
      const expression = "0 2 * * *"; // 2 AM daily
      const nextRun = cronSchedulerService.getNextRunTime(expression, "America/New_York");

      expect(nextRun).not.toBeNull();
      expect(nextRun).toBeInstanceOf(Date);
    });
  });
});
