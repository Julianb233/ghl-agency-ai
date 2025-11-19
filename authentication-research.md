# Authentication & Session Management Research

**Date**: November 18, 2025  
**Purpose**: Research solutions for 1Password integration, email 2FA handling, and Browserbase session persistence for GHL Agent AI

---

## 1. 1Password Integration

### Overview

1Password provides **two main approaches** for programmatic credential access:

1. **1Password Connect Server** (Self-hosted REST API)
2. **1Password Service Accounts** (Cloud-based API)

### 1Password Connect Server

**Architecture**: Self-hosted server that provides a private REST API for accessing 1Password vaults.

**Key Features**:
- Private REST API for credential retrieval
- Caches data in your infrastructure (unlimited re-requests after initial fetch)
- No request quotas except internal rate limits during initial fetch
- SDK libraries available (Go, Python, JavaScript)
- Reduces dependency on 1Password API availability

**Use Cases**:
- CI/CD pipelines
- Infrastructure secrets management
- Web service provisioning
- Kubernetes environments

**Setup**:
1. Deploy Connect Server in your infrastructure (Docker container)
2. Generate `1password-credentials.json` file
3. Create Access Tokens for client applications
4. Use SDK to retrieve credentials

**Example** (JavaScript):
```typescript
import { OnePasswordConnect } from "@1password/connect";

const op = OnePasswordConnect({
  serverURL: process.env.OP_CONNECT_HOST,
  token: process.env.OP_CONNECT_TOKEN,
  keepAlive: true,
});

// Retrieve GHL credentials
const item = await op.getItem("vault-id", "item-id");
const username = item.fields.find(f => f.label === "username")?.value;
const password = item.fields.find(f => f.label === "password")?.value;
```

**Pricing**: Included with 1Password Business plan ($7.99/user/month)

---

### 1Password Service Accounts

**Architecture**: Cloud-based API access without self-hosting.

**Key Features**:
- Direct API access to 1Password vaults
- No server deployment required
- Programmatic access via API tokens
- Suitable for smaller-scale automation

**Comparison**:

| Feature | Connect Server | Service Accounts |
|---------|----------------|------------------|
| Hosting | Self-hosted | Cloud-based |
| Latency | Lower (local cache) | Higher (API calls) |
| Availability | Your control | Depends on 1Password API |
| Scalability | Unlimited re-requests | Subject to rate limits |
| Setup Complexity | Higher | Lower |
| Cost | Included in Business plan | Included in Business plan |

**Recommendation for GHL Agent AI**: Use **1Password Connect Server** for:
- Lower latency (local caching)
- Higher availability (self-hosted)
- Unlimited credential retrievals
- Better scalability for multiple concurrent browser sessions

---

## 2. Email 2FA Code Extraction

### Challenge

GoHighLevel sends 2FA verification codes via email when logging in from new devices/browsers. We need to automate extraction of these codes to complete authentication.

### Solution Approaches

#### Option 1: Gmail API (Recommended)

**Advantages**:
- Official Google API with robust authentication
- Real-time email access
- Structured data retrieval
- No IMAP configuration needed

**Setup**:
1. Enable Gmail API in Google Cloud Console
2. Create OAuth 2.0 credentials or Service Account
3. Grant API access to Gmail account
4. Use Gmail API to search for verification emails

**Example** (Node.js):
```typescript
import { google } from 'googleapis';

async function getVerificationCode(email: string) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  // Search for recent GHL verification emails
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `from:noreply@gohighlevel.com subject:"verification code" after:${Date.now() - 300000}`, // Last 5 minutes
    maxResults: 1
  });
  
  if (!res.data.messages || res.data.messages.length === 0) {
    throw new Error('No verification email found');
  }
  
  // Get email content
  const message = await gmail.users.messages.get({
    userId: 'me',
    id: res.data.messages[0].id!,
    format: 'full'
  });
  
  // Extract code from email body
  const emailBody = Buffer.from(
    message.data.payload?.body?.data || '',
    'base64'
  ).toString();
  
  const codeMatch = emailBody.match(/\b\d{6}\b/); // 6-digit code
  return codeMatch ? codeMatch[0] : null;
}
```

**Pricing**: Free (Gmail API has generous quotas)

---

#### Option 2: IMAP Email Access

**Advantages**:
- Works with any email provider (not just Gmail)
- Simpler authentication (app passwords)
- No OAuth flow required

**Disadvantages**:
- Requires enabling IMAP access
- Less structured data
- Potential security concerns with app passwords

**Example** (Node.js with `imap-simple`):
```typescript
import imaps from 'imap-simple';

async function getVerificationCodeIMAP() {
  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_APP_PASSWORD,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      authTimeout: 3000
    }
  };
  
  const connection = await imaps.connect(config);
  await connection.openBox('INBOX');
  
  // Search for recent verification emails
  const searchCriteria = [
    'UNSEEN',
    ['FROM', 'noreply@gohighlevel.com'],
    ['SUBJECT', 'verification code']
  ];
  
  const fetchOptions = {
    bodies: ['TEXT'],
    markSeen: true
  };
  
  const messages = await connection.search(searchCriteria, fetchOptions);
  
  if (messages.length === 0) {
    throw new Error('No verification email found');
  }
  
  const emailBody = messages[0].parts.find(part => part.which === 'TEXT').body;
  const codeMatch = emailBody.match(/\b\d{6}\b/);
  
  connection.end();
  return codeMatch ? codeMatch[0] : null;
}
```

---

#### Option 3: Dedicated Testing Email Service (Mailosaur)

**Advantages**:
- Purpose-built for automation testing
- Instant email delivery
- Dedicated inbox per test
- Built-in code extraction

**Example**:
```typescript
import MailosaurClient from 'mailosaur';

const mailosaur = new MailosaurClient(process.env.MAILOSAUR_API_KEY);

async function getVerificationCodeMailosaur(serverId: string) {
  const email = await mailosaur.messages.get(serverId, {
    sentTo: 'test@serverId.mailosaur.net',
    subject: 'verification code',
    timeout: 60000 // Wait up to 60 seconds
  });
  
  const codeMatch = email.text.body.match(/\b\d{6}\b/);
  return codeMatch ? codeMatch[0] : null;
}
```

**Pricing**: $20/month (Developer plan)

---

### Recommendation for GHL Agent AI

**Use Gmail API** for production because:
1. **Free** (no additional cost)
2. **Reliable** (official Google API)
3. **Real-time** (instant email access)
4. **Secure** (OAuth 2.0 authentication)
5. **Scalable** (handles multiple accounts)

**Implementation Flow**:
1. User provides Gmail credentials during onboarding
2. OAuth flow grants API access to their Gmail
3. Store OAuth refresh token in database (encrypted)
4. When 2FA is triggered, poll Gmail API for verification email
5. Extract code and auto-fill in GHL login form

---

## 3. Browserbase Session Persistence (Contexts)

### Overview

Browserbase **Contexts** allow you to persist user data (cookies, localStorage, session storage, cache) across multiple browser sessions. This is critical for maintaining GHL authentication without re-logging in every time.

### How Contexts Work

**Default Behavior**: Each Browserbase session starts with a fresh user data directory (cookies/cache wiped).

**With Contexts**: You can create a reusable "browser profile" that persists data across sessions.

**Key Concept**: Contexts are uniquely encrypted at rest for security.

---

### Creating and Using Contexts

#### Step 1: Create a Context

```typescript
import { Browserbase } from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });

const context = await bb.contexts.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID,
});

console.log("Context ID:", context.id); // Save this ID
```

#### Step 2: Use Context in Session

```typescript
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  browserSettings: {
    context: {
      id: contextId,
      persist: true, // Save changes to context when session ends
    },
  },
});
```

#### Step 3: Reuse Context in Future Sessions

```typescript
// Future sessions with same contextId will have saved cookies/auth
const newSession = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  browserSettings: {
    context: {
      id: contextId,
      persist: true,
    },
  },
});
```

---

### Login Persistence Flow

**Typical workflow** for maintaining GHL authentication:

1. **Create Context**: Generate a unique context ID for each GHL sub-account
2. **First Session**: Login to GHL manually or programmatically with `persist: true`
3. **End Session**: Context automatically saves cookies and auth tokens
4. **Wait**: Brief delay (few seconds) for context to update
5. **Future Sessions**: Reuse same context ID → automatically logged in

**Example**:
```typescript
// First login
const contextId = await createGHLContext(subAccountId);
await loginToGHL(contextId, credentials);

// Future automations - no login needed
await automateGHLWorkflow(contextId, task);
```

---

### Context Configuration Options

#### `persist: true` (Recommended for most cases)

**When to use**:
- Saving login credentials and session cookies
- Retaining user preferences
- Caching data for faster loads
- Minimizing CAPTCHA and bot detection

**Behavior**: Changes made during session are saved to context when session ends.

#### `persist: false` (Rare use cases)

**When to use**:
- Read-only sessions (access saved cookies without modifying)
- Preventing session state changes

**Behavior**: Context loads saved data but doesn't update it.

---

### Important Considerations

**Delay Between Sessions**: After a session with `persist: true`, wait a few seconds before reusing the same context to ensure data is synchronized.

**Security**: Contexts are encrypted at rest. Store context IDs securely in your database.

**Deletion**: Contexts can be deleted via API when no longer needed (permanent action).

---

### Context Management Strategy for GHL Agent AI

**One Context Per Sub-Account**:
- Create unique context for each GHL sub-account
- Store mapping in database: `sub_account_id` → `browserbase_context_id`
- Reuse context for all automations on that sub-account

**Benefits**:
- Persistent authentication (login once, reuse forever)
- Faster automation (no login overhead)
- Reduced bot detection (consistent browser fingerprint)
- Lower costs (fewer authentication steps)

**Database Schema**:
```sql
CREATE TABLE ghl_sub_accounts (
  id INT PRIMARY KEY,
  sub_account_id VARCHAR(255) UNIQUE,
  browserbase_context_id VARCHAR(255) UNIQUE,
  email VARCHAR(255),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 4. Concurrent Browser Management

### Challenge

You need to run **multiple browser sessions simultaneously** on the same GHL sub-account (or different sub-accounts) to perform parallel automations.

### Browserbase Concurrency

**Concurrency Limits** (based on pricing tier):

| Plan | Concurrent Sessions | Price |
|------|---------------------|-------|
| Hobby | 2 | $50/month |
| Developer | 10 | $150/month |
| Startup | 25 | $300/month |
| Growth | 50 | $500/month |
| Scale | 100+ | $1,000+/month |

---

### Strategy 1: Multiple Contexts (Same Sub-Account)

**Use Case**: Running multiple automations on the same GHL sub-account simultaneously.

**Approach**: Create multiple contexts for the same sub-account, each with different browser fingerprints.

**Example**:
```typescript
// Create 3 contexts for same sub-account
const context1 = await createGHLContext(subAccountId, "workflow-automation");
const context2 = await createGHLContext(subAccountId, "funnel-creation");
const context3 = await createGHLContext(subAccountId, "campaign-management");

// Run parallel automations
await Promise.all([
  automateWorkflow(context1, task1),
  createFunnel(context2, task2),
  manageCampaign(context3, task3)
]);
```

**Limitation**: GHL may detect multiple concurrent sessions from same account and flag as suspicious activity.

---

### Strategy 2: Multiple GHL User Accounts (Recommended)

**Use Case**: Running many concurrent automations without triggering GHL's bot detection.

**Approach**: Create multiple GHL user accounts within each sub-account, each with its own context.

**Benefits**:
- Legitimate concurrent access (multiple team members)
- Reduced bot detection risk
- Better audit trail (different users for different tasks)
- Scalable (add more users as needed)

**GHL User Roles**:
- **Admin**: Full access (use for critical operations)
- **User**: Limited access (use for routine tasks)

**Example**:
```typescript
// Create 5 GHL users for automation
const users = [
  { email: "automation-1@agency.com", role: "user" },
  { email: "automation-2@agency.com", role: "user" },
  { email: "automation-3@agency.com", role: "user" },
  { email: "automation-4@agency.com", role: "user" },
  { email: "automation-5@agency.com", role: "admin" }
];

// Each user gets own context
const contexts = await Promise.all(
  users.map(user => createGHLContext(subAccountId, user.email))
);

// Parallel automations with different users
await Promise.all([
  automateWorkflow(contexts[0], task1),
  createFunnel(contexts[1], task2),
  manageCampaign(contexts[2], task3),
  buildWebsite(contexts[3], task4),
  configureIntegrations(contexts[4], task5)
]);
```

**Cost Analysis**:
- GHL charges per sub-account, not per user
- Additional users are **free** within same sub-account
- Only cost is Browserbase concurrency (based on plan)

---

### Strategy 3: Session Pooling

**Use Case**: Optimizing resource usage for high-volume automation.

**Approach**: Maintain a pool of pre-authenticated browser sessions ready for immediate use.

**Example**:
```typescript
class BrowserSessionPool {
  private pool: Map<string, Session[]> = new Map();
  
  async getSession(subAccountId: string): Promise<Session> {
    const sessions = this.pool.get(subAccountId) || [];
    
    if (sessions.length > 0) {
      return sessions.pop()!; // Reuse existing session
    }
    
    // Create new session if pool empty
    const contextId = await getContextForSubAccount(subAccountId);
    return await createBrowserSession(contextId);
  }
  
  async returnSession(subAccountId: string, session: Session) {
    const sessions = this.pool.get(subAccountId) || [];
    sessions.push(session);
    this.pool.set(subAccountId, sessions);
  }
}
```

**Benefits**:
- Instant session availability
- Reduced session creation overhead
- Better resource utilization

---

## 5. Recommended Architecture for GHL Agent AI

### Authentication Flow

```
User Onboarding
  ↓
1. Store GHL credentials in 1Password Connect
  ↓
2. Create Browserbase Context for sub-account
  ↓
3. First login (manual or automated)
  ↓
4. Context saves cookies/auth tokens
  ↓
5. Future automations reuse context (no login)
```

### 2FA Handling Flow

```
Login Attempt
  ↓
GHL sends 2FA code to email
  ↓
Poll Gmail API for verification email
  ↓
Extract 6-digit code
  ↓
Auto-fill code in GHL login form
  ↓
Complete authentication
  ↓
Save session to context
```

### Concurrent Automation Flow

```
Task Queue (n8n webhook)
  ↓
Assign task to available GHL user account
  ↓
Retrieve context for that user
  ↓
Create Browserbase session with context
  ↓
Execute automation with Stagehand
  ↓
Save results to database
  ↓
Return session to pool
```

---

## 6. Implementation Checklist

### Phase 1: Credential Management
- [ ] Deploy 1Password Connect Server
- [ ] Create vaults for GHL credentials
- [ ] Implement credential retrieval API
- [ ] Encrypt credentials at rest

### Phase 2: Email 2FA
- [ ] Set up Gmail API OAuth flow
- [ ] Implement verification code extraction
- [ ] Build retry logic for email delays
- [ ] Test with multiple email providers

### Phase 3: Session Persistence
- [ ] Create Browserbase contexts for each sub-account
- [ ] Implement context management API
- [ ] Build context-to-sub-account mapping
- [ ] Test login persistence across sessions

### Phase 4: Concurrent Automation
- [ ] Analyze GHL user account limits
- [ ] Create multiple GHL users per sub-account
- [ ] Implement session pooling
- [ ] Test concurrent automation limits

### Phase 5: Monitoring & Security
- [ ] Implement context rotation (periodic re-authentication)
- [ ] Monitor for session expiration
- [ ] Build alerting for failed authentications
- [ ] Audit log for all credential access

---

## 7. Cost Analysis

### 1Password Connect Server
- **Cost**: Included in 1Password Business ($7.99/user/month)
- **Deployment**: Self-hosted (Docker container)
- **Infrastructure**: $10-20/month (small VM)

### Gmail API
- **Cost**: Free (generous quotas)
- **Rate Limits**: 250 quota units per user per second

### Browserbase
- **Developer Plan**: $150/month (10 concurrent sessions)
- **Growth Plan**: $500/month (50 concurrent sessions)
- **Recommended**: Start with Developer, scale to Growth

### Total Monthly Cost (Authentication Infrastructure)
- **Starter**: $170/month (1Password + Browserbase Developer)
- **Growth**: $520/month (1Password + Browserbase Growth)

---

*This research provides the foundation for building a secure, scalable authentication system for GHL Agent AI that handles credential storage, 2FA automation, session persistence, and concurrent browser management.*
