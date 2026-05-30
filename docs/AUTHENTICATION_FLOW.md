# Authentication Flow Documentation

**Complete technical reference for authentication mechanisms in GHL Agency AI**

## Overview

GHL Agency AI implements a multi-layered authentication system supporting three distinct authentication methods:

1. **JWT Session-Based Authentication** - For web browser sessions
2. **API Key Authentication** - For server-to-server and external integrations
3. **Email/Password Authentication** - For direct user login

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Authentication Layer                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Email/     │   │    Google    │   │    OAuth     │   │   API Key    │ │
│  │   Password   │   │    OAuth     │   │   (Manus)    │   │   (Bearer)   │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘ │
│         │                  │                  │                   │         │
│         v                  v                  v                   v         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Request Handler                                │  │
│  │                                                                       │  │
│  │   1. Extract credentials from request                                 │  │
│  │   2. Validate authentication method                                   │  │
│  │   3. Look up user in database                                         │  │
│  │   4. Return authenticated user context                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    v                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         User Context                                  │  │
│  │   - userId, email, name                                               │  │
│  │   - Permissions & scopes                                              │  │
│  │   - Tenant isolation context                                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. JWT Session-Based Authentication

### How It Works

JWT (JSON Web Token) sessions are the primary authentication method for web browser users. The system uses the `jose` library for JWT signing and verification with HS256 algorithm.

### Token Structure

```typescript
// JWT Payload (SessionPayload)
interface SessionPayload {
  openId: string;    // Unique user identifier
  appId: string;     // Application identifier (e.g., "google-oauth", "default-app")
  name: string;      // User display name
}

// JWT Header
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                        JWT Session Flow                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Login Request                                                      │
│        │                                                             │
│        v                                                             │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 1. Validate credentials (email/password,   │                   │
│   │    Google OAuth, or Manus OAuth)           │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 2. Create JWT with SignJWT (jose)          │                   │
│   │    - Set payload (openId, appId, name)     │                   │
│   │    - Sign with JWT_SECRET (HS256)          │                   │
│   │    - Set expiration (1 year default)       │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 3. Set HTTP-only session cookie            │                   │
│   │    - Cookie name: "session"                │                   │
│   │    - HttpOnly: true                        │                   │
│   │    - Secure: true (in production)          │                   │
│   │    - SameSite: Lax                         │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   Authenticated Session Active                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Implementation Files

| File | Purpose |
|------|---------|
| `server/_core/sdk.ts` | JWT creation (`signSession`) and verification (`verifySession`) |
| `server/_core/cookies.ts` | Cookie configuration options |
| `server/_core/oauth.ts` | Manus OAuth integration |
| `server/_core/google-auth.ts` | Google OAuth integration |

### Session Verification Flow

```typescript
// From server/_core/sdk.ts
async verifySession(cookieValue: string | null): Promise<SessionPayload | null> {
  // 1. Check if cookie exists
  if (!cookieValue) return null;
  
  // 2. Verify JWT signature with secret key
  const { payload } = await jwtVerify(cookieValue, secretKey, {
    algorithms: ["HS256"]
  });
  
  // 3. Validate required fields
  const { openId, appId, name } = payload;
  if (!openId || !appId || !name) return null;
  
  return { openId, appId, name };
}
```

### Request Authentication

```typescript
// From server/_core/sdk.ts - authenticateRequest()
async authenticateRequest(req: Request): Promise<User> {
  // 1. Parse session cookie from request
  const sessionCookie = cookies.get(COOKIE_NAME);
  
  // 2. Verify JWT token
  const session = await this.verifySession(sessionCookie);
  
  // 3. Look up user by openId (Manus), googleId (Google), or email ID
  let user = await db.getUserByOpenId(session.openId);
  if (!user) user = await db.getUserByGoogleId(session.openId);
  if (!user && session.openId.startsWith("email_")) {
    user = await db.getUserById(parseInt(session.openId.replace("email_", "")));
  }
  
  // 4. Return authenticated user
  return user;
}
```

---

## 2. API Key Authentication

### Key Format

All API keys follow this format:
```
ghl_<32-character-base64url-string>
```

Example: `ghl_a7f3c1d8e9b2g4h6j8k0l2m4n6p8r0s2`

### Security Model

1. **Generation**: Keys are generated using `crypto.randomBytes(24)` (192 bits of entropy)
2. **Storage**: Only SHA-256 hash is stored in database (never the raw key)
3. **Display**: Only first 12 characters (prefix) shown after creation
4. **Scopes**: Fine-grained permission control per key

### Available Scopes

| Scope | Permission |
|-------|------------|
| `*` | Full access to all endpoints |
| `tasks:read` | Read tasks and execution history |
| `tasks:write` | Create, update, and delete tasks |
| `tasks:execute` | Trigger task execution |
| `executions:read` | Read execution details and logs |
| `templates:read` | Browse and use templates |

### API Key Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      API Key Authentication                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   API Request with Bearer Token                                      │
│   Authorization: Bearer ghl_xxxxxxxxxxxx                            │
│        │                                                             │
│        v                                                             │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 1. Extract API key from Authorization header│                   │
│   │    - Parse "Bearer <key>" format            │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 2. Hash the provided key (SHA-256)         │                   │
│   │    - Compare with stored keyHash           │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 3. Validate key                            │                   │
│   │    - Check isActive = true                 │                   │
│   │    - Check not expired (expiresAt)         │                   │
│   │    - Check not revoked (revokedAt)         │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 4. Check rate limits                       │                   │
│   │    - Per-minute, per-hour, per-day limits  │                   │
│   │    - Redis-backed token bucket algorithm   │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 5. Verify scope for requested endpoint     │                   │
│   │    - Match required scope against key scopes│                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   Request Authorized → Execute Endpoint                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Management Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `apiKeys.list` | Query | List all API keys for user |
| `apiKeys.create` | Mutation | Create new API key (returns full key once) |
| `apiKeys.update` | Mutation | Update key name, scopes, limits |
| `apiKeys.revoke` | Mutation | Revoke/disable an API key |
| `apiKeys.getUsageStats` | Query | Get key usage statistics |

### Implementation File

- `server/api/routers/apiKeys.ts` - Full CRUD operations, rate limiting, scope management

---

## 3. Email/Password Authentication

### Password Security

- **Hashing Algorithm**: bcrypt with 10 rounds
- **Token Generation**: `crypto.randomBytes(32)` for reset/verification tokens
- **Rate Limiting**: 5 failed attempts per hour per email/IP combination

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Email/Password Authentication                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Login Request (email, password)                                    │
│        │                                                             │
│        v                                                             │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 1. Check rate limiting                     │                   │
│   │    - Query loginAttempts table             │                   │
│   │    - Block if > 5 failures in last hour    │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 2. Find user by email                      │                   │
│   │    - Normalize email (lowercase, trim)     │                   │
│   │    - Check loginMethod = "email"           │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 3. Verify password                         │                   │
│   │    - bcrypt.compare(input, stored hash)    │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 4. Check account status                    │                   │
│   │    - Not suspended (suspendedAt = null)    │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 5. Create JWT session                      │                   │
│   │    - openId = "email_<userId>"             │                   │
│   │    - Set session cookie                    │                   │
│   └─────────────────┬───────────────────────────┘                   │
│                     │                                                │
│                     v                                                │
│   ┌─────────────────────────────────────────────┐                   │
│   │ 6. Track successful login                  │                   │
│   │    - Update lastSignedIn                   │                   │
│   │    - Record in loginAttempts               │                   │
│   └─────────────────────────────────────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Password Requirements

```typescript
// From server/auth/email-password.ts
function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) 
    errors.push("Password must be at least 8 characters long");
  if (!/[A-Z]/.test(password)) 
    errors.push("Password must contain at least one uppercase letter");
  if (!/[a-z]/.test(password)) 
    errors.push("Password must contain at least one lowercase letter");
  if (!/[0-9]/.test(password)) 
    errors.push("Password must contain at least one number");
  if (!/[^A-Za-z0-9]/.test(password)) 
    errors.push("Password must contain at least one special character");
  
  return errors;
}
```

### Password Reset Flow

1. User requests reset → `createPasswordResetToken(email)`
2. Token generated (32 random bytes), hashed, stored with 24h expiry
3. Unhashed token sent via email
4. User submits token + new password → `resetPassword(token, newPassword)`
5. Token validated, password updated, token marked as used

### Email Verification Flow

1. User registers → `registerUser(data)`
2. Verification token created (72h expiry)
3. Token sent via email
4. User clicks link → `verifyEmail(token)`
5. Account marked as verified

### Implementation File

- `server/auth/email-password.ts` - Registration, login, password reset, email verification

---

## Session Management

### Cookie Configuration

```typescript
// From server/_core/cookies.ts
function getSessionCookieOptions(req: Request) {
  return {
    httpOnly: true,           // Not accessible via JavaScript
    secure: isProduction,     // HTTPS only in production
    sameSite: 'lax',          // CSRF protection
    path: '/',                // Available site-wide
    maxAge: ONE_YEAR_MS,      // 1 year expiration
  };
}
```

### Session Storage

Sessions are stateless - all session data is encoded in the JWT. The server does not maintain a session store.

### Session Termination

- **Logout**: Cookie cleared with `maxAge: 0`
- **Token Expiry**: JWT `exp` claim enforced on verification
- **Account Suspension**: Checked on each authenticated request

---

## Rate Limiting

### Three-Tier Rate Limiting

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Rate Limiting Layers                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Layer 1: Global Rate Limiting (IP-based)                          │
│   ├── Token bucket algorithm                                        │
│   └── Redis-backed for distributed deployment                       │
│                                                                      │
│   Layer 2: API Key Rate Limiting                                    │
│   ├── Per-minute: default 100 requests                              │
│   ├── Per-hour: default 1000 requests                               │
│   └── Per-day: default 10000 requests                               │
│                                                                      │
│   Layer 3: Login Rate Limiting                                      │
│   └── 5 failed attempts per hour per email/IP                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation

- `server/api/rest/middleware/rateLimitMiddleware.ts` - Global and API key rate limiting
- `server/services/redis.service.ts` - Distributed rate limiting with Redis

---

## Security Headers

The application uses Helmet middleware for security headers:

```typescript
// Content Security Policy, HSTS, X-Frame-Options, etc.
app.use(helmet({
  contentSecurityPolicy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
}));
```

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth server URL | No (for Manus auth) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No (for Google auth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No (for Google auth) |

---

## Related Documentation

- [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) - User-facing authentication guide
- [API_DEVELOPER_GUIDE.md](./API_DEVELOPER_GUIDE.md) - API usage documentation
- [security/](./security/) - Security audit reports

---

**Last Updated:** January 2026
**Version:** 1.0.0
