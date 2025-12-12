/**
 * Ads Service
 * Handles Meta Ads analysis, copy generation, and automation
 */

import OpenAI from 'openai';
import { Stagehand } from '@browserbasehq/stagehand';
import { getBrowserbaseService } from '../_core/browserbase';
import { getDb } from '../db';
import { integrations, jobs } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Initialize OpenAI client (lazy initialization to handle missing API key)
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please set the environment variable.');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Types
export interface AdMetrics {
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  spend?: number;
  conversions?: number;
  roas?: number;
}

export interface AdAnalysisResult {
  metrics: AdMetrics;
  insights: string[];
  suggestions: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface AdCopyVariation {
  headline: string;
  primaryText: string;
  description?: string;
  callToAction?: string;
  reasoning: string;
}

export interface AdRecommendation {
  type: 'copy' | 'targeting' | 'budget' | 'creative' | 'schedule';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  actionable: boolean;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  accountStatus: string;
  currency: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targetingDescription?: string;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  creative?: {
    headline?: string;
    primaryText?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
}

class AdsService {
  /**
   * Analyze ad screenshot using GPT-4 Vision
   */
  async analyzeAdScreenshot(imageUrl: string): Promise<AdAnalysisResult> {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this Facebook/Meta ad screenshot. Extract and analyze:

1. Metrics (if visible): impressions, clicks, CTR, CPC, spend, conversions, ROAS
2. Visual Quality: image/video quality, brand consistency, attention-grabbing elements
3. Copy Analysis: headline effectiveness, primary text clarity, call-to-action strength
4. Audience Engagement: comments sentiment, reactions, shares
5. Performance Insights: what's working, what could be improved
6. Specific Recommendations: actionable improvements ranked by priority

Format your response as JSON with this structure:
{
  "metrics": {
    "impressions": number or null,
    "clicks": number or null,
    "ctr": number or null,
    "cpc": number or null,
    "spend": number or null,
    "conversions": number or null,
    "roas": number or null
  },
  "insights": ["insight 1", "insight 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4 Vision');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse GPT-4 Vision response');
      }

      const result = JSON.parse(jsonMatch[0]) as AdAnalysisResult;
      return result;
    } catch (error) {
      console.error('[AdsService] Failed to analyze ad screenshot:', error);
      throw new Error(
        `Failed to analyze ad screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get AI recommendations for ad improvements
   */
  async getAdRecommendations(
    metrics: AdMetrics,
    adContent?: {
      headline?: string;
      primaryText?: string;
      description?: string;
      targetAudience?: string;
    }
  ): Promise<AdRecommendation[]> {
    try {
      const prompt = `As a Meta Ads expert, analyze this ad performance and provide specific recommendations:

Metrics:
${JSON.stringify(metrics, null, 2)}

Ad Content:
${JSON.stringify(adContent || {}, null, 2)}

Provide 5-7 actionable recommendations to improve ad performance. For each recommendation:
1. Categorize the type (copy, targeting, budget, creative, schedule)
2. Set priority (high, medium, low) based on potential impact
3. Provide clear title and detailed description
4. Estimate expected impact
5. Indicate if it's immediately actionable

Format as JSON array:
[
  {
    "type": "copy" | "targeting" | "budget" | "creative" | "schedule",
    "priority": "high" | "medium" | "low",
    "title": "Clear recommendation title",
    "description": "Detailed description with specific steps",
    "expectedImpact": "Quantified or qualified impact estimate",
    "actionable": true | false
  }
]`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a Meta Ads optimization expert with 10+ years of experience. Provide data-driven, actionable recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse recommendations response');
      }

      const recommendations = JSON.parse(jsonMatch[0]) as AdRecommendation[];
      return recommendations;
    } catch (error) {
      console.error('[AdsService] Failed to get recommendations:', error);
      throw new Error(
        `Failed to get ad recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate ad copy variations using LLM
   */
  async generateAdCopy(
    currentCopy: string,
    options?: {
      targetAudience?: string;
      tone?: string;
      objective?: string;
      variationCount?: number;
    }
  ): Promise<AdCopyVariation[]> {
    try {
      const variationCount = options?.variationCount || 5;
      const targetAudience = options?.targetAudience || 'general audience';
      const tone = options?.tone || 'professional and engaging';
      const objective = options?.objective || 'conversions';

      const prompt = `Generate ${variationCount} variations of this ad copy for A/B testing:

Current Copy:
${currentCopy}

Target Audience: ${targetAudience}
Tone: ${tone}
Objective: ${objective}

For each variation:
1. Create a compelling headline (max 40 characters)
2. Write primary text (125-150 characters for mobile optimization)
3. Add a description if relevant (max 30 characters)
4. Suggest a call-to-action
5. Explain the reasoning/strategy behind the variation

Format as JSON array:
[
  {
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "...",
    "reasoning": "..."
  }
]

Make each variation distinct with different angles: emotional, logical, urgency, social proof, etc.`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert copywriter specializing in Meta Ads with proven track record of high-converting ad copy.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // Higher temperature for more creative variations
        max_tokens: 2500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse ad copy variations response');
      }

      const variations = JSON.parse(jsonMatch[0]) as AdCopyVariation[];
      return variations;
    } catch (error) {
      console.error('[AdsService] Failed to generate ad copy:', error);
      throw new Error(
        `Failed to generate ad copy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List Meta ad accounts (via Meta Graph API)
   */
  async listAdAccounts(userId: number): Promise<MetaAdAccount[]> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get Meta integration for user
      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected');
      }

      const accessToken = metaIntegration[0].accessToken;
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      // Call Meta Graph API
      const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}`);

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (
        data.data?.map((account: any) => ({
          id: account.id,
          name: account.name,
          accountStatus: account.account_status,
          currency: account.currency,
        })) || []
      );
    } catch (error) {
      console.error('[AdsService] Failed to list ad accounts:', error);
      throw new Error(
        `Failed to list ad accounts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get campaigns from Meta
   */
  async getAdCampaigns(adAccountId: string, userId: number): Promise<MetaCampaign[]> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected');
      }

      const accessToken = metaIntegration[0].accessToken;
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (
        data.data?.map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          dailyBudget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : undefined,
          lifetimeBudget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : undefined,
        })) || []
      );
    } catch (error) {
      console.error('[AdsService] Failed to get campaigns:', error);
      throw new Error(`Failed to get campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ad sets from Meta
   */
  async getAdSets(campaignId: string, userId: number): Promise<MetaAdSet[]> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected');
      }

      const accessToken = metaIntegration[0].accessToken;
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (
        data.data?.map((adset: any) => ({
          id: adset.id,
          name: adset.name,
          status: adset.status,
          campaignId: adset.campaign_id,
          dailyBudget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : undefined,
          lifetimeBudget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : undefined,
          targetingDescription: adset.targeting ? JSON.stringify(adset.targeting) : undefined,
        })) || []
      );
    } catch (error) {
      console.error('[AdsService] Failed to get ad sets:', error);
      throw new Error(`Failed to get ad sets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get individual ads from Meta
   */
  async getAds(adSetId: string, userId: number): Promise<MetaAd[]> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected');
      }

      const accessToken = metaIntegration[0].accessToken;
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${adSetId}/ads?fields=id,name,status,adset_id,creative{title,body,image_url,video_id}&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (
        data.data?.map((ad: any) => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          adsetId: ad.adset_id,
          creative: ad.creative
            ? {
                headline: ad.creative.title,
                primaryText: ad.creative.body,
                imageUrl: ad.creative.image_url,
                videoUrl: ad.creative.video_id,
              }
            : undefined,
        })) || []
      );
    } catch (error) {
      console.error('[AdsService] Failed to get ads:', error);
      throw new Error(`Failed to get ads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get ad performance metrics from Meta
   */
  async getAdMetrics(
    adId: string,
    userId: number,
    dateRange?: { since: string; until: string }
  ): Promise<AdMetrics> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected');
      }

      const accessToken = metaIntegration[0].accessToken;
      if (!accessToken) {
        throw new Error('Access token not found');
      }

      let url = `https://graph.facebook.com/v18.0/${adId}/insights?fields=impressions,clicks,ctr,cpc,spend,conversions,actions&access_token=${accessToken}`;

      if (dateRange) {
        url += `&time_range={"since":"${dateRange.since}","until":"${dateRange.until}"}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        return {};
      }

      const insights = data.data[0];
      const conversions = insights.actions?.find((action: any) => action.action_type === 'purchase')?.value || 0;

      return {
        impressions: parseInt(insights.impressions) || 0,
        clicks: parseInt(insights.clicks) || 0,
        ctr: parseFloat(insights.ctr) || 0,
        cpc: parseFloat(insights.cpc) || 0,
        spend: parseFloat(insights.spend) || 0,
        conversions: parseInt(conversions) || 0,
        roas: insights.spend && conversions ? (conversions * 100) / parseFloat(insights.spend) : 0,
      };
    } catch (error) {
      console.error('[AdsService] Failed to get ad metrics:', error);
      throw new Error(`Failed to get ad metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply recommendation via browser automation
   */
  async applyRecommendation(
    userId: number,
    adId: string,
    changes: {
      headline?: string;
      primaryText?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get Meta integration for credentials
      const metaIntegration = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (!metaIntegration || metaIntegration.length === 0) {
        throw new Error('Meta account not connected. Please connect your Meta account first.');
      }

      // Create job for tracking
      const jobResult = await db
        .insert(jobs)
        .values({
          type: 'meta_ad_update',
          status: 'processing',
          payload: JSON.stringify({ adId, changes }),
        })
        .returning();

      const jobId = jobResult[0].id;

      // Create Browserbase session
      const browserbaseService = getBrowserbaseService();
      const session = await browserbaseService.createSession();

      // Initialize Stagehand
      const stagehand = new Stagehand({
        env: 'BROWSERBASE',
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        verbose: 1,
      });

      await stagehand.init({ sessionId: session.id });

      try {
        // Navigate to Meta Ads Manager
        await stagehand.page.goto('https://business.facebook.com/adsmanager');

        // Wait for login or dashboard
        await stagehand.page.waitForLoadState('networkidle');

        // Check if already logged in by looking for Ads Manager interface
        const isLoggedIn = await stagehand.page.evaluate(() => {
          return document.querySelector('[data-testid="ads-manager-app"]') !== null;
        });

        if (!isLoggedIn) {
          // User needs to log in manually - return session for user to complete
          await db
            .update(jobs)
            .set({
              status: 'pending',
              result: JSON.stringify({
                message: 'Please log in to Meta Ads Manager to continue',
                sessionId: session.id,
              }),
            })
            .where(eq(jobs.id, jobId));

          return {
            success: false,
            message: 'Manual login required. Please log in via the provided session.',
            sessionId: session.id,
          };
        }

        // Search for the ad
        await stagehand.act({ action: `Search for ad with ID ${adId}` });

        // Click on the ad to edit
        await stagehand.act({ action: 'Click on the ad to edit it' });

        // Apply changes
        if (changes.headline) {
          await stagehand.act({ action: `Change headline to: ${changes.headline}` });
        }

        if (changes.primaryText) {
          await stagehand.act({ action: `Change primary text to: ${changes.primaryText}` });
        }

        if (changes.description) {
          await stagehand.act({ action: `Change description to: ${changes.description}` });
        }

        // Save changes
        await stagehand.act({ action: 'Click the Save or Publish button' });

        // Wait for confirmation
        await stagehand.page.waitForTimeout(2000);

        // Update job status
        await db
          .update(jobs)
          .set({
            status: 'completed',
            result: JSON.stringify({ success: true, changes }),
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, jobId));

        // Close session
        await stagehand.context.close();

        return {
          success: true,
          message: 'Ad updated successfully',
          sessionId: session.id,
        };
      } catch (error) {
        // Update job with error
        await db
          .update(jobs)
          .set({
            status: 'failed',
            result: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, jobId));

        throw error;
      } finally {
        try {
          await stagehand.context.close();
        } catch (e) {
          console.error('[AdsService] Failed to close Stagehand context:', e);
        }
      }
    } catch (error) {
      console.error('[AdsService] Failed to apply recommendation:', error);
      throw new Error(
        `Failed to apply recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store Meta OAuth credentials
   */
  async connectMetaAccount(
    userId: number,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      // Check if Meta integration already exists
      const existing = await db
        .select()
        .from(integrations)
        .where(eq(integrations.userId, userId))
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing integration
        await db
          .update(integrations)
          .set({
            accessToken,
            refreshToken: refreshToken || null,
            expiresAt,
            isActive: 'true',
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, existing[0].id));
      } else {
        // Create new integration
        await db.insert(integrations).values({
          userId,
          service: 'meta',
          accessToken,
          refreshToken: refreshToken || null,
          expiresAt,
          isActive: 'true',
        });
      }

      console.log(`[AdsService] Meta account connected for user ${userId}`);
    } catch (error) {
      console.error('[AdsService] Failed to connect Meta account:', error);
      throw new Error(
        `Failed to connect Meta account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const adsService = new AdsService();
