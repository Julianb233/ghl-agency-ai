/**
 * Platform Detection Service
 *
 * Detects platforms from user input using:
 * - URL patterns
 * - Keyword matching
 * - Context analysis
 */

import { getDb } from "../db";
import { platformKeywords } from "../../drizzle/schema-rag";
import { eq, and } from "drizzle-orm";

interface DetectOptions {
  prompt: string;
  url?: string;
  context?: string;
}

interface PlatformMatch {
  platform: string;
  confidence: number;
  matchedKeywords: string[];
}

interface DetectionResult {
  platforms: PlatformMatch[];
  primaryPlatform: string | null;
  isDnsRelated: boolean;
  isDomainRelated: boolean;
  isGhlRelated: boolean;
  isGoogleRelated: boolean;
  isAhrefsRelated: boolean;
  isMarketingRelated: boolean;
}

class PlatformDetectionService {
  private static instance: PlatformDetectionService;

  // In-memory keyword cache
  private keywordCache: Map<string, { keyword: string; type: string; priority: number }[]> = new Map();
  private cacheLoaded = false;

  private constructor() {}

  public static getInstance(): PlatformDetectionService {
    if (!PlatformDetectionService.instance) {
      PlatformDetectionService.instance = new PlatformDetectionService();
    }
    return PlatformDetectionService.instance;
  }

  /**
   * Detect platforms from user input
   */
  public async detect(options: DetectOptions): Promise<DetectionResult> {
    // Load keywords if not cached
    if (!this.cacheLoaded) {
      await this.loadKeywordsCache();
    }

    const text = `${options.prompt} ${options.url || ""} ${options.context || ""}`.toLowerCase();
    const platformScores: Map<string, { score: number; keywords: string[] }> = new Map();

    // Check each platform's keywords
    for (const [platform, keywords] of this.keywordCache) {
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const kw of keywords) {
        if (text.includes(kw.keyword.toLowerCase())) {
          score += kw.priority;
          matchedKeywords.push(kw.keyword);
        }
      }

      if (score > 0) {
        platformScores.set(platform, { score, keywords: matchedKeywords });
      }
    }

    // Sort platforms by score
    const platforms: PlatformMatch[] = Array.from(platformScores.entries())
      .map(([platform, data]) => ({
        platform,
        confidence: Math.min(data.score / 10, 1), // Normalize to 0-1
        matchedKeywords: data.keywords,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const primaryPlatform = platforms.length > 0 ? platforms[0].platform : null;

    return {
      platforms,
      primaryPlatform,
      isDnsRelated: platforms.some(p => p.platform === "dns"),
      isDomainRelated: platforms.some(p => p.platform === "domain"),
      isGhlRelated: platforms.some(p => p.platform === "ghl"),
      isGoogleRelated: platforms.some(p => p.platform === "google"),
      isAhrefsRelated: platforms.some(p => p.platform === "ahrefs"),
      isMarketingRelated: platforms.some(p => p.platform === "marketing"),
    };
  }

  /**
   * Load keywords from database into cache
   */
  private async loadKeywordsCache(): Promise<void> {
    const db = await getDb();
    if (!db) {
      // Use default keywords if database not available
      this.loadDefaultKeywords();
      this.cacheLoaded = true;
      return;
    }

    try {
      const keywords = await db
        .select()
        .from(platformKeywords)
        .where(eq(platformKeywords.isActive, true));

      // Group by platform
      this.keywordCache.clear();
      for (const kw of keywords) {
        if (!this.keywordCache.has(kw.platform)) {
          this.keywordCache.set(kw.platform, []);
        }
        this.keywordCache.get(kw.platform)!.push({
          keyword: kw.keyword,
          type: kw.keywordType,
          priority: kw.priority,
        });
      }

      // If no keywords in DB, load defaults
      if (this.keywordCache.size === 0) {
        this.loadDefaultKeywords();
      }

      this.cacheLoaded = true;
    } catch (error) {
      console.error("[PlatformDetection] Failed to load keywords:", error);
      this.loadDefaultKeywords();
      this.cacheLoaded = true;
    }
  }

  /**
   * Load default keywords into cache
   */
  private loadDefaultKeywords(): void {
    // GHL (GoHighLevel) keywords
    this.keywordCache.set("ghl", [
      { keyword: "gohighlevel", type: "keyword", priority: 10 },
      { keyword: "highlevel", type: "keyword", priority: 8 },
      { keyword: "ghl", type: "keyword", priority: 8 },
      { keyword: "pipeline", type: "keyword", priority: 3 },
      { keyword: "workflow", type: "keyword", priority: 3 },
      { keyword: "automation", type: "keyword", priority: 2 },
      { keyword: "crm", type: "keyword", priority: 2 },
      { keyword: "funnel", type: "keyword", priority: 3 },
      { keyword: "snapshot", type: "keyword", priority: 4 },
      { keyword: "subaccount", type: "keyword", priority: 5 },
      { keyword: "agency", type: "keyword", priority: 2 },
      { keyword: "location", type: "keyword", priority: 2 },
      { keyword: "conversation", type: "keyword", priority: 2 },
      { keyword: "opportunity", type: "keyword", priority: 3 },
      { keyword: "contact", type: "keyword", priority: 2 },
      { keyword: "campaign", type: "keyword", priority: 3 },
      { keyword: "trigger", type: "keyword", priority: 3 },
      { keyword: "webhook", type: "keyword", priority: 3 },
      { keyword: "api key", type: "keyword", priority: 4 },
      { keyword: "white label", type: "keyword", priority: 4 },
    ]);

    // Google keywords
    this.keywordCache.set("google", [
      { keyword: "google ads", type: "keyword", priority: 10 },
      { keyword: "google analytics", type: "keyword", priority: 10 },
      { keyword: "ga4", type: "keyword", priority: 8 },
      { keyword: "google search console", type: "keyword", priority: 10 },
      { keyword: "gsc", type: "keyword", priority: 6 },
      { keyword: "google tag manager", type: "keyword", priority: 10 },
      { keyword: "gtm", type: "keyword", priority: 6 },
      { keyword: "google my business", type: "keyword", priority: 8 },
      { keyword: "gmb", type: "keyword", priority: 5 },
      { keyword: "adwords", type: "keyword", priority: 6 },
      { keyword: "ppc", type: "keyword", priority: 3 },
      { keyword: "conversion", type: "keyword", priority: 2 },
      { keyword: "remarketing", type: "keyword", priority: 4 },
      { keyword: "utm", type: "keyword", priority: 4 },
      { keyword: "google business profile", type: "keyword", priority: 8 },
      { keyword: "gbp", type: "keyword", priority: 5 },
    ]);

    // Ahrefs keywords
    this.keywordCache.set("ahrefs", [
      { keyword: "ahrefs", type: "keyword", priority: 10 },
      { keyword: "backlink", type: "keyword", priority: 4 },
      { keyword: "domain rating", type: "keyword", priority: 5 },
      { keyword: "dr", type: "keyword", priority: 2 },
      { keyword: "url rating", type: "keyword", priority: 4 },
      { keyword: "referring domain", type: "keyword", priority: 5 },
      { keyword: "keyword difficulty", type: "keyword", priority: 4 },
      { keyword: "content gap", type: "keyword", priority: 5 },
      { keyword: "site explorer", type: "keyword", priority: 6 },
      { keyword: "keyword explorer", type: "keyword", priority: 6 },
      { keyword: "site audit", type: "keyword", priority: 5 },
      { keyword: "rank tracker", type: "keyword", priority: 5 },
      { keyword: "competitor analysis", type: "keyword", priority: 3 },
      { keyword: "organic traffic", type: "keyword", priority: 3 },
    ]);

    // Marketing keywords
    this.keywordCache.set("marketing", [
      { keyword: "marketing", type: "keyword", priority: 5 },
      { keyword: "seo", type: "keyword", priority: 5 },
      { keyword: "sem", type: "keyword", priority: 4 },
      { keyword: "content marketing", type: "keyword", priority: 5 },
      { keyword: "email marketing", type: "keyword", priority: 5 },
      { keyword: "social media", type: "keyword", priority: 4 },
      { keyword: "lead generation", type: "keyword", priority: 5 },
      { keyword: "conversion rate", type: "keyword", priority: 4 },
      { keyword: "landing page", type: "keyword", priority: 4 },
      { keyword: "a/b test", type: "keyword", priority: 4 },
      { keyword: "roi", type: "keyword", priority: 3 },
      { keyword: "kpi", type: "keyword", priority: 3 },
      { keyword: "ctr", type: "keyword", priority: 3 },
      { keyword: "cpc", type: "keyword", priority: 3 },
      { keyword: "cpa", type: "keyword", priority: 3 },
      { keyword: "roas", type: "keyword", priority: 4 },
      { keyword: "funnel", type: "keyword", priority: 3 },
      { keyword: "customer journey", type: "keyword", priority: 4 },
      { keyword: "persona", type: "keyword", priority: 3 },
      { keyword: "brand awareness", type: "keyword", priority: 3 },
    ]);

    // DNS keywords
    this.keywordCache.set("dns", [
      { keyword: "dns", type: "keyword", priority: 8 },
      { keyword: "a record", type: "keyword", priority: 6 },
      { keyword: "cname", type: "keyword", priority: 6 },
      { keyword: "mx record", type: "keyword", priority: 6 },
      { keyword: "txt record", type: "keyword", priority: 6 },
      { keyword: "nameserver", type: "keyword", priority: 5 },
      { keyword: "ns record", type: "keyword", priority: 5 },
      { keyword: "spf", type: "keyword", priority: 5 },
      { keyword: "dkim", type: "keyword", priority: 5 },
      { keyword: "dmarc", type: "keyword", priority: 5 },
      { keyword: "propagation", type: "keyword", priority: 4 },
      { keyword: "ttl", type: "keyword", priority: 4 },
      { keyword: "dig", type: "keyword", priority: 4 },
      { keyword: "nslookup", type: "keyword", priority: 4 },
    ]);

    // Domain keywords
    this.keywordCache.set("domain", [
      { keyword: "domain", type: "keyword", priority: 5 },
      { keyword: "registrar", type: "keyword", priority: 5 },
      { keyword: "transfer", type: "keyword", priority: 3 },
      { keyword: "whois", type: "keyword", priority: 5 },
      { keyword: "epp code", type: "keyword", priority: 6 },
      { keyword: "auth code", type: "keyword", priority: 5 },
      { keyword: "domain lock", type: "keyword", priority: 5 },
      { keyword: "renewal", type: "keyword", priority: 3 },
      { keyword: "expiration", type: "keyword", priority: 3 },
      { keyword: "subdomain", type: "keyword", priority: 4 },
    ]);

    // Stagehand keywords
    this.keywordCache.set("stagehand", [
      { keyword: "stagehand", type: "keyword", priority: 10 },
      { keyword: "browserbase", type: "keyword", priority: 8 },
      { keyword: "browser automation", type: "keyword", priority: 5 },
      { keyword: "web scraping", type: "keyword", priority: 4 },
      { keyword: "playwright", type: "keyword", priority: 4 },
      { keyword: "puppeteer", type: "keyword", priority: 3 },
    ]);
  }

  /**
   * Seed platform keywords to database
   */
  public async seedPlatformKeywords(): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    this.loadDefaultKeywords();

    for (const [platform, keywords] of this.keywordCache) {
      for (const kw of keywords) {
        try {
          await db.insert(platformKeywords).values({
            platform,
            keyword: kw.keyword,
            keywordType: kw.type,
            priority: kw.priority,
          }).onConflictDoNothing();
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    console.log("[PlatformDetection] Platform keywords seeded successfully");
  }

  /**
   * Clear the keyword cache (for testing or refresh)
   */
  public clearCache(): void {
    this.keywordCache.clear();
    this.cacheLoaded = false;
  }
}

// Export singleton instance
export const platformDetectionService = PlatformDetectionService.getInstance();

// Export class for testing
export { PlatformDetectionService };
