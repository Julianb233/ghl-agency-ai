# Audit Log Export API

## Overview

The Audit Export API provides endpoints to export audit logs in CSV and PDF formats. These endpoints are protected with admin authentication and support filtering by date range, user, and event type.

## Endpoints

### 1. Export Audit Logs

**Endpoint:** `GET /api/audit/export`

**Authentication:** Required (Admin Bearer Token)

**Description:** Export audit logs in CSV or PDF format with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `format` | string | Yes | `csv`, `pdf` | Export format |
| `userId` | number | No | - | Filter by specific user ID |
| `eventType` | string | No | `all`, `api_request`, `workflow`, `browser_session`, `job`, `user_signin` | Filter by event type |
| `startDate` | string | No | ISO 8601 datetime | Filter events from this date |
| `endDate` | string | No | ISO 8601 datetime | Filter events until this date |
| `sortOrder` | string | No | `asc`, `desc` | Sort order by timestamp (default: `desc`) |

#### Request Examples

**CSV Export - All Logs:**
```bash
curl -X GET "http://localhost:3000/api/audit/export?format=csv" \
  -H "Authorization: Bearer admin_your-token-here"
```

**CSV Export - Date Range:**
```bash
curl -X GET "http://localhost:3000/api/audit/export?format=csv&startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z" \
  -H "Authorization: Bearer admin_your-token-here"
```

**CSV Export - Specific User:**
```bash
curl -X GET "http://localhost:3000/api/audit/export?format=csv&userId=123" \
  -H "Authorization: Bearer admin_your-token-here"
```

**CSV Export - API Requests Only:**
```bash
curl -X GET "http://localhost:3000/api/audit/export?format=csv&eventType=api_request" \
  -H "Authorization: Bearer admin_your-token-here"
```

**PDF Export - All Filters:**
```bash
curl -X GET "http://localhost:3000/api/audit/export?format=pdf&userId=123&eventType=workflow&startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z&sortOrder=asc" \
  -H "Authorization: Bearer admin_your-token-here"
```

#### Response

**Success (200 OK):**

For CSV format:
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="audit-log-YYYY-MM-DD.csv"`
- Body: CSV data with columns: Timestamp, Type, User, Email, Action, Details, IP Address

For PDF format:
- Content-Type: `text/html`
- Content-Disposition: `inline; filename="audit-log-YYYY-MM-DD.html"`
- Body: HTML document (can be printed to PDF by browser)

**Errors:**

- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Non-admin token provided
- `400 Bad Request`: Invalid or missing format parameter
- `404 Not Found`: No audit logs found matching filters
- `500 Internal Server Error`: Server error occurred

### 2. Export Information

**Endpoint:** `GET /api/audit/export/info`

**Authentication:** Required (Admin Bearer Token)

**Description:** Get information about the export API and available parameters.

#### Request Example

```bash
curl -X GET "http://localhost:3000/api/audit/export/info" \
  -H "Authorization: Bearer admin_your-token-here"
```

#### Response Example

```json
{
  "endpoint": "/api/audit/export",
  "method": "GET",
  "authentication": "Bearer token with admin_ prefix required",
  "formats": ["csv", "pdf"],
  "parameters": {
    "format": {
      "type": "string",
      "required": true,
      "values": ["csv", "pdf"],
      "description": "Export format"
    },
    "userId": {
      "type": "number",
      "required": false,
      "description": "Filter by specific user ID"
    },
    "eventType": {
      "type": "string",
      "required": false,
      "values": ["all", "api_request", "workflow", "browser_session", "job", "user_signin"],
      "description": "Filter by event type"
    },
    "startDate": {
      "type": "string",
      "required": false,
      "format": "ISO 8601",
      "description": "Filter events from this date",
      "example": "2025-01-01T00:00:00Z"
    },
    "endDate": {
      "type": "string",
      "required": false,
      "format": "ISO 8601",
      "description": "Filter events until this date",
      "example": "2025-12-31T23:59:59Z"
    },
    "sortOrder": {
      "type": "string",
      "required": false,
      "values": ["asc", "desc"],
      "default": "desc",
      "description": "Sort order by timestamp"
    }
  },
  "example": "/api/audit/export?format=csv&startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z"
}
```

## Authentication

The audit export endpoints require admin authentication using a Bearer token.

### Token Format

```
Authorization: Bearer admin_{your-token-here}
```

**Important:** For this implementation, any token starting with `admin_` is accepted. In production, this should be integrated with your actual authentication system.

### Integration with Existing Auth

To integrate with your existing authentication system:

1. Modify the `requireAdminAuth` middleware in `/server/api/rest/routes/audit.ts`
2. Replace the simple token check with your actual admin verification logic
3. Example integration:

```typescript
async function requireAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    }

    const token = authHeader.substring(7);

    // TODO: Replace with your actual auth system
    const user = await verifyToken(token); // Your auth function
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required',
      });
    }

    // Attach user to request for downstream use
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication check failed',
    });
  }
}
```

## Audit Data Sources

The audit export aggregates data from multiple tables:

1. **API Request Logs** (`apiRequestLogs` table)
   - HTTP method, endpoint, status code, response time
   - User information and IP address

2. **Workflow Executions** (`workflowExecutions` table)
   - Workflow ID, status, duration
   - Start and completion timestamps

3. **Browser Sessions** (`browserSessions` table)
   - Session ID, status, URL
   - Completion timestamp

4. **Background Jobs** (`jobs` table)
   - Job type and status

5. **User Sign-ins** (`users` table)
   - Last sign-in timestamp
   - Login method

## CSV Export Format

### Columns

| Column | Description |
|--------|-------------|
| Timestamp | ISO 8601 timestamp of the event |
| Type | Event type (api_request, workflow, browser_session, job, user_signin) |
| User | User name (or "System" for system events) |
| Email | User email address |
| Action | Description of the action performed |
| Details | Additional details about the event |
| IP Address | IP address (for API requests) |

### Example CSV Output

```csv
Timestamp,Type,User,Email,Action,Details,IP Address
2025-12-18T10:30:00.000Z,api_request,John Doe,john@example.com,GET /api/tasks,Status: 200, Response Time: 45ms,192.168.1.1
2025-12-18T10:25:00.000Z,workflow,Jane Smith,jane@example.com,Workflow Execution: wf-123,Status: completed, Duration: 2500ms,N/A
2025-12-18T10:20:00.000Z,user_signin,Bob Johnson,bob@example.com,User Sign-in,Method: google,N/A
```

## PDF Export Format

The PDF export generates an HTML document with embedded CSS styling that can be:
1. Viewed directly in a browser
2. Printed to PDF using browser print functionality (Ctrl+P or Cmd+P)
3. Converted to PDF using server-side tools (future enhancement)

### HTML Structure

- Title with generation timestamp
- Metadata section (total entries)
- Responsive table with all audit entries
- Professional styling with alternating row colors

### Example Usage

```javascript
// In browser, after downloading:
const url = 'http://localhost:3000/api/audit/export?format=pdf';
const response = await fetch(url, {
  headers: {
    'Authorization': 'Bearer admin_token'
  }
});
const html = await response.text();

// Open in new window and print
const printWindow = window.open('', '_blank');
printWindow.document.write(html);
printWindow.document.close();
printWindow.print();
```

## Performance Considerations

### Limits

- Maximum 10,000 entries per export to prevent memory issues
- Date range filtering recommended for large datasets
- Export operations may take several seconds for large datasets

### Optimization Tips

1. **Use Date Filters:** Always specify `startDate` and `endDate` when exporting large datasets
2. **Filter by Event Type:** Export specific event types instead of "all" when possible
3. **Paginate:** For very large datasets, export in chunks by date range
4. **Off-peak Hours:** Schedule large exports during off-peak hours

### Example: Chunked Export

```bash
# Export January 2025
curl -X GET "http://localhost:3000/api/audit/export?format=csv&startDate=2025-01-01T00:00:00Z&endDate=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer admin_token" -o audit-jan-2025.csv

# Export February 2025
curl -X GET "http://localhost:3000/api/audit/export?format=csv&startDate=2025-02-01T00:00:00Z&endDate=2025-02-28T23:59:59Z" \
  -H "Authorization: Bearer admin_token" -o audit-feb-2025.csv
```

## Testing

### Unit Tests

Run the unit tests:

```bash
# Install supertest if not already installed
pnpm add -D supertest @types/supertest

# Run tests
pnpm test server/api/rest/routes/audit.test.ts
```

### Manual Testing

```bash
# Test with curl (requires running server)
# 1. Start the server
pnpm dev

# 2. Test export info endpoint
curl -X GET "http://localhost:3000/api/audit/export/info" \
  -H "Authorization: Bearer admin_test"

# 3. Test CSV export
curl -X GET "http://localhost:3000/api/audit/export?format=csv" \
  -H "Authorization: Bearer admin_test"

# 4. Test PDF export
curl -X GET "http://localhost:3000/api/audit/export?format=pdf" \
  -H "Authorization: Bearer admin_test"
```

## Future Enhancements

### 1. True PDF Generation

Replace HTML output with actual PDF generation using libraries:

```bash
# Option 1: puppeteer (already in dependencies)
pnpm add puppeteer

# Option 2: pdfkit
pnpm add pdfkit @types/pdfkit
```

Example implementation:

```typescript
import puppeteer from 'puppeteer';

async function generatePDF(entries: AuditEntry[]): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const html = generatePDFHTML(entries);
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
}
```

### 2. Excel Export

Add XLSX format support:

```bash
pnpm add xlsx @types/xlsx
```

### 3. Scheduled Exports

Add ability to schedule recurring exports:

```typescript
// Schedule daily export at midnight
cron.schedule('0 0 * * *', async () => {
  const entries = await fetchAuditLogs({
    format: 'csv',
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  // Send via email or save to S3
});
```

### 4. Email Integration

Add option to email exports:

```typescript
router.get('/export', requireAdminAuth, async (req, res) => {
  // ... existing code ...

  if (req.query.email) {
    await sendEmail({
      to: req.query.email,
      subject: 'Audit Log Export',
      attachments: [{ filename: 'audit-log.csv', content: csv }]
    });
    return res.json({ message: 'Export sent to email' });
  }

  // ... return file as before ...
});
```

### 5. Advanced Filtering

- Full-text search across all fields
- Multiple user IDs (comma-separated)
- IP address filtering
- Status code filtering for API requests
- Duration range filtering for workflows

### 6. Rate Limiting

Add rate limiting specifically for export endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many export requests, please try again later'
});

router.get('/export', exportLimiter, requireAdminAuth, async (req, res) => {
  // ... export logic ...
});
```

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Missing or invalid Authorization header

**Solution:**
- Ensure you include the Authorization header: `Authorization: Bearer admin_token`
- Token must start with `admin_` prefix

### Issue: 404 Not Found

**Cause:** No audit logs match the specified filters

**Solution:**
- Check if audit logs exist in the database
- Verify date range filters are not too restrictive
- Try removing filters to see all available logs

### Issue: 500 Internal Server Error

**Cause:** Database connection issues or query errors

**Solution:**
- Check database connection is working: `curl http://localhost:3000/api/health`
- Check server logs for detailed error messages
- Verify all required tables exist (run migrations if needed)

### Issue: Large Export Times Out

**Cause:** Too many audit log entries

**Solution:**
- Add date range filters to limit results
- Export in smaller chunks (by month or week)
- Increase request timeout settings

## Security Considerations

1. **Authentication:** Always use secure admin authentication in production
2. **Rate Limiting:** Implement rate limiting to prevent abuse
3. **Data Privacy:** Audit logs may contain sensitive information (PII, IP addresses)
4. **Access Control:** Log all export operations for audit trail
5. **HTTPS:** Always use HTTPS in production to protect data in transit
6. **Token Security:** Store admin tokens securely, rotate regularly

## Integration Examples

### Frontend React Component

```typescript
import React, { useState } from 'react';

export function AuditExportButton() {
  const [loading, setLoading] = useState(false);

  const exportAuditLogs = async (format: 'csv' | 'pdf') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/audit/export?format=${format}&startDate=2025-01-01T00:00:00Z`,
        {
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => exportAuditLogs('csv')}
        disabled={loading}
      >
        Export CSV
      </button>
      <button
        onClick={() => exportAuditLogs('pdf')}
        disabled={loading}
      >
        Export PDF
      </button>
    </div>
  );
}
```

### Node.js Script

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

async function exportAuditLogs() {
  const response = await fetch(
    'http://localhost:3000/api/audit/export?format=csv&startDate=2025-01-01T00:00:00Z',
    {
      headers: {
        'Authorization': 'Bearer admin_your-token'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  const csv = await response.text();
  const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csv);
  console.log(`Exported to ${filename}`);
}

exportAuditLogs().catch(console.error);
```

## API Registration

The audit export routes are registered in `/server/api/rest/index.ts`:

```typescript
import auditRouter from "./routes/audit";

// ...

app.use("/api/audit", auditRouter);
```

This makes the endpoints available at:
- `http://localhost:3000/api/audit/export`
- `http://localhost:3000/api/audit/export/info`

## Files Modified/Created

1. **Created:** `/server/api/rest/routes/audit.ts` - Main export endpoint implementation
2. **Created:** `/server/api/rest/routes/audit.test.ts` - Unit tests
3. **Created:** `/server/api/rest/routes/AUDIT_EXPORT_README.md` - This documentation
4. **Modified:** `/server/api/rest/index.ts` - Registered audit routes

## Dependencies Used

- `express` - Web framework (already in project)
- `papaparse` - CSV parsing (already in project, though not actively used for generation)
- `drizzle-orm` - Database queries (already in project)

## Additional Dependencies for Testing

```bash
pnpm add -D supertest @types/supertest
```

## Summary

The audit export API provides a robust, secure way to export audit logs in multiple formats. It supports filtering, authentication, and is designed to scale with proper limits and optimizations.
