# Multi-Tenant Namespace Isolation Implementation

## Overview

This implementation provides comprehensive multi-tenant isolation for the ghl-agency-ai project, ensuring that user data, memory, and reasoning patterns are securely isolated between tenants.

## Architecture

### Core Components

1. **TenantIsolationService** (`server/services/tenantIsolation.service.ts`)
   - Manages tenant context using AsyncLocalStorage
   - Provides namespace prefixing for memory isolation
   - Database query filtering helpers
   - Audit logging for tenant operations

2. **Tenant Middleware** (`server/api/rest/middleware/tenantMiddleware.ts`)
   - Extracts tenant context from authenticated requests
   - Makes tenant context available throughout request lifecycle
   - Supports multiple tenancy models (user-based, org-based, subdomain-based)

3. **Updated Memory Services**
   - `agentMemory.service.ts` - Tenant-isolated agent memory
   - `reasoningBank.service.ts` - Tenant-isolated reasoning patterns

4. **Database Helpers** (`server/services/dbHelpers.service.ts`)
   - Utility functions for tenant-scoped queries
   - Ownership validation helpers
   - Data access helpers

## How It Works

### 1. AsyncLocalStorage for Context Propagation

The implementation uses Node.js AsyncLocalStorage to maintain tenant context throughout the async call chain without explicitly passing it through every function.

```typescript
import { getTenantService } from './services/tenantIsolation.service';

const tenantService = getTenantService();

// Context is automatically available in all downstream operations
const context = tenantService.getTenantContext();
// { userId: 123, tenantId: 'tenant_123', email: 'user@example.com' }
```

### 2. Automatic Namespace Prefixing

Memory keys and session IDs are automatically prefixed with tenant information:

```typescript
// Before: sessionId = "abc123"
// After:  sessionId = "tenant:tenant_123:user:123:abc123"

// Before: key = "agent-state"
// After:  key = "tenant:tenant_123:123:agent-state"
```

### 3. Database Row-Level Filtering

All database queries automatically filter by `userId` to ensure data isolation:

```typescript
// Automatically adds: WHERE userId = <current-tenant-userId>
const entries = await agentMemory.retrieveContext(sessionId);
```

## Usage Guide

### Setting Up Tenant Context in API Routes

#### Option 1: User-Based Tenancy (Default)

```typescript
import { requireApiKey } from './middleware/authMiddleware';
import { tenantContextMiddleware } from './middleware/tenantMiddleware';

// Apply middleware in order
router.use(requireApiKey);           // 1. Authenticate user
router.use(tenantContextMiddleware); // 2. Establish tenant context

router.get('/api/v1/documents', async (req, res) => {
  // Tenant context is automatically available
  // All operations are scoped to the authenticated user's tenant
  const docs = await getDocuments(); // Automatically filtered
  res.json(docs);
});
```

#### Option 2: Organization-Based Tenancy

```typescript
import { orgBasedTenantContext } from './middleware/tenantMiddleware';

router.use(requireApiKey);
router.use(orgBasedTenantContext); // Requires x-organization-id header

// Now all operations are scoped to the organization, not just the user
```

#### Option 3: Subdomain-Based Tenancy

```typescript
import { subdomainBasedTenantContext } from './middleware/tenantMiddleware';

router.use(requireApiKey);
router.use(subdomainBasedTenantContext); // Extracts tenant from subdomain

// Tenant is determined by subdomain (e.g., acme.yourdomain.com)
```

### Using Tenant-Aware Memory Services

#### Agent Memory Service

```typescript
import { getAgentMemory } from './services/memory/agentMemory.service';

const agentMemory = getAgentMemory();

// Store memory - automatically scoped to tenant
await agentMemory.storeContext(
  'session-123',
  'agent-state',
  { thinking: 'reasoning data' },
  {
    ttl: 3600, // 1 hour
    metadata: { purpose: 'task-execution' }
  }
);

// Retrieve memory - automatically filtered by tenant
const entries = await agentMemory.retrieveContext('session-123');
// Only returns entries that belong to current tenant

// Search memory - automatically scoped
const results = await agentMemory.searchContext({
  namespace: 'agent-memory',
  type: 'context',
  limit: 50
});
```

#### Reasoning Bank Service

```typescript
import { getReasoningBank } from './services/memory/reasoningBank.service';

const reasoningBank = getReasoningBank();

// Store reasoning pattern - automatically scoped to tenant
await reasoningBank.storeReasoning(
  'When user asks for X, do Y',
  { action: 'Y', confidence: 0.9 },
  {
    domain: 'customer-support',
    tags: ['faq', 'automation']
  }
);

// Find similar patterns - only searches within tenant's patterns
const similar = await reasoningBank.findSimilarReasoning(
  'user asks for help',
  {
    domain: 'customer-support',
    minConfidence: 0.7,
    limit: 5
  }
);
```

### Using Database Helpers

#### Simple Tenant Filtering

```typescript
import { createTenantWhere, getCurrentTenantUserId } from './services/dbHelpers.service';
import { documents } from '../drizzle/schema';

// Option 1: Using helper function
const where = createTenantWhere(
  documents.userId,
  eq(documents.type, 'pdf'),
  eq(documents.isActive, true)
);

const results = await db.select().from(documents).where(where);

// Option 2: Manual approach with userId
const userId = getCurrentTenantUserId();
const results = await db
  .select()
  .from(documents)
  .where(and(
    eq(documents.userId, userId),
    eq(documents.type, 'pdf')
  ));
```

#### Using TenantDataAccess Helper

```typescript
import { createTenantDataAccess } from './services/dbHelpers.service';
import { documents } from '../drizzle/schema';

const dataAccess = createTenantDataAccess();

// Find by ID with automatic tenant validation
const doc = await dataAccess.findById(documents, 123);
// Returns null if document doesn't belong to tenant

// Find all for tenant
const allDocs = await dataAccess.findAll(documents, {
  limit: 100,
  offset: 0
});

// Update with ownership validation
const updated = await dataAccess.updateById(
  documents,
  123,
  { name: 'Updated Name' }
);

// Delete with ownership validation
const deleted = await dataAccess.deleteById(documents, 123);
```

#### Manual Ownership Validation

```typescript
import { requireTenantOwnership, validateTenantOwnership } from './services/dbHelpers.service';

// Fetch some data
const document = await db.select().from(documents).where(eq(documents.id, 123));

// Option 1: Validate and throw if not owned
try {
  requireTenantOwnership(document.userId, 'document');
  // Safe to proceed
  await updateDocument(document);
} catch (error) {
  // Access denied
}

// Option 2: Check ownership boolean
if (validateTenantOwnership(document.userId)) {
  await updateDocument(document);
} else {
  throw new Error('Access denied');
}
```

### Running Operations Without Tenant Context (Testing/Scripts)

```typescript
import { withTenantContext } from './services/tenantIsolation.service';

// For testing or background jobs
await withTenantContext(
  {
    userId: 123,
    tenantId: 'tenant_123',
    email: 'test@example.com'
  },
  async () => {
    // All operations here have tenant context
    await agentMemory.storeContext('session', 'key', 'value');
  }
);
```

## Configuration Options

### Enable Strict Mode

```typescript
import { getTenantService } from './services/tenantIsolation.service';

const tenantService = getTenantService({
  enableStrictMode: true, // Throw error if tenant context missing
  enableAuditLog: true,   // Log all tenant operations
  namespacePrefix: 'tenant' // Custom namespace prefix
});
```

### Audit Logging

When `enableAuditLog: true`, all tenant operations are logged:

```json
{
  "timestamp": "2025-12-15T22:00:00.000Z",
  "tenantId": "tenant_123",
  "userId": 123,
  "requestId": "req_1234567890_abc123",
  "operation": "memory.store",
  "sessionId": "tenant:tenant_123:user:123:session-123",
  "key": "tenant:tenant_123:123:agent-state"
}
```

## Security Benefits

1. **Memory Isolation**: Memory keys and sessions are prefixed with tenant info, preventing cross-tenant data access
2. **Database Isolation**: All queries automatically filter by userId/tenantId
3. **Ownership Validation**: Helper functions verify data ownership before operations
4. **Audit Trail**: Optional logging of all tenant operations
5. **Request-Scoped Context**: AsyncLocalStorage ensures context doesn't leak between requests

## Backward Compatibility

The implementation is backward compatible:
- Services work without tenant context (falls back to original behavior)
- No breaking changes to existing API
- Gradual adoption possible (add middleware route-by-route)

## Testing Tenant Isolation

### Unit Test Example

```typescript
import { withTenantContext } from './services/tenantIsolation.service';
import { getAgentMemory } from './services/memory/agentMemory.service';

describe('Tenant Isolation', () => {
  it('should isolate memory between tenants', async () => {
    const agentMemory = getAgentMemory();

    // Tenant 1 stores data
    await withTenantContext({ userId: 1, tenantId: 'tenant_1' }, async () => {
      await agentMemory.storeContext('session', 'key', 'value1');
    });

    // Tenant 2 stores data
    await withTenantContext({ userId: 2, tenantId: 'tenant_2' }, async () => {
      await agentMemory.storeContext('session', 'key', 'value2');
    });

    // Tenant 1 retrieves data
    const tenant1Data = await withTenantContext(
      { userId: 1, tenantId: 'tenant_1' },
      async () => {
        return agentMemory.retrieveByKey('session', 'key');
      }
    );

    expect(tenant1Data?.value).toBe('value1');

    // Tenant 2 retrieves data
    const tenant2Data = await withTenantContext(
      { userId: 2, tenantId: 'tenant_2' },
      async () => {
        return agentMemory.retrieveByKey('session', 'key');
      }
    );

    expect(tenant2Data?.value).toBe('value2');
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { app } from './app';

describe('API Tenant Isolation', () => {
  it('should only return user\'s own documents', async () => {
    // User 1 API key
    const response1 = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', 'Bearer ghl_user1_key');

    // User 2 API key
    const response2 = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', 'Bearer ghl_user2_key');

    // Verify no overlap
    const ids1 = response1.body.map(d => d.id);
    const ids2 = response2.body.map(d => d.id);

    expect(ids1).not.toEqual(expect.arrayContaining(ids2));
    expect(ids2).not.toEqual(expect.arrayContaining(ids1));
  });
});
```

## Migration Guide

### Existing Services Without Tenant Isolation

If you have existing services that need tenant isolation:

1. **Import tenant service**:
   ```typescript
   import { getTenantService } from './tenantIsolation.service';
   ```

2. **Add tenant service to class**:
   ```typescript
   private tenantService = getTenantService();
   ```

3. **Add tenant filtering to queries**:
   ```typescript
   // Before
   const data = await db.select().from(table).where(eq(table.id, id));

   // After
   const userId = this.tenantService.getUserId();
   const data = await db
     .select()
     .from(table)
     .where(and(
       eq(table.id, id),
       eq(table.userId, userId)
     ));
   ```

4. **Add ownership validation**:
   ```typescript
   this.tenantService.requireTenantOwnership(data.userId, 'resource');
   ```

## Files Modified/Created

### Created Files
- `/server/services/tenantIsolation.service.ts` - Core tenant isolation service
- `/server/api/rest/middleware/tenantMiddleware.ts` - Tenant context middleware
- `/server/services/dbHelpers.service.ts` - Database query helpers
- `/TENANT_ISOLATION_IMPLEMENTATION.md` - This documentation

### Modified Files
- `/server/services/memory/agentMemory.service.ts` - Added tenant isolation
- `/server/services/memory/reasoningBank.service.ts` - Added tenant isolation

## Future Enhancements

1. **Row-Level Security (RLS)**: Consider PostgreSQL RLS for database-level enforcement
2. **Vector Search Isolation**: Ensure vector embeddings are tenant-scoped
3. **Cache Isolation**: Ensure Redis/in-memory caches are tenant-aware
4. **Rate Limiting**: Per-tenant rate limits
5. **Metrics**: Per-tenant usage metrics and analytics

## Support

For questions or issues with tenant isolation:
1. Check this documentation
2. Review example usage in test files
3. Enable audit logging for debugging
4. Check AsyncLocalStorage context availability

## Best Practices

1. **Always use middleware**: Don't bypass tenant middleware in API routes
2. **Validate ownership**: Use helpers before sensitive operations
3. **Test isolation**: Write tests to verify cross-tenant access is blocked
4. **Enable audit logging**: In production for security monitoring
5. **Monitor context**: Ensure AsyncLocalStorage context is properly maintained
