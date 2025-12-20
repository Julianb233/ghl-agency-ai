# Email/Password Authentication Schema

This document describes the database schema for email/password authentication in GHL Agency AI.

## Overview

The authentication system supports multiple login methods:
- **Email/Password** (primary focus of this implementation)
- **Google OAuth** (existing)
- **Manus OAuth** (existing)

## Schema Files

### Core Schema (`schema.ts`)

Enhanced `users` table with:
- Email field (required, unique, indexed)
- Password field (hashed with bcryptjs)
- Login method field (default: 'email')
- Proper indexes for efficient login queries

**Key Fields:**
```typescript
- id: serial (primary key)
- email: varchar(320) - unique, indexed
- password: text - bcrypt hashed
- loginMethod: varchar(64) - 'email' | 'google' | 'manus'
- role: varchar(20) - default 'user'
- name: text
- createdAt, updatedAt, lastSignedIn: timestamps
```

**Indexes:**
- `users_email_idx` - Fast email lookups
- `users_login_method_idx` - Filter by auth method
- `users_email_login_method_idx` - Composite for login queries

### Authentication Extension (`schema-auth.ts`)

Additional tables for auth features:

#### 1. `password_reset_tokens`
Manages password reset flow.

```typescript
- id: serial (primary key)
- userId: integer (foreign key to users.id)
- token: text (bcrypt hashed, unique)
- expiresAt: timestamp
- usedAt: timestamp (null until used)
- createdAt: timestamp
```

**Indexes:**
- User ID (find user's tokens)
- Token (fast token lookup)
- Expiration (cleanup expired tokens)

#### 2. `email_verification_tokens`
Manages email verification flow.

```typescript
- id: serial (primary key)
- userId: integer (foreign key to users.id)
- token: text (bcrypt hashed, unique)
- expiresAt: timestamp
- verifiedAt: timestamp (null until verified)
- createdAt: timestamp
```

**Indexes:**
- User ID
- Token
- Expiration

#### 3. `login_attempts`
Tracks login attempts for security and rate limiting.

```typescript
- id: serial (primary key)
- email: varchar(320)
- ipAddress: varchar(45) (IPv4 or IPv6)
- userAgent: text
- success: boolean
- failureReason: varchar(100)
- attemptedAt: timestamp
```

**Indexes:**
- Email (find attempts by user)
- IP address (rate limit by IP)
- Email + attempted time (recent attempts)
- Attempted time (cleanup old data)

## Usage

### 1. Generate and Push Schema

```bash
# Generate migration
pnpm db:generate

# Push to database
pnpm db:push
```

### 2. User Registration

```typescript
import { registerUser } from './server/auth/email-password';

const result = await registerUser({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe'
});

// Send verification email with result.verificationToken
console.log('User ID:', result.user.id);
console.log('Verification token:', result.verificationToken);
```

### 3. User Login

```typescript
import { loginWithEmailPassword } from './server/auth/email-password';

const result = await loginWithEmailPassword(
  {
    email: 'user@example.com',
    password: 'SecurePassword123!'
  },
  '192.168.1.1', // IP address
  'Mozilla/5.0...' // User agent
);

if (result.success) {
  // Create session for result.user
  console.log('Login successful:', result.user);
} else {
  console.log('Login failed:', result.reason);
  // Possible reasons: 'invalid_credentials', 'account_suspended', 'too_many_attempts'
}
```

### 4. Password Reset Flow

**Step 1: Request reset**
```typescript
import { createPasswordResetToken } from './server/auth/email-password';

const { token, expiresAt } = await createPasswordResetToken('user@example.com');

// Send email with reset link: https://yourapp.com/reset-password?token={token}
```

**Step 2: Reset password**
```typescript
import { resetPassword } from './server/auth/email-password';

await resetPassword(token, 'NewSecurePassword123!');
```

### 5. Email Verification

```typescript
import { verifyEmail } from './server/auth/email-password';

const result = await verifyEmail(token);
console.log('Email verified for user ID:', result.userId);
```

### 6. Password Validation

```typescript
import { validatePassword, validateEmail } from './server/auth/email-password';

const passwordErrors = validatePassword('weak');
// Returns: ['Password must be at least 8 characters long', ...]

const isValidEmail = validateEmail('user@example.com');
// Returns: true
```

## Security Features

### Password Hashing
- Uses bcryptjs with 10 salt rounds
- Never stores plaintext passwords
- Tokens are also hashed before storage

### Rate Limiting
- Maximum 5 failed login attempts per hour per email/IP combination
- Tracked in `login_attempts` table

### Token Security
- Password reset tokens expire after 24 hours
- Email verification tokens expire after 72 hours
- Tokens are cryptographically secure (32 random bytes)
- Tokens are hashed before database storage

### Login Attempt Tracking
- All login attempts are logged
- Includes IP address and user agent
- Tracks success/failure and failure reasons
- Enables security monitoring and analytics

## Configuration

Edit constants in `server/auth/email-password.ts`:

```typescript
const BCRYPT_ROUNDS = 10; // Hash strength
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 72;
const MAX_LOGIN_ATTEMPTS_PER_HOUR = 5;
```

## Password Requirements

Default validation rules:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

Customize in the `validatePassword` function.

## Database Cleanup

Consider adding cron jobs to:
1. Delete expired password reset tokens
2. Delete expired email verification tokens
3. Archive old login attempts (older than 30 days)

Example cleanup query:
```typescript
import { db } from './server/db';
import { passwordResetTokens } from './drizzle/schema';
import { lt } from 'drizzle-orm';

// Delete expired reset tokens
await db.delete(passwordResetTokens)
  .where(lt(passwordResetTokens.expiresAt, new Date()));
```

## Integration with Existing OAuth

The schema is designed to coexist with OAuth authentication:

- `loginMethod` field distinguishes between auth methods
- OAuth users have NULL password field
- Email is still required for all users
- Same session table is used for all auth methods

## Next Steps

1. **Run migrations:**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

2. **Implement auth endpoints:**
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/request-reset
   - POST /api/auth/reset-password
   - POST /api/auth/verify-email

3. **Add email service:**
   - Integrate with your email provider
   - Send verification emails
   - Send password reset emails

4. **Session management:**
   - Use existing `sessions` table
   - Create session after successful login
   - Implement session validation middleware

5. **Frontend integration:**
   - Create registration form
   - Create login form
   - Create password reset flow
   - Add email verification UI

## Example API Routes

See `server/auth/email-password.ts` for complete implementation examples.

```typescript
// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  const result = await registerUser({ email, password, name });

  // Send verification email here

  res.json({ success: true, userId: result.user.id });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await loginWithEmailPassword(
    { email, password },
    ipAddress,
    userAgent
  );

  if (!result.success) {
    return res.status(401).json({ error: result.reason });
  }

  // Create session here

  res.json({ success: true, user: result.user });
});
```

## TypeScript Types

All types are exported from the schema:

```typescript
import type {
  User,
  InsertUser,
  PasswordResetToken,
  EmailVerificationToken,
  LoginAttempt,
  EmailPasswordCredentials,
  UserRegistration,
  PasswordResetRequest,
  PasswordResetConfirm,
  EmailVerificationRequest,
} from './drizzle/schema';
```

## Support

For questions or issues with the authentication schema, refer to:
- Drizzle ORM documentation: https://orm.drizzle.team/
- bcryptjs documentation: https://www.npmjs.com/package/bcryptjs
- This README and inline code comments
