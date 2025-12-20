# Quick Start: Email/Password Authentication

## 1. Run Migrations

```bash
pnpm db:generate  # Generate migration files
pnpm db:push      # Apply to database
```

## 2. Import & Use

```typescript
import {
  registerUser,
  loginWithEmailPassword,
  createPasswordResetToken,
  resetPassword,
  verifyEmail,
  validatePassword,
  validateEmail,
} from './server/auth/email-password';
```

## 3. Common Operations

### Register a User

```typescript
const result = await registerUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe'
});

// result.user - the created user
// result.verificationToken - send this in verification email
```

### Login

```typescript
const result = await loginWithEmailPassword(
  { email: 'user@example.com', password: 'SecurePass123!' },
  req.ip,           // IP address for rate limiting
  req.headers['user-agent']  // Optional user agent
);

if (result.success) {
  // Create session for result.user
} else {
  // Handle error: result.reason
}
```

### Password Reset

```typescript
// Step 1: Create token
const { token } = await createPasswordResetToken('user@example.com');
// Send email with token

// Step 2: Reset password
await resetPassword(token, 'NewPassword123!');
```

### Email Verification

```typescript
const result = await verifyEmail(token);
// result.userId - the verified user
```

### Validation

```typescript
// Password validation
const errors = validatePassword('weak');
if (errors.length > 0) {
  console.log('Password issues:', errors);
}

// Email validation
if (!validateEmail('user@example.com')) {
  console.log('Invalid email format');
}
```

## 4. Database Schema

### Core Tables

**users** - Enhanced with indexes
```typescript
- email: unique, indexed
- password: bcrypt hashed
- loginMethod: 'email' | 'google' | 'manus'
```

**password_reset_tokens**
```typescript
- userId, token (hashed), expiresAt, usedAt
```

**email_verification_tokens**
```typescript
- userId, token (hashed), expiresAt, verifiedAt
```

**login_attempts**
```typescript
- email, ipAddress, success, failureReason, attemptedAt
```

## 5. Security Features

- Password hashing: bcryptjs (10 rounds)
- Rate limiting: 5 failed attempts per hour
- Token expiration: 24h (reset), 72h (verification)
- Secure token generation: 32 random bytes
- Login attempt tracking: IP + user agent

## 6. Configuration

Edit `/server/auth/email-password.ts`:

```typescript
const BCRYPT_ROUNDS = 10;
const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24;
const EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 72;
const MAX_LOGIN_ATTEMPTS_PER_HOUR = 5;
```

## 7. Full Documentation

See `/drizzle/README-AUTH.md` for complete documentation.
