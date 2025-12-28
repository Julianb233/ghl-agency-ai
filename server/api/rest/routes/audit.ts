/**
 * Audit Export REST API Routes
 *
 * Provides CSV and PDF export functionality for audit logs
 * Protected with admin authentication
 */

import express, { type Request, type Response } from "express";
import { Parser } from "papaparse";
import { getDb } from "../../../db";
import {
  users,
  apiRequestLogs,
  workflowExecutions,
  browserSessions,
  jobs,
} from "../../../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

const router = express.Router();

// ========================================
// TYPES & INTERFACES
// ========================================

interface AuditEntry {
  id: string | number;
  type: string;
  timestamp: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: string;
  ipAddress: string | null;
  metadata?: any;
}

interface ExportQueryParams {
  format?: 'csv' | 'pdf';
  userId?: string;
  eventType?: 'all' | 'api_request' | 'workflow' | 'browser_session' | 'job' | 'user_signin';
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Fetch audit logs based on filters
 */
async function fetchAuditLogs(params: ExportQueryParams): Promise<AuditEntry[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const auditEntries: AuditEntry[] = [];

  // Parse filters
  const userId = params.userId ? parseInt(params.userId) : undefined;
  const eventType = params.eventType || 'all';
  const startDate = params.startDate ? new Date(params.startDate) : null;
  const endDate = params.endDate ? new Date(params.endDate) : null;
  const sortOrder = params.sortOrder || 'desc';

  const shouldFetch = (type: string) => eventType === "all" || eventType === type;

  // 1. API Request Logs
  if (shouldFetch("api_request")) {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(apiRequestLogs.userId, userId));
      if (startDate) conditions.push(gte(apiRequestLogs.createdAt, startDate));
      if (endDate) conditions.push(lte(apiRequestLogs.createdAt, endDate));

      const apiLogs = await db
        .select({
          id: apiRequestLogs.id,
          userId: apiRequestLogs.userId,
          method: apiRequestLogs.method,
          endpoint: apiRequestLogs.endpoint,
          statusCode: apiRequestLogs.statusCode,
          responseTime: apiRequestLogs.responseTime,
          ipAddress: apiRequestLogs.ipAddress,
          createdAt: apiRequestLogs.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(apiRequestLogs)
        .leftJoin(users, eq(apiRequestLogs.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sortOrder === "asc" ? apiRequestLogs.createdAt : desc(apiRequestLogs.createdAt))
        .limit(10000); // Limit to prevent memory issues

      apiLogs.forEach(log => {
        auditEntries.push({
          id: `api-${log.id}`,
          type: "api_request",
          timestamp: log.createdAt,
          userId: log.userId,
          userName: log.userName,
          userEmail: log.userEmail,
          action: `${log.method} ${log.endpoint}`,
          details: `Status: ${log.statusCode}, Response Time: ${log.responseTime}ms`,
          ipAddress: log.ipAddress,
          metadata: {
            method: log.method,
            endpoint: log.endpoint,
            statusCode: log.statusCode,
            responseTime: log.responseTime,
          },
        });
      });
    } catch (e) {
      console.log("[Audit Export] API request logs not available");
    }
  }

  // 2. Workflow Executions
  if (shouldFetch("workflow")) {
    const conditions = [];
    if (userId) conditions.push(eq(workflowExecutions.userId, userId));
    if (startDate) conditions.push(gte(workflowExecutions.createdAt, startDate));
    if (endDate) conditions.push(lte(workflowExecutions.createdAt, endDate));

    const workflows = await db
      .select({
        id: workflowExecutions.id,
        userId: workflowExecutions.userId,
        workflowId: workflowExecutions.workflowId,
        status: workflowExecutions.status,
        startedAt: workflowExecutions.startedAt,
        completedAt: workflowExecutions.completedAt,
        duration: workflowExecutions.duration,
        error: workflowExecutions.error,
        createdAt: workflowExecutions.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(workflowExecutions)
      .leftJoin(users, eq(workflowExecutions.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? workflowExecutions.createdAt : desc(workflowExecutions.createdAt))
      .limit(10000);

    workflows.forEach(workflow => {
      auditEntries.push({
        id: `workflow-${workflow.id}`,
        type: "workflow",
        timestamp: workflow.createdAt,
        userId: workflow.userId,
        userName: workflow.userName,
        userEmail: workflow.userEmail,
        action: `Workflow Execution: ${workflow.workflowId}`,
        details: `Status: ${workflow.status}, Duration: ${workflow.duration || 'N/A'}ms${workflow.error ? `, Error: ${workflow.error}` : ''}`,
        ipAddress: null,
        metadata: {
          workflowId: workflow.workflowId,
          status: workflow.status,
          duration: workflow.duration,
          error: workflow.error,
        },
      });
    });
  }

  // 3. Browser Sessions
  if (shouldFetch("browser_session")) {
    const conditions = [];
    if (userId) conditions.push(eq(browserSessions.userId, userId));
    if (startDate) conditions.push(gte(browserSessions.createdAt, startDate));
    if (endDate) conditions.push(lte(browserSessions.createdAt, endDate));

    const sessions = await db
      .select({
        id: browserSessions.id,
        userId: browserSessions.userId,
        sessionId: browserSessions.sessionId,
        status: browserSessions.status,
        url: browserSessions.url,
        createdAt: browserSessions.createdAt,
        completedAt: browserSessions.completedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(browserSessions)
      .leftJoin(users, eq(browserSessions.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? browserSessions.createdAt : desc(browserSessions.createdAt))
      .limit(10000);

    sessions.forEach(session => {
      auditEntries.push({
        id: `session-${session.id}`,
        type: "browser_session",
        timestamp: session.createdAt,
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        action: `Browser Session: ${session.sessionId}`,
        details: `Status: ${session.status}, URL: ${session.url || 'N/A'}`,
        ipAddress: null,
        metadata: {
          sessionId: session.sessionId,
          status: session.status,
          url: session.url,
        },
      });
    });
  }

  // 4. Jobs
  if (shouldFetch("job")) {
    const conditions = [];
    if (startDate) conditions.push(gte(jobs.createdAt, startDate));
    if (endDate) conditions.push(lte(jobs.createdAt, endDate));

    const jobsList = await db
      .select({
        id: jobs.id,
        type: jobs.type,
        status: jobs.status,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? jobs.createdAt : desc(jobs.createdAt))
      .limit(10000);

    jobsList.forEach(job => {
      auditEntries.push({
        id: `job-${job.id}`,
        type: "job",
        timestamp: job.createdAt,
        userId: null,
        userName: null,
        userEmail: null,
        action: `Job: ${job.type}`,
        details: `Status: ${job.status}`,
        ipAddress: null,
        metadata: {
          jobType: job.type,
          status: job.status,
        },
      });
    });
  }

  // 5. User Sign-ins
  if (shouldFetch("user_signin")) {
    const conditions = [];
    if (userId) conditions.push(eq(users.id, userId));
    if (startDate) conditions.push(gte(users.lastSignedIn, startDate));
    if (endDate) conditions.push(lte(users.lastSignedIn, endDate));

    const signins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        lastSignedIn: users.lastSignedIn,
        loginMethod: users.loginMethod,
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? users.lastSignedIn : desc(users.lastSignedIn))
      .limit(10000);

    signins.forEach(signin => {
      auditEntries.push({
        id: `signin-${signin.id}`,
        type: "user_signin",
        timestamp: signin.lastSignedIn,
        userId: signin.id,
        userName: signin.name,
        userEmail: signin.email,
        action: `User Sign-in`,
        details: `Method: ${signin.loginMethod || 'N/A'}`,
        ipAddress: null,
        metadata: {
          loginMethod: signin.loginMethod,
        },
      });
    });
  }

  // Sort all entries by timestamp
  auditEntries.sort((a, b) => {
    const timeA = a.timestamp.getTime();
    const timeB = b.timestamp.getTime();
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  return auditEntries;
}

/**
 * Generate CSV from audit entries
 */
function generateCSV(entries: AuditEntry[]): string {
  const csvData = entries.map(entry => ({
    Timestamp: entry.timestamp.toISOString(),
    Type: entry.type,
    User: entry.userName || 'System',
    Email: entry.userEmail || 'N/A',
    Action: entry.action,
    Details: entry.details,
    'IP Address': entry.ipAddress || 'N/A',
  }));

  // Convert to CSV using manual string building (papaparse is for parsing, not generating)
  const headers = Object.keys(csvData[0] || {});
  const csvRows = [
    headers.join(','),
    ...csvData.map(row =>
      headers.map(header => {
        const value = String(row[header as keyof typeof row] || '');
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

/**
 * Generate PDF from audit entries (basic HTML-based PDF)
 */
function generatePDFHTML(entries: AuditEntry[]): string {
  const now = new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Audit Log Export - ${now}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      font-size: 12px;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    .meta {
      color: #666;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f4f4f4;
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .timestamp {
      white-space: nowrap;
    }
    .type {
      font-weight: bold;
    }
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
          <td class="timestamp">${entry.timestamp.toISOString()}</td>
          <td class="type">${entry.type}</td>
          <td>${entry.userName || 'System'}</td>
          <td>${entry.userEmail || 'N/A'}</td>
          <td>${entry.action}</td>
          <td>${entry.details}</td>
          <td>${entry.ipAddress || 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `.trim();

  return html;
}

// ========================================
// MIDDLEWARE - SIMPLE ADMIN AUTH CHECK
// ========================================

/**
 * Simple admin authentication middleware
 * This checks if the request has a valid admin session or API key
 * In production, this should integrate with your actual auth system
 */
async function requireAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  try {
    // Check for Authorization header with Bearer token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required. Provide Bearer token in Authorization header.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For now, accept any token starting with 'admin_'
    // TODO: Integrate with actual authentication system
    if (!token.startsWith('admin_')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required for this endpoint',
      });
    }

    // Token is valid, continue to next middleware
    return next();
  } catch (error) {
    console.error('[Audit Export] Auth error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication check failed',
    });
  }
}

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/audit/export
 * Export audit logs in CSV or PDF format
 *
 * Query Parameters:
 * - format: 'csv' | 'pdf' (required)
 * - userId: Filter by user ID (optional)
 * - eventType: Filter by event type (optional)
 * - startDate: ISO 8601 datetime (optional)
 * - endDate: ISO 8601 datetime (optional)
 * - sortOrder: 'asc' | 'desc' (optional, default: 'desc')
 */
router.get('/export', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const params: ExportQueryParams = {
      format: req.query.format as 'csv' | 'pdf',
      userId: req.query.userId as string,
      eventType: req.query.eventType as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    // Validate format parameter
    if (!params.format || !['csv', 'pdf'].includes(params.format)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or missing format parameter. Must be "csv" or "pdf".',
      });
    }

    // Fetch audit logs
    const entries = await fetchAuditLogs(params);

    if (entries.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No audit logs found matching the specified filters',
      });
    }

    // Generate export based on format
    if (params.format === 'csv') {
      const csv = generateCSV(entries);
      const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    if (params.format === 'pdf') {
      const html = generatePDFHTML(entries);
      const filename = `audit-log-${new Date().toISOString().split('T')[0]}.html`;

      // For now, return HTML (which can be printed to PDF by browser)
      // In production, use a proper PDF library like puppeteer or pdfkit
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.send(html);
    }

    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid format parameter',
    });
  } catch (error) {
    console.error('[Audit Export] Export failed:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export audit logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/audit/export/info
 * Get information about available export options
 */
router.get('/export/info', requireAdminAuth, async (req: Request, res: Response) => {
  return res.json({
    endpoint: '/api/audit/export',
    method: 'GET',
    authentication: 'Bearer token with admin_ prefix required',
    formats: ['csv', 'pdf'],
    parameters: {
      format: {
        type: 'string',
        required: true,
        values: ['csv', 'pdf'],
        description: 'Export format',
      },
      userId: {
        type: 'number',
        required: false,
        description: 'Filter by specific user ID',
      },
      eventType: {
        type: 'string',
        required: false,
        values: ['all', 'api_request', 'workflow', 'browser_session', 'job', 'user_signin'],
        description: 'Filter by event type',
      },
      startDate: {
        type: 'string',
        required: false,
        format: 'ISO 8601',
        description: 'Filter events from this date',
        example: '2025-01-01T00:00:00Z',
      },
      endDate: {
        type: 'string',
        required: false,
        format: 'ISO 8601',
        description: 'Filter events until this date',
        example: '2025-12-31T23:59:59Z',
      },
      sortOrder: {
        type: 'string',
        required: false,
        values: ['asc', 'desc'],
        default: 'desc',
        description: 'Sort order by timestamp',
      },
    },
    example: '/api/audit/export?format=csv&startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z',
  });
});

export default router;
