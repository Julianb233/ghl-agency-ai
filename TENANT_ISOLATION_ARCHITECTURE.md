# Tenant Isolation Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Request                              │
│                  (Bearer ghl_api_key_123)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Auth Middleware                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Validate API key                                       │ │
│  │  2. Lookup user in database                                │ │
│  │  3. Attach to req.user                                     │ │
│  │     { id: 123, email: "user@example.com", role: "user" }  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Tenant Middleware                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Create tenant context from req.user                    │ │
│  │     {                                                       │ │
│  │       userId: 123,                                         │ │
│  │       tenantId: "tenant_123",                              │ │
│  │       email: "user@example.com",                           │ │
│  │       role: "user",                                        │ │
│  │       requestId: "req_1234567890_abc"                      │ │
│  │     }                                                       │ │
│  │                                                             │ │
│  │  2. Run request in tenant context (AsyncLocalStorage)      │ │
│  │                                                             │ │
│  │  3. Context available throughout request lifecycle         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Route Handler                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  router.get('/documents', async (req, res) => {            │ │
│  │    const dataAccess = createTenantDataAccess();            │ │
│  │    const docs = await dataAccess.findAll(documents);       │ │
│  │    res.json(docs);                                         │ │
│  │  });                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│                           └────────────┬─────────────────────────┤
│                                        │                         │
│    ┌───────────────────────────────────┴───────────────┐        │
│    │                                                    │        │
│    ▼                                                    ▼        │
│  ┌──────────────────┐                    ┌──────────────────┐   │
│  │ Memory Services  │                    │ Database Helpers │   │
│  └──────────────────┘                    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│             Tenant Isolation Service (AsyncLocalStorage)        │
│                                                                  │
│  getCurrentContext() → {                                         │
│    userId: 123,                                                  │
│    tenantId: "tenant_123",                                       │
│    email: "user@example.com"                                    │
│  }                                                               │
│                                                                  │
│  getTenantNamespace("agent-memory")                              │
│    → "tenant:tenant_123:user:123:agent-memory"                  │
│                                                                  │
│  getTenantMemoryKey("agent-state")                               │
│    → "tenant:tenant_123:123:agent-state"                        │
│                                                                  │
│  getTenantSessionId("session-abc")                               │
│    → "tenant:tenant_123:user:123:session-abc"                   │
│                                                                  │
│  requireTenantOwnership(userId)                                  │
│    → throws if userId !== context.userId                        │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │   Agent Memory         │  │   Database (PostgreSQL)        │ │
│  ├────────────────────────┤  ├────────────────────────────────┤ │
│  │ Key: tenant:123:key    │  │ WHERE userId = 123             │ │
│  │ Session: tenant:123:s1 │  │                                │ │
│  │ Namespace: tenant:123  │  │ documents.userId = 123         │ │
│  └────────────────────────┘  │ workflows.userId = 123         │ │
│                              │ tasks.userId = 123             │ │
│  ┌────────────────────────┐  └────────────────────────────────┘ │
│  │   Reasoning Bank       │                                     │
│  ├────────────────────────┤                                     │
│  │ Domain: tenant:123:cs  │                                     │
│  │ Patterns for tenant    │                                     │
│  └────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. AsyncLocalStorage Context Flow

```typescript
┌──────────────────────────────────────────────────┐
│ HTTP Request Start                               │
│                                                  │
│  tenantContextMiddleware runs:                  │
│  ┌────────────────────────────────────────────┐ │
│  │ asyncLocalStorage.run(tenantContext, () => │ │
│  │   // All code here has access to context   │ │
│  │   next() → route handlers → services       │ │
│  │ })                                         │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Service calls:                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ const context = asyncLocalStorage.getStore()│ │
│  │ // context = { userId: 123, ... }          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│ HTTP Request End                                 │
│ (context is cleaned up automatically)            │
└──────────────────────────────────────────────────┘
```

### 2. Memory Namespace Isolation

```
Original:     key = "agent-state"
Tenant-scoped: key = "tenant:tenant_123:123:agent-state"

┌────────────────────────────────────────────────────────┐
│ Memory Store (Redis/In-Memory)                         │
├────────────────────────────────────────────────────────┤
│ tenant:tenant_1:user:1:agent-state → { data: "..." }  │
│ tenant:tenant_1:user:1:session-abc → { data: "..." }  │
│ tenant:tenant_2:user:2:agent-state → { data: "..." }  │
│ tenant:tenant_2:user:2:session-abc → { data: "..." }  │
│                                                         │
│ ✅ tenant_1 cannot access tenant_2's data              │
│ ✅ Automatic prefix prevents key collisions            │
└────────────────────────────────────────────────────────┘
```

### 3. Database Row-Level Isolation

```sql
-- Original query (manual filtering)
SELECT * FROM documents WHERE id = 123 AND userId = req.user.id;

-- Tenant-isolated query (automatic filtering)
SELECT * FROM documents WHERE id = 123 AND userId = <current-tenant-userId>;

-- The userId filter is added automatically by helpers:

┌─────────────────────────────────────────────────────┐
│ createTenantWhere(documents.userId, eq(id, 123))    │
│                                                     │
│ Expands to:                                         │
│ AND(                                                │
│   eq(documents.userId, context.userId),  ← Auto    │
│   eq(documents.id, 123)                  ← Manual  │
│ )                                                   │
└─────────────────────────────────────────────────────┘
```

### 4. Ownership Validation Flow

```
┌──────────────────────────────────────────────────────────┐
│ 1. User requests: DELETE /api/v1/documents/123          │
│    Authorization: Bearer ghl_user2_key                   │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Fetch document from database                          │
│    document = { id: 123, userId: 1, name: "Doc" }       │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Validate ownership                                    │
│    requireTenantOwnership(document.userId)               │
│                                                          │
│    Current tenant userId: 2                              │
│    Document userId: 1                                    │
│                                                          │
│    ❌ Validation fails: 1 !== 2                          │
│    → Throw Error: "Access denied"                        │
└──────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Models

### Model 1: User-Based (Default)

```
Every user is a separate tenant
tenantId = tenant_<userId>

User 1 → tenant_1
User 2 → tenant_2
User 3 → tenant_3

┌─────────────────────────────────────┐
│ User 1 Data                         │
│ ├── Memory (tenant_1)               │
│ ├── Documents (userId: 1)           │
│ └── Workflows (userId: 1)           │
├─────────────────────────────────────┤
│ User 2 Data                         │
│ ├── Memory (tenant_2)               │
│ ├── Documents (userId: 2)           │
│ └── Workflows (userId: 2)           │
└─────────────────────────────────────┘

✅ Simple: 1 user = 1 tenant
✅ Perfect for B2C applications
```

### Model 2: Organization-Based

```
Multiple users share one tenant (organization)
tenantId = org_<organizationId>

User 1 (org_acme) → org_acme
User 2 (org_acme) → org_acme
User 3 (org_xyz)  → org_xyz

┌─────────────────────────────────────┐
│ Organization: ACME (org_acme)       │
│ ├── User 1 can access all data     │
│ ├── User 2 can access all data     │
│ └── Shared memory, documents, etc. │
├─────────────────────────────────────┤
│ Organization: XYZ (org_xyz)         │
│ ├── User 3 can access all data     │
│ └── Separate memory, documents      │
└─────────────────────────────────────┘

✅ Team collaboration
✅ Perfect for B2B applications
❗ Requires organization membership validation
```

### Model 3: Subdomain-Based

```
Tenant determined by subdomain
tenantId = subdomain_<subdomain>

acme.app.com    → subdomain_acme
contoso.app.com → subdomain_contoso

┌─────────────────────────────────────┐
│ Subdomain: acme.app.com             │
│ ├── All users on this subdomain    │
│ ├── Share tenant context           │
│ └── tenantId: subdomain_acme       │
├─────────────────────────────────────┤
│ Subdomain: contoso.app.com          │
│ ├── Different users                 │
│ ├── Separate tenant context        │
│ └── tenantId: subdomain_contoso    │
└─────────────────────────────────────┘

✅ White-label applications
✅ Enterprise SaaS
❗ Requires DNS/subdomain setup
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Authentication (Auth Middleware)               │
│ ├── Validates API key                                   │
│ ├── Identifies user                                     │
│ └── Blocks unauthenticated requests                     │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Tenant Context (Tenant Middleware)             │
│ ├── Establishes tenant boundary                         │
│ ├── Creates request-scoped context                      │
│ └── Propagates through AsyncLocalStorage                │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Automatic Filtering (Services)                 │
│ ├── Memory keys prefixed                                │
│ ├── Session IDs scoped                                  │
│ └── Database queries filtered                           │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Ownership Validation (Helpers)                 │
│ ├── Validates data ownership before operations          │
│ ├── Prevents unauthorized updates/deletes               │
│ └── Throws errors on access violations                  │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Audit Logging (Optional)                       │
│ ├── Logs all tenant operations                          │
│ ├── Tracks access patterns                              │
│ └── Enables security monitoring                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Storing Agent Memory

```
1. Request:
   POST /api/v1/memory/store
   Authorization: Bearer ghl_user123_key
   Body: { sessionId: "s1", key: "state", value: "data" }

2. Auth Middleware:
   ✅ Validates API key
   ✅ Loads user: { id: 123, email: "user@example.com" }
   ✅ Attaches to req.user

3. Tenant Middleware:
   ✅ Creates context: { userId: 123, tenantId: "tenant_123" }
   ✅ Runs handler in tenant context (AsyncLocalStorage)

4. Route Handler:
   const agentMemory = getAgentMemory();
   await agentMemory.storeContext("s1", "state", "data");

5. Agent Memory Service:
   a. getTenantSessionId("s1")
      → "tenant:tenant_123:user:123:s1"

   b. getTenantMemoryKey("state")
      → "tenant:tenant_123:123:state"

   c. Auto-inject userId from context
      → userId: 123

   d. Add tenant metadata
      → { tenantId: "tenant_123", namespace: "..." }

   e. Store in database:
      INSERT INTO memory_entries (
        sessionId: "tenant:tenant_123:user:123:s1",
        key: "tenant:tenant_123:123:state",
        value: "data",
        userId: 123,
        metadata: { tenantId: "tenant_123", ... }
      )

6. Audit Log (if enabled):
   [TENANT AUDIT] {
     timestamp: "2025-12-15T22:00:00.000Z",
     tenantId: "tenant_123",
     userId: 123,
     operation: "memory.store",
     sessionId: "tenant:tenant_123:user:123:s1"
   }

7. Response:
   { success: true, entryId: "uuid-..." }
```

### Retrieving Data

```
1. Request:
   GET /api/v1/documents/123
   Authorization: Bearer ghl_user456_key

2. Auth: user 456 authenticated
3. Tenant: context { userId: 456, tenantId: "tenant_456" }

4. Route Handler:
   const dataAccess = createTenantDataAccess();
   const doc = await dataAccess.findById(documents, 123);

5. Database Query:
   SELECT * FROM documents
   WHERE id = 123 AND userId = 456
              ^^^^^^^^^^^^^^^^^^^
              Automatic tenant filter

6. Result:
   - If document.userId = 123: ❌ No match → returns null
   - If document.userId = 456: ✅ Match → returns document

7. Response:
   - No match: 404 Not Found
   - Match: 200 OK with document data
```

## Performance Characteristics

```
┌─────────────────────────────────────────────────────┐
│ AsyncLocalStorage Overhead                          │
├─────────────────────────────────────────────────────┤
│ Context Creation: ~0.001ms per request              │
│ Context Retrieval: ~0.0001ms per call               │
│ Memory Overhead: ~100 bytes per context             │
│                                                     │
│ ✅ Negligible impact on request latency             │
│ ✅ No memory leaks (auto-cleanup)                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Database Query Impact                                │
├─────────────────────────────────────────────────────┤
│ Additional WHERE clause: userId = N                 │
│                                                     │
│ With proper index on userId:                        │
│ ✅ No performance degradation                       │
│ ✅ May improve performance (smaller result sets)    │
│                                                     │
│ Without index:                                       │
│ ❌ Full table scan on large tables                  │
│ → Ensure userId columns are indexed!                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Memory Service Impact                                │
├─────────────────────────────────────────────────────┤
│ Key Prefixing: ~50 characters per key               │
│ String Operations: ~0.01ms per operation            │
│                                                     │
│ ✅ Minimal overhead                                  │
│ ✅ Cache remains effective                          │
└─────────────────────────────────────────────────────┘
```

## Best Practices

1. **Always Apply Middleware**
   ```typescript
   router.use(requireApiKey, tenantContextMiddleware);
   ```

2. **Use Database Helpers**
   ```typescript
   // Good
   const dataAccess = createTenantDataAccess();
   const docs = await dataAccess.findAll(documents);

   // Avoid
   const docs = await db.select().from(documents);
   ```

3. **Validate Ownership**
   ```typescript
   requireTenantOwnership(data.userId, 'resource');
   ```

4. **Enable Audit Logging in Production**
   ```typescript
   getTenantService({ enableAuditLog: true });
   ```

5. **Index userId Columns**
   ```sql
   CREATE INDEX idx_documents_user_id ON documents(userId);
   CREATE INDEX idx_workflows_user_id ON workflows(userId);
   ```
