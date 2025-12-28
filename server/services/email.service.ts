/**
 * Email Integration Service
 *
 * Handles OAuth flows, email fetching, and AI-powered draft generation
 * for Gmail and Outlook email providers.
 *
 * Features:
 * - OAuth 2.0 authentication for Gmail and Outlook
 * - Token refresh and management
 * - Email fetching with pagination and sync cursors
 * - AI-powered sentiment analysis
 * - AI-powered draft response generation
 * - Email sending via provider APIs
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for service protection
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { Client } from "@microsoft/microsoft-graph-client";
import { TRPCError } from "@trpc/server";
import * as crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { withRetry, DEFAULT_RETRY_OPTIONS } from '../lib/retry';
import { circuitBreakers } from '../lib/circuitBreaker';
import { serviceLoggers } from '../lib/logger';

const logger = serviceLoggers.email;

/**
 * Email provider type
 */
export type EmailProvider = "gmail" | "outlook";

/**
 * OAuth configuration
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Email account info
 */
interface EmailAccountInfo {
  email: string;
  name?: string;
  provider: EmailProvider;
  metadata?: Record<string, any>;
}

/**
 * Email message structure
 */
interface EmailAddress {
  name?: string;
  email: string;
}

interface EmailMessage {
  messageId: string;
  threadId?: string;
  subject?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  date: Date;
  body?: string;
  bodyType?: "html" | "text";
  snippet?: string;
  labels?: string[];
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
  }>;
  headers?: Record<string, string>;
  rawData?: any;
}

/**
 * Email sync result
 */
interface SyncResult {
  emails: EmailMessage[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Draft generation options
 */
interface DraftOptions {
  tone?: "professional" | "casual" | "friendly";
  model?: "gpt-4" | "gpt-4-turbo" | "claude-3-opus" | "claude-3-sonnet";
  context?: string;
}

/**
 * Sentiment analysis result
 */
interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  score: number; // -100 to 100
  importance: "high" | "medium" | "low";
  requiresResponse: boolean;
  category?: string;
}

/**
 * Email Service Class
 */
export class EmailService {
  private gmailConfig: OAuthConfig;
  private outlookConfig: OAuthConfig;
  private anthropicClient?: Anthropic;
  private openaiClient?: OpenAI;
  private encryptionKey: string;

  constructor() {
    // Gmail OAuth config
    this.gmailConfig = {
      clientId: process.env.GMAIL_CLIENT_ID || "",
      clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
      redirectUri: process.env.GMAIL_REDIRECT_URI || `${process.env.APP_URL}/api/oauth/gmail/callback`,
    };

    // Outlook OAuth config
    this.outlookConfig = {
      clientId: process.env.OUTLOOK_CLIENT_ID || "",
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || "",
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || `${process.env.APP_URL}/api/oauth/outlook/callback`,
    };

    // Encryption key for token storage
    this.encryptionKey = process.env.ENCRYPTION_KEY || "";

    // Initialize AI clients
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  // ========================================
  // ENCRYPTION HELPERS
  // ========================================

  private encrypt(text: string): string {
    if (!this.encryptionKey || this.encryptionKey.length !== 64) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Encryption key not configured",
      });
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(this.encryptionKey, "hex"),
      iv
    );

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey || this.encryptionKey.length !== 64) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Encryption key not configured",
      });
    }

    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(this.encryptionKey, "hex"),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  // ========================================
  // OAUTH FLOWS
  // ========================================

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(provider: EmailProvider, state: string): string {
    if (provider === "gmail") {
      const oauth2Client = new OAuth2Client(
        this.gmailConfig.clientId,
        this.gmailConfig.clientSecret,
        this.gmailConfig.redirectUri
      );

      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ];

      return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        state: state,
        prompt: "consent", // Force consent to get refresh token
      });
    } else if (provider === "outlook") {
      const scopes = [
        "offline_access",
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/Mail.ReadWrite",
        "https://graph.microsoft.com/User.Read",
      ];

      const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      authUrl.searchParams.set("client_id", this.outlookConfig.clientId);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", this.outlookConfig.redirectUri);
      authUrl.searchParams.set("response_mode", "query");
      authUrl.searchParams.set("scope", scopes.join(" "));
      authUrl.searchParams.set("state", state);

      return authUrl.toString();
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported email provider: ${provider}`,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(
    provider: EmailProvider,
    code: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string;
    accountInfo: EmailAccountInfo;
  }> {
    if (provider === "gmail") {
      return this.handleGmailCallback(code);
    } else if (provider === "outlook") {
      return this.handleOutlookCallback(code);
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported email provider: ${provider}`,
    });
  }

  private async handleGmailCallback(code: string) {
    return await circuitBreakers.gmail.execute(async () => {
      return await withRetry(async () => {
        const oauth2Client = new OAuth2Client(
          this.gmailConfig.clientId,
          this.gmailConfig.clientSecret,
          this.gmailConfig.redirectUri
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.refresh_token) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to obtain tokens from Gmail",
          });
        }

        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expiry_date || 3600));

        return {
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          expiresAt,
          scope: tokens.scope || "",
          accountInfo: {
            email: userInfo.data.email || "",
            name: userInfo.data.name || undefined,
            provider: "gmail" as EmailProvider,
            metadata: {
              picture: userInfo.data.picture,
              locale: userInfo.data.locale,
            },
          },
        };
      }, DEFAULT_RETRY_OPTIONS);
    });
  }

  private async handleOutlookCallback(code: string) {
    return await circuitBreakers.outlook.execute(async () => {
      return await withRetry(async () => {
        // Exchange code for tokens
        const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
        const params = new URLSearchParams({
          client_id: this.outlookConfig.clientId,
          client_secret: this.outlookConfig.clientSecret,
          code: code,
          redirect_uri: this.outlookConfig.redirectUri,
          grant_type: "authorization_code",
        });

        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (!response.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to obtain tokens from Outlook",
          });
        }

        const tokens = await response.json();

        if (!tokens.access_token || !tokens.refresh_token) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Invalid token response from Outlook",
          });
        }

        // Get user info using Microsoft Graph
        const client = Client.init({
          authProvider: (done) => {
            done(null, tokens.access_token);
          },
        });

        const user = await client.api("/me").get();

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

        return {
          accessToken: this.encrypt(tokens.access_token),
          refreshToken: this.encrypt(tokens.refresh_token),
          expiresAt,
          scope: tokens.scope || "",
          accountInfo: {
            email: user.mail || user.userPrincipalName || "",
            name: user.displayName || undefined,
            provider: "outlook" as EmailProvider,
            metadata: {
              jobTitle: user.jobTitle,
              officeLocation: user.officeLocation,
            },
          },
        };
      }, DEFAULT_RETRY_OPTIONS);
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    provider: EmailProvider,
    encryptedRefreshToken: string
  ): Promise<{
    accessToken: string;
    expiresAt: Date;
  }> {
    const refreshToken = this.decrypt(encryptedRefreshToken);

    if (provider === "gmail") {
      return await circuitBreakers.gmail.execute(async () => {
        return await withRetry(async () => {
          const oauth2Client = new OAuth2Client(
            this.gmailConfig.clientId,
            this.gmailConfig.clientSecret,
            this.gmailConfig.redirectUri
          );

          oauth2Client.setCredentials({ refresh_token: refreshToken });
          const { credentials } = await oauth2Client.refreshAccessToken();

          if (!credentials.access_token) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to refresh Gmail token",
            });
          }

          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + (credentials.expiry_date || 3600));

          return {
            accessToken: this.encrypt(credentials.access_token),
            expiresAt,
          };
        }, DEFAULT_RETRY_OPTIONS);
      });
    } else if (provider === "outlook") {
      return await circuitBreakers.outlook.execute(async () => {
        return await withRetry(async () => {
          const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
          const params = new URLSearchParams({
            client_id: this.outlookConfig.clientId,
            client_secret: this.outlookConfig.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          });

          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (!response.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to refresh Outlook token",
            });
          }

          const tokens = await response.json();

          if (!tokens.access_token) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Invalid token response from Outlook",
            });
          }

          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in || 3600));

          return {
            accessToken: this.encrypt(tokens.access_token),
            expiresAt,
          };
        }, DEFAULT_RETRY_OPTIONS);
      });
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported email provider: ${provider}`,
    });
  }

  // ========================================
  // EMAIL FETCHING
  // ========================================

  /**
   * Fetch emails from provider
   */
  async fetchEmails(
    provider: EmailProvider,
    encryptedAccessToken: string,
    options: {
      maxResults?: number;
      cursor?: string;
      query?: string;
      unreadOnly?: boolean;
    } = {}
  ): Promise<SyncResult> {
    const accessToken = this.decrypt(encryptedAccessToken);

    if (provider === "gmail") {
      return this.fetchGmailEmails(accessToken, options);
    } else if (provider === "outlook") {
      return this.fetchOutlookEmails(accessToken, options);
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported email provider: ${provider}`,
    });
  }

  private async fetchGmailEmails(
    accessToken: string,
    options: {
      maxResults?: number;
      cursor?: string;
      query?: string;
      unreadOnly?: boolean;
    }
  ): Promise<SyncResult> {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Build query
    let q = options.query || "";
    if (options.unreadOnly) {
      q = q ? `${q} is:unread` : "is:unread";
    }

    // List messages
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: options.maxResults || 50,
      pageToken: options.cursor,
      q: q || undefined,
    });

    const messages = response.data.messages || [];
    const emails: EmailMessage[] = [];

    // Fetch full message details
    for (const msg of messages) {
      if (!msg.id) continue;

      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const email = this.parseGmailMessage(fullMsg.data);
      if (email) {
        emails.push(email);
      }
    }

    return {
      emails,
      nextCursor: response.data.nextPageToken || undefined,
      hasMore: !!response.data.nextPageToken,
    };
  }

  private parseGmailMessage(message: any): EmailMessage | null {
    if (!message.id) return null;

    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const parseAddresses = (headerValue?: string): EmailAddress[] => {
      if (!headerValue) return [];
      return headerValue.split(",").map((addr) => {
        const match = addr.match(/(.*?)\s*<(.+?)>/) || [null, addr.trim(), addr.trim()];
        return {
          name: match[1]?.trim() || undefined,
          email: match[2].trim(),
        };
      });
    };

    // Get body
    let body = "";
    let bodyType: "html" | "text" = "text";

    const getBody = (part: any): void => {
      if (part.mimeType === "text/html" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        bodyType = "html";
      } else if (part.mimeType === "text/plain" && part.body?.data && !body) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8");
        bodyType = "text";
      }

      if (part.parts) {
        part.parts.forEach(getBody);
      }
    };

    if (message.payload) {
      getBody(message.payload);
    }

    // Get attachments
    const attachments: any[] = [];
    const getAttachments = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        part.parts.forEach(getAttachments);
      }
    };

    if (message.payload) {
      getAttachments(message.payload);
    }

    return {
      messageId: message.id,
      threadId: message.threadId,
      subject: getHeader("Subject"),
      from: parseAddresses(getHeader("From"))[0] || { email: "" },
      to: parseAddresses(getHeader("To")),
      cc: parseAddresses(getHeader("Cc")),
      replyTo: parseAddresses(getHeader("Reply-To")),
      date: new Date(parseInt(message.internalDate)),
      body,
      bodyType,
      snippet: message.snippet,
      labels: message.labelIds || [],
      isRead: !message.labelIds?.includes("UNREAD"),
      isStarred: message.labelIds?.includes("STARRED") || false,
      hasAttachments: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments : undefined,
      headers: Object.fromEntries(headers.map((h: any) => [h.name, h.value])),
      rawData: message,
    };
  }

  private async fetchOutlookEmails(
    accessToken: string,
    options: {
      maxResults?: number;
      cursor?: string;
      query?: string;
      unreadOnly?: boolean;
    }
  ): Promise<SyncResult> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    let query = client.api("/me/messages").top(options.maxResults || 50).orderby("receivedDateTime DESC");

    if (options.unreadOnly) {
      query = query.filter("isRead eq false");
    }

    if (options.cursor) {
      // Use skip token for pagination
      query = query.skipToken(options.cursor);
    }

    const response = await query.get();

    const emails: EmailMessage[] = response.value.map((msg: any) => {
      const parseAddresses = (addrs: any[]): EmailAddress[] => {
        if (!addrs) return [];
        return addrs.map((a) => ({
          name: a.emailAddress.name || undefined,
          email: a.emailAddress.address,
        }));
      };

      return {
        messageId: msg.id,
        threadId: msg.conversationId,
        subject: msg.subject,
        from: {
          name: msg.from?.emailAddress?.name,
          email: msg.from?.emailAddress?.address || "",
        },
        to: parseAddresses(msg.toRecipients),
        cc: parseAddresses(msg.ccRecipients),
        bcc: parseAddresses(msg.bccRecipients),
        replyTo: parseAddresses(msg.replyTo),
        date: new Date(msg.receivedDateTime),
        body: msg.body?.content,
        bodyType: msg.body?.contentType?.toLowerCase() === "html" ? "html" : "text",
        snippet: msg.bodyPreview,
        labels: msg.categories || [],
        isRead: msg.isRead || false,
        isStarred: msg.flag?.flagStatus === "flagged",
        hasAttachments: msg.hasAttachments || false,
        rawData: msg,
      };
    });

    return {
      emails,
      nextCursor: response["@odata.nextLink"]?.split("skiptoken=")[1],
      hasMore: !!response["@odata.nextLink"],
    };
  }

  // ========================================
  // EMAIL SENDING
  // ========================================

  /**
   * Send email via provider
   */
  async sendEmail(
    provider: EmailProvider,
    encryptedAccessToken: string,
    email: {
      to: EmailAddress[];
      subject: string;
      body: string;
      bodyType?: "html" | "text";
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: string; // Message ID to reply to
    }
  ): Promise<{ messageId: string }> {
    const accessToken = this.decrypt(encryptedAccessToken);

    if (provider === "gmail") {
      return this.sendGmailEmail(accessToken, email);
    } else if (provider === "outlook") {
      return this.sendOutlookEmail(accessToken, email);
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unsupported email provider: ${provider}`,
    });
  }

  private async sendGmailEmail(
    accessToken: string,
    email: {
      to: EmailAddress[];
      subject: string;
      body: string;
      bodyType?: "html" | "text";
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: string;
    }
  ): Promise<{ messageId: string }> {
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const formatAddress = (addr: EmailAddress) =>
      addr.name ? `${addr.name} <${addr.email}>` : addr.email;

    const messageParts = [
      `To: ${email.to.map(formatAddress).join(", ")}`,
      email.cc?.length ? `Cc: ${email.cc.map(formatAddress).join(", ")}` : "",
      email.bcc?.length ? `Bcc: ${email.bcc.map(formatAddress).join(", ")}` : "",
      `Subject: ${email.subject}`,
      `Content-Type: ${email.bodyType === "html" ? "text/html" : "text/plain"}; charset=utf-8`,
      "",
      email.body,
    ];

    const message = messageParts.filter((p) => p).join("\n");
    const encodedMessage = Buffer.from(message).toString("base64url");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: email.replyTo || undefined,
      },
    });

    return { messageId: response.data.id || "" };
  }

  private async sendOutlookEmail(
    accessToken: string,
    email: {
      to: EmailAddress[];
      subject: string;
      body: string;
      bodyType?: "html" | "text";
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: string;
    }
  ): Promise<{ messageId: string }> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    const formatRecipients = (addrs: EmailAddress[]) =>
      addrs.map((a) => ({
        emailAddress: {
          name: a.name,
          address: a.email,
        },
      }));

    const message: any = {
      subject: email.subject,
      body: {
        contentType: email.bodyType === "html" ? "HTML" : "Text",
        content: email.body,
      },
      toRecipients: formatRecipients(email.to),
    };

    if (email.cc?.length) {
      message.ccRecipients = formatRecipients(email.cc);
    }

    if (email.bcc?.length) {
      message.bccRecipients = formatRecipients(email.bcc);
    }

    let response;
    if (email.replyTo) {
      // Reply to existing message
      response = await client.api(`/me/messages/${email.replyTo}/reply`).post({
        message,
      });
    } else {
      // Send new message
      response = await client.api("/me/sendMail").post({
        message,
        saveToSentItems: true,
      });
    }

    return { messageId: response.id || "" };
  }

  // ========================================
  // AI FEATURES
  // ========================================

  /**
   * Analyze email sentiment using AI
   */
  async analyzeSentiment(emailContent: {
    subject?: string;
    body?: string;
    from: string;
  }): Promise<SentimentResult> {
    const prompt = `Analyze the following email and provide:
1. Sentiment: positive, negative, neutral, or mixed
2. Sentiment score: -100 (very negative) to 100 (very positive)
3. Importance: high, medium, or low
4. Whether it requires a response: true or false
5. Category: sales, support, marketing, internal, personal, or other

Email:
From: ${emailContent.from}
Subject: ${emailContent.subject || "(no subject)"}

${emailContent.body || ""}

Respond in JSON format: { "sentiment": "...", "score": 0, "importance": "...", "requiresResponse": true/false, "category": "..." }`;

    const executeAnalysis = async () => {
      let result: any;

      if (this.anthropicClient) {
        return await circuitBreakers.anthropic.execute(async () => {
          return await withRetry(async () => {
            const response = await this.anthropicClient!.messages.create({
              model: "claude-3-sonnet-20240229",
              max_tokens: 500,
              messages: [{ role: "user", content: prompt }],
            });

            const content = response.content[0];
            if (content.type === "text") {
              return JSON.parse(content.text);
            }
            throw new Error("Invalid response from Anthropic");
          }, DEFAULT_RETRY_OPTIONS);
        });
      } else if (this.openaiClient) {
        return await circuitBreakers.openai.execute(async () => {
          return await withRetry(async () => {
            const response = await this.openaiClient!.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
            });

            return JSON.parse(response.choices[0].message.content || "{}");
          }, DEFAULT_RETRY_OPTIONS);
        });
      } else {
        throw new Error("No AI client configured");
      }
    };

    try {
      const result = await executeAnalysis();

      return {
        sentiment: result.sentiment || "neutral",
        score: result.score || 0,
        importance: result.importance || "medium",
        requiresResponse: result.requiresResponse || false,
        category: result.category,
      };
    } catch (error) {
      logger.error({ error }, 'Sentiment analysis failed');
      // Return default values on error
      return {
        sentiment: "neutral",
        score: 0,
        importance: "medium",
        requiresResponse: false,
      };
    }
  }

  /**
   * Generate draft response using AI
   */
  async generateDraft(
    emailContent: {
      subject?: string;
      body?: string;
      from: string;
    },
    options: DraftOptions = {}
  ): Promise<{ subject: string; body: string; bodyType: "html" | "text" }> {
    const tone = options.tone || "professional";
    const model = options.model || "claude-3-sonnet";

    const prompt = `Generate a ${tone} email response to the following email.

Original Email:
From: ${emailContent.from}
Subject: ${emailContent.subject || "(no subject)"}

${emailContent.body || ""}

${options.context ? `\nAdditional Context: ${options.context}` : ""}

Generate a response with:
1. An appropriate subject line (Re: original subject)
2. A well-formatted email body in HTML format
3. Professional signature placeholder

Respond in JSON format: { "subject": "...", "body": "...", "bodyType": "html" }`;

    const executeGeneration = async () => {
      if (model.startsWith("claude") && this.anthropicClient) {
        return await circuitBreakers.anthropic.execute(async () => {
          return await withRetry(async () => {
            const response = await this.anthropicClient!.messages.create({
              model: model.includes("opus") ? "claude-3-opus-20240229" : "claude-3-sonnet-20240229",
              max_tokens: 2000,
              messages: [{ role: "user", content: prompt }],
            });

            const content = response.content[0];
            if (content.type === "text") {
              return JSON.parse(content.text);
            }
            throw new Error("Invalid response from Anthropic");
          }, DEFAULT_RETRY_OPTIONS);
        });
      } else if (model.startsWith("gpt") && this.openaiClient) {
        return await circuitBreakers.openai.execute(async () => {
          return await withRetry(async () => {
            const response = await this.openaiClient!.chat.completions.create({
              model: model === "gpt-4" ? "gpt-4-turbo-preview" : "gpt-4-turbo-preview",
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" },
            });

            return JSON.parse(response.choices[0].message.content || "{}");
          }, DEFAULT_RETRY_OPTIONS);
        });
      } else {
        throw new Error("No compatible AI client configured");
      }
    };

    try {
      const result = await executeGeneration();

      return {
        subject: result.subject || `Re: ${emailContent.subject || ""}`,
        body: result.body || "",
        bodyType: result.bodyType || "html",
      };
    } catch (error) {
      logger.error({ error }, 'Draft generation failed');
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate email draft",
      });
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
