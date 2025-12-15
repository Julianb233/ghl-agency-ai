# Tenant Isolation - Quick Start Guide

## 5-Minute Setup

### Step 1: Add Middleware to Your API Routes

```typescript
// server/api/rest/routes/yourRoute.ts
import { requireApiKey } from '../middleware/authMiddleware';
import { tenantContextMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Apply middleware in this order
router.use(requireApiKey);           // Authenticate
router.use(tenantContextMiddleware); // Establish tenant context

// Your routes now have automatic tenant isolation
router.get('/data', async (req, res) => {
  // All operations are automatically scoped to the tenant
  const data = await getData(); // Automatically filtered
  res.json(data);
});
```

### Step 2: Use Tenant-Aware Services

#### Memory Services (Already Updated)

```typescript
import { getAgentMemory } from './services/memory/agentMemory.service';

const agentMemory = getAgentMemory();

// Store - automatically scoped to tenant
await agentMemory.storeContext('session', 'key', 'value');

// Retrieve - automatically filtered by tenant
const data = await agentMemory.retrieveContext('session');
```

#### Database Queries

```typescript
import { createTenantDataAccess } from './services/dbHelpers.service';
import { documents } from '../drizzle/schema';

const dataAccess = createTenantDataAccess();

// Find all for tenant
const docs = await dataAccess.findAll(documents);

// Find by ID with ownership check
const doc = await dataAccess.findById(documents, 123);

// Update with ownership check
await dataAccess.updateById(documents, 123, { name: 'New Name' });

// Delete with ownership check
await dataAccess.deleteById(documents, 123);
```

### Step 3: That's It!

Your API is now multi-tenant isolated. All memory operations and database queries are automatically scoped to the authenticated user's tenant.

## Common Patterns

### Pattern 1: Simple CRUD Endpoint

```typescript
router.use(requireApiKey, tenantContextMiddleware);

router.get('/items', async (req, res) => {
  const dataAccess = createTenantDataAccess();
  const items = await dataAccess.findAll(itemsTable);
  res.json(items);
});

router.post('/items', async (req, res) => {
  const db = await getDb();
  const userId = getCurrentTenantUserId();

  const item = await db.insert(itemsTable).values({
    ...req.body,
    userId, // Auto-inject tenant userId
  });

  res.json(item);
});
```

### Pattern 2: Memory-Based Operations

```typescript
router.use(requireApiKey, tenantContextMiddleware);

router.post('/agent/run', async (req, res) => {
  const agentMemory = getAgentMemory();

  // Store context - tenant-isolated
  await agentMemory.storeContext('session', 'state', req.body.state);

  // Run agent logic...

  // Retrieve context - only gets this tenant's data
  const context = await agentMemory.retrieveContext('session');

  res.json({ result: context });
});
```

### Pattern 3: Ownership Validation

```typescript
router.use(requireApiKey, tenantContextMiddleware);

router.delete('/items/:id', async (req, res) => {
  const db = await getDb();

  // Fetch item
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, req.params.id));

  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Validate ownership
  requireTenantOwnership(item.userId, 'item');

  // Delete
  await db.delete(itemsTable).where(eq(itemsTable.id, req.params.id));

  res.json({ success: true });
});
```

## Testing

```typescript
import { withTenantContext } from './services/tenantIsolation.service';

describe('Tenant Isolation', () => {
  it('isolates data between tenants', async () => {
    // Tenant 1
    await withTenantContext({ userId: 1, tenantId: 'tenant_1' }, async () => {
      await storeData('key', 'value1');
    });

    // Tenant 2
    await withTenantContext({ userId: 2, tenantId: 'tenant_2' }, async () => {
      await storeData('key', 'value2');
    });

    // Verify isolation
    const data1 = await withTenantContext(
      { userId: 1, tenantId: 'tenant_1' },
      () => getData('key')
    );
    expect(data1).toBe('value1');
  });
});
```

## Troubleshooting

### "Tenant context not found"

**Solution**: Ensure middleware is applied in correct order:
```typescript
router.use(requireApiKey);           // First
router.use(tenantContextMiddleware); // Second
```

### Data not being filtered

**Solution**: Make sure your table has a `userId` column and you're using the helpers:
```typescript
// Use this
const data = await createTenantDataAccess().findAll(table);

// Or this
const where = createTenantWhere(table.userId, /* other conditions */);
```

### Cross-tenant data access

**Solution**: Enable audit logging to see what's happening:
```typescript
const tenantService = getTenantService({
  enableAuditLog: true,
  enableStrictMode: true
});
```

## Next Steps

- Read full documentation: `TENANT_ISOLATION_IMPLEMENTATION.md`
- See API examples: `server/api/rest/examples/tenantIsolationExample.ts`
- Migrate existing services to use tenant isolation
- Add tenant isolation to custom services

## Key Files

- **Service**: `server/services/tenantIsolation.service.ts`
- **Middleware**: `server/api/rest/middleware/tenantMiddleware.ts`
- **Helpers**: `server/services/dbHelpers.service.ts`
- **Examples**: `server/api/rest/examples/tenantIsolationExample.ts`
