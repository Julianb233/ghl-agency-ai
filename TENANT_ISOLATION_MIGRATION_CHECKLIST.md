# Tenant Isolation Migration Checklist

## Pre-Migration

- [ ] Read `TENANT_ISOLATION_QUICK_START.md`
- [ ] Review `TENANT_ISOLATION_IMPLEMENTATION.md`
- [ ] Understand the three tenancy models (user-based, org-based, subdomain-based)
- [ ] Decide which tenancy model fits your needs (default: user-based)

## Phase 1: Setup & Testing

### 1.1 Enable Audit Logging (Development)
```typescript
// In your app initialization or config
import { getTenantService } from './services/tenantIsolation.service';

const tenantService = getTenantService({
  enableAuditLog: true,      // Log all operations
  enableStrictMode: false,   // Don't throw errors yet
  namespacePrefix: 'tenant'  // Default prefix
});
```

- [ ] Enable audit logging in development environment
- [ ] Monitor logs for tenant operations
- [ ] Verify context is being set correctly

### 1.2 Create Test Route
```typescript
// Create a test route to verify tenant isolation works
import { requireApiKey } from './middleware/authMiddleware';
import { tenantContextMiddleware } from './middleware/tenantMiddleware';

const testRouter = Router();
testRouter.use(requireApiKey, tenantContextMiddleware);

testRouter.get('/test/tenant-info', async (req, res) => {
  const tenantService = getTenantService();
  res.json(tenantService.getTenantMetadata());
});

app.use('/api/v1', testRouter);
```

- [ ] Create test route
- [ ] Test with different API keys
- [ ] Verify different tenants get different contexts
- [ ] Check audit logs

## Phase 2: Memory Services Migration

### 2.1 Memory Services (Already Updated)
- [x] `agentMemory.service.ts` - Updated with tenant isolation
- [x] `reasoningBank.service.ts` - Updated with tenant isolation

### 2.2 Test Memory Isolation
```typescript
import { withTenantContext } from './services/tenantIsolation.service';
import { getAgentMemory } from './services/memory/agentMemory.service';

describe('Memory Isolation', () => {
  it('isolates memory between tenants', async () => {
    const agentMemory = getAgentMemory();

    // Tenant 1 stores data
    await withTenantContext({ userId: 1, tenantId: 'tenant_1' }, async () => {
      await agentMemory.storeContext('session', 'key', 'value1');
    });

    // Tenant 2 stores same key
    await withTenantContext({ userId: 2, tenantId: 'tenant_2' }, async () => {
      await agentMemory.storeContext('session', 'key', 'value2');
    });

    // Verify isolation
    const data1 = await withTenantContext(
      { userId: 1, tenantId: 'tenant_1' },
      async () => agentMemory.retrieveByKey('session', 'key')
    );

    const data2 = await withTenantContext(
      { userId: 2, tenantId: 'tenant_2' },
      async () => agentMemory.retrieveByKey('session', 'key')
    );

    expect(data1?.value).toBe('value1');
    expect(data2?.value).toBe('value2');
    expect(data1?.id).not.toBe(data2?.id);
  });
});
```

- [ ] Create test file for memory isolation
- [ ] Run tests to verify isolation
- [ ] Check that old data is still accessible (backward compatibility)

## Phase 3: API Routes Migration

### 3.1 Identify Routes to Migrate
List all API routes that need tenant isolation:

- [ ] `/api/v1/documents/*`
- [ ] `/api/v1/workflows/*`
- [ ] `/api/v1/tasks/*`
- [ ] `/api/v1/clients/*`
- [ ] `/api/v1/integrations/*`
- [ ] Add your routes here...

### 3.2 Apply Middleware to Each Route

**Before**:
```typescript
router.use(requireApiKey);

router.get('/documents', async (req, res) => {
  const docs = await getDocuments();
  res.json(docs);
});
```

**After**:
```typescript
router.use(requireApiKey);
router.use(tenantContextMiddleware); // Add this

router.get('/documents', async (req, res) => {
  const docs = await getDocuments(); // Now tenant-aware
  res.json(docs);
});
```

- [ ] Route group 1: `/api/v1/documents/*`
- [ ] Route group 2: `/api/v1/workflows/*`
- [ ] Route group 3: Add your routes...

### 3.3 Update Data Access Patterns

#### Pattern A: Using TenantDataAccess Helper
**Before**:
```typescript
const db = await getDb();
const docs = await db
  .select()
  .from(documents)
  .where(eq(documents.userId, req.user.id));
```

**After**:
```typescript
import { createTenantDataAccess } from './services/dbHelpers.service';

const dataAccess = createTenantDataAccess();
const docs = await dataAccess.findAll(documents);
// userId filter is automatic
```

- [ ] Identify queries that filter by userId
- [ ] Replace with TenantDataAccess helpers
- [ ] Test each change

#### Pattern B: Using createTenantWhere Helper
**Before**:
```typescript
const where = and(
  eq(documents.userId, req.user.id),
  eq(documents.type, 'pdf'),
  eq(documents.isActive, true)
);
```

**After**:
```typescript
import { createTenantWhere } from './services/dbHelpers.service';

const where = createTenantWhere(
  documents.userId,
  eq(documents.type, 'pdf'),
  eq(documents.isActive, true)
);
// userId filter is automatic
```

- [ ] Identify complex queries
- [ ] Replace userId filtering with createTenantWhere
- [ ] Test each change

#### Pattern C: Manual userId Injection
**Before**:
```typescript
await db.insert(documents).values({
  name: req.body.name,
  userId: req.user.id, // Manual
});
```

**After**:
```typescript
import { getCurrentTenantUserId } from './services/dbHelpers.service';

await db.insert(documents).values({
  name: req.body.name,
  userId: getCurrentTenantUserId(), // From context
});
```

- [ ] Identify INSERT operations
- [ ] Replace manual userId with getCurrentTenantUserId()
- [ ] Test each change

### 3.4 Add Ownership Validation

For UPDATE and DELETE operations:

**Before**:
```typescript
router.delete('/documents/:id', async (req, res) => {
  const db = await getDb();
  await db.delete(documents).where(eq(documents.id, req.params.id));
  res.json({ success: true });
});
```

**After**:
```typescript
import { createTenantDataAccess } from './services/dbHelpers.service';

router.delete('/documents/:id', async (req, res) => {
  const dataAccess = createTenantDataAccess();
  const deleted = await dataAccess.deleteById(documents, req.params.id);

  if (!deleted) {
    return res.status(404).json({ error: 'Not found or access denied' });
  }

  res.json({ success: true });
});
```

- [ ] Add ownership validation to UPDATE operations
- [ ] Add ownership validation to DELETE operations
- [ ] Test with cross-tenant access attempts

## Phase 4: Custom Services Migration

### 4.1 Identify Custom Services
List services that need tenant isolation:

- [ ] `knowledge.service.ts` - If it stores user-specific data
- [ ] `rag.service.ts` - If it stores user-specific embeddings
- [ ] Add your services here...

### 4.2 Update Each Service

**Template**:
```typescript
import { getTenantService } from './tenantIsolation.service';

export class YourService {
  private tenantService = getTenantService();

  async yourMethod() {
    // Get tenant context
    const userId = this.tenantService.getUserId();
    const tenantId = this.tenantService.getTenantId();

    // Add to queries
    const data = await db
      .select()
      .from(yourTable)
      .where(eq(yourTable.userId, userId));

    // Validate ownership
    this.tenantService.requireTenantOwnership(data.userId, 'resource');

    return data;
  }
}
```

- [ ] Service 1: knowledge.service.ts
- [ ] Service 2: Add your service...

## Phase 5: Testing

### 5.1 Unit Tests
```typescript
import { withTenantContext } from './services/tenantIsolation.service';

describe('Tenant Isolation - Unit Tests', () => {
  it('filters data by tenant', async () => {
    // Test with tenant 1
    const data1 = await withTenantContext(
      { userId: 1, tenantId: 'tenant_1' },
      async () => await yourService.getData()
    );

    // Test with tenant 2
    const data2 = await withTenantContext(
      { userId: 2, tenantId: 'tenant_2' },
      async () => await yourService.getData()
    );

    // Verify no overlap
    expect(data1).not.toEqual(data2);
  });
});
```

- [ ] Create unit tests for each service
- [ ] Test isolation between tenants
- [ ] Test backward compatibility

### 5.2 Integration Tests
```typescript
import request from 'supertest';

describe('Tenant Isolation - Integration Tests', () => {
  it('prevents cross-tenant data access', async () => {
    // User 1 creates document
    await request(app)
      .post('/api/v1/documents')
      .set('Authorization', 'Bearer ghl_user1_key')
      .send({ name: 'Doc 1' });

    // User 2 tries to access user 1's document
    const response = await request(app)
      .get('/api/v1/documents/1')
      .set('Authorization', 'Bearer ghl_user2_key');

    expect(response.status).toBe(404);
  });
});
```

- [ ] Test API endpoints with different API keys
- [ ] Verify cross-tenant access is blocked
- [ ] Test all CRUD operations

### 5.3 Performance Tests
```typescript
describe('Performance', () => {
  it('maintains performance with tenant context', async () => {
    const start = Date.now();

    await withTenantContext(
      { userId: 1, tenantId: 'tenant_1' },
      async () => {
        for (let i = 0; i < 1000; i++) {
          await yourService.operation();
        }
      }
    );

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5 seconds for 1000 ops
  });
});
```

- [ ] Run performance tests
- [ ] Compare with and without tenant context
- [ ] Monitor AsyncLocalStorage overhead

## Phase 6: Production Deployment

### 6.1 Pre-Production
- [ ] Run all tests in staging environment
- [ ] Enable audit logging in staging
- [ ] Monitor for errors
- [ ] Test with production-like data volumes
- [ ] Verify backward compatibility with existing data

### 6.2 Production Rollout (Gradual)

**Step 1: Monitor-Only Mode**
```typescript
const tenantService = getTenantService({
  enableAuditLog: true,
  enableStrictMode: false, // Don't throw errors
});
```
- [ ] Deploy with audit logging enabled
- [ ] Monitor logs for 24-48 hours
- [ ] Verify tenant context is correct
- [ ] Check for any errors

**Step 2: Strict Mode**
```typescript
const tenantService = getTenantService({
  enableAuditLog: true,
  enableStrictMode: true, // Throw errors
});
```
- [ ] Enable strict mode in production
- [ ] Monitor error rates
- [ ] Fix any issues
- [ ] Verify isolation is working

**Step 3: Full Rollout**
- [ ] Apply to all routes
- [ ] Monitor for 7 days
- [ ] Check performance metrics
- [ ] Verify no data leaks

### 6.3 Post-Deployment
- [ ] Monitor audit logs for unusual patterns
- [ ] Set up alerts for tenant isolation violations
- [ ] Document any issues and resolutions
- [ ] Update team documentation

## Phase 7: Cleanup

### 7.1 Remove Old Patterns
- [ ] Remove manual userId filtering where replaced
- [ ] Remove redundant ownership checks
- [ ] Simplify code using helpers

### 7.2 Documentation
- [ ] Update API documentation
- [ ] Update team wiki/docs
- [ ] Create onboarding guide for new developers
- [ ] Document any custom patterns

### 7.3 Monitoring
- [ ] Set up dashboards for tenant metrics
- [ ] Add alerts for cross-tenant access attempts
- [ ] Monitor AsyncLocalStorage memory usage
- [ ] Track tenant operation performance

## Troubleshooting Checklist

### Issue: "Tenant context not found"
- [ ] Verify middleware is applied in correct order
- [ ] Check that requireApiKey runs before tenantContextMiddleware
- [ ] Verify user is authenticated
- [ ] Check AsyncLocalStorage is supported (Node.js 12.17+)

### Issue: Data not being filtered
- [ ] Verify table has userId column
- [ ] Check that createTenantWhere is used correctly
- [ ] Enable audit logging to see queries
- [ ] Verify tenant context exists

### Issue: Performance degradation
- [ ] Check AsyncLocalStorage overhead
- [ ] Verify database indexes on userId columns
- [ ] Review audit logging impact
- [ ] Check for N+1 queries

### Issue: Cross-tenant data access
- [ ] Check ownership validation is in place
- [ ] Verify middleware is applied to all routes
- [ ] Enable strict mode to catch errors
- [ ] Review audit logs

## Success Criteria

- [ ] All API routes have tenant isolation
- [ ] All memory operations are tenant-scoped
- [ ] All database queries filter by tenant
- [ ] Unit tests pass with >90% coverage
- [ ] Integration tests verify isolation
- [ ] Performance tests show <5% overhead
- [ ] No cross-tenant data access in logs
- [ ] Documentation is complete
- [ ] Team is trained on new patterns

## Timeline Estimate

- **Phase 1-2**: 1-2 days (Setup & Memory)
- **Phase 3**: 3-5 days (API Routes)
- **Phase 4**: 2-3 days (Custom Services)
- **Phase 5**: 2-3 days (Testing)
- **Phase 6**: 1-2 weeks (Gradual Rollout)
- **Phase 7**: 1-2 days (Cleanup)

**Total**: 2-4 weeks for complete migration

## Notes

- Start with least critical routes
- Test extensively before moving to production
- Keep audit logging enabled for at least 30 days
- Monitor performance continuously
- Document any custom patterns or issues
