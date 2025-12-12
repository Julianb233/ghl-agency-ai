# API Documentation Implementation Plan

**Quick-start guide for implementing the documentation improvements identified in the audit.**

---

## Overview

This plan provides step-by-step instructions to enhance API documentation across the ghl-agency-ai platform. Estimated effort: 8-12 weeks for full implementation.

---

## Phase 1: Baseline (Week 1-2)

### Goal: Document all routers with consistent format

#### Task 1.1: Apply JSDoc Template to All Routers

**JSDoc Standard Format:**

```typescript
/**
 * Router: [Feature Name]
 *
 * Brief description of what this router does.
 *
 * [Detailed explanation with key features]
 *
 * Features:
 * - Feature 1: description
 * - Feature 2: description
 *
 * Authentication: [public/protected/admin]
 * Rate Limit: [X requests/Y seconds]
 * Database Tables: [table1, table2]
 * External APIs: [api1, api2]
 *
 * @see Related routers: router1, router2
 * @see Documentation: [link if exists]
 */

/**
 * [Endpoint brief description]
 *
 * [Detailed explanation]
 *
 * @param input - Input object:
 *   - field1 (string): description
 *   - field2 (number): description
 * @returns Output object:
 *   - result1 (string): description
 *   - result2 (object): description
 * @throws {TRPCError} When [error condition]
 *
 * @example
 * ```ts
 * const result = await trpc.router.endpoint.query({ field: 'value' });
 * console.log(result);
 * ```
 *
 * @see Related endpoints: router.other
 */
methodName: protectedProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    // implementation
  }),
```

**Priority Routers (Start here):**

1. **`browser.ts`** (78.8 KB)
   - Most critical for core functionality
   - 15+ endpoints
   - Estimate: 6 hours

2. **`settings.ts`** (54.6 KB)
   - Complex configuration
   - 20+ endpoints
   - Estimate: 8 hours

3. **`ai.ts`** (49.5 KB)
   - Core AI orchestration
   - 12+ endpoints
   - Estimate: 6 hours

4. **`workflows.ts`** (21.3 KB)
   - Already has schemas
   - 10+ endpoints
   - Estimate: 4 hours

5. **`webhooks.ts`** (29.5 KB)
   - Complex event handling
   - 8+ endpoints
   - Estimate: 5 hours

**Remaining 26 routers:**
- Estimate: 30-40 hours total
- ~1-2 hours per router average

**Total Effort:** ~65 hours (roughly 2 weeks for 1 developer, or 1 week for 2 developers)

#### Task 1.2: Create Zod Schema Descriptions

For each router, enhance Zod schemas with documentation:

```typescript
const createTaskSchema = z.object({
  name: z.string()
    .min(1, "Task name required")
    .max(255, "Max 255 characters")
    .describe("Unique identifier for the task"),

  description: z.string()
    .optional()
    .describe("Optional human-readable description"),

  automationType: z.enum(['chat', 'observe', 'extract', 'workflow', 'custom'])
    .describe("Type of automation to perform"),
});
```

**Deliverable:** All schemas have descriptions
**Effort:** 8-10 hours

#### Task 1.3: Catalog All Endpoints

Create spreadsheet with all 200+ endpoints:

```csv
Router,Endpoint,Method,Access,Input,Output,Auth,RateLimit,Notes
browser,createSession,query,protected,{geolocation?,browserSettings?},sessionId,JWT,100/min,Creates Browserbase session
browser,navigate,mutation,protected,{sessionId,url},success,JWT,100/min,Navigates to URL
...
```

**Deliverable:** Endpoint spreadsheet
**Effort:** 4-6 hours

#### Task 1.4: Update Main README

Replace API section with comprehensive overview:

```markdown
## 📖 API Documentation

### Quick Links
- [tRPC Endpoints Reference](./docs/TRPC_ENDPOINTS_REFERENCE.md) - All 200+ endpoints
- [OpenAPI Spec](./server/api/rest/openapi.yaml) - REST API documentation
- [API Implementation Plan](./docs/DOCUMENTATION_IMPLEMENTATION_PLAN.md) - Development guide
- [Authentication Guide](./docs/Authentication-Architecture.md) - Auth schemes

### API Overview

The GHL Agency AI platform exposes APIs through:

1. **tRPC** - Type-safe RPC for frontend
2. **REST** - Public API with authentication
3. **Webhooks** - Event-driven integrations

### Routers (31 total, 200+ endpoints)

| Category | Routers | Purpose |
|----------|---------|---------|
| **Automation** | browser, workflows, scheduledTasks | Browser & workflow control |
| **Intelligence** | ai, rag, leadEnrichment | AI & data enrichment |
| **Communication** | email, voice, aiCalling | Email & voice automation |
| **Management** | tasks, templates, quiz | Task & template management |
| **Analytics** | analytics, health, alerts | Monitoring & alerts |
| **Configuration** | settings, apiKeys, webhooks | System configuration |

[Detailed endpoint reference →](./docs/TRPC_ENDPOINTS_REFERENCE.md)
```

**Deliverable:** Updated README.md
**Effort:** 2 hours

**Phase 1 Total:** ~80-90 hours

---

## Phase 2: OpenAPI & Interactive Docs (Week 3-4)

### Goal: Generate OpenAPI 3.1 spec and serve interactive documentation

#### Task 2.1: Evaluate @trpc/openapi

**Steps:**
1. Review @trpc/openapi library
2. Run proof of concept
3. Document integration approach
4. Decide: implement or write custom

**Resources:**
- https://github.com/jlalmes/trpc-openapi
- Examples in demo projects

**Decision Point:**
- **If feasible:** Use library (saves 40+ hours)
- **If not:** Generate from spreadsheet (custom YAML)

**Effort:** 4-6 hours investigation

#### Task 2.2: Generate OpenAPI 3.1 Spec

**Coverage needed:**
- All 31 routers
- All 200+ endpoints
- Input/output schemas
- Error responses
- Authentication methods
- Rate limiting info

**File:** `/server/api/openapi.yaml` (expand from current)

**Current:** 959 lines (12 endpoints)
**Target:** 3,000-4,000 lines (200+ endpoints)

**Effort:** 20-30 hours (or 4-6 hours if using @trpc/openapi)

#### Task 2.3: Set Up Swagger UI

**Steps:**
1. Install swagger-ui-express
2. Serve at `/api/docs`
3. Configure with OpenAPI spec
4. Test interactive features

**Implementation:**
```typescript
import swaggerUi from 'swagger-ui-express';
import openapi from './openapi.json';

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'GHL Agency AI - API Docs',
}));
```

**Effort:** 3-4 hours

#### Task 2.4: Test OpenAPI Spec

**Validation:**
- Run SwaggerParser validation
- Test "Try it out" in Swagger UI
- Verify all endpoints are listed
- Check error responses

**Tools:**
```bash
npm install --save-dev swagger-parser
node -e "require('swagger-parser').validate('./server/api/openapi.yaml')"
```

**Effort:** 2-3 hours

**Phase 2 Total:** 30-45 hours (or 12-18 hours with @trpc/openapi)

---

## Phase 3: Developer Experience (Week 5-6)

### Goal: Create guides and examples for common use cases

#### Task 3.1: Create Integration Guides

**Guides needed (markdown files in `/docs/guides/`):**

1. **Getting Started with tRPC**
   - File: `tRPC_QUICKSTART.md`
   - Content: Setup, basic queries, error handling
   - Effort: 2 hours

2. **Using the REST API**
   - File: `REST_API_GUIDE.md`
   - Content: Authentication, pagination, rate limits
   - Effort: 2 hours

3. **Browser Automation**
   - File: `BROWSER_AUTOMATION.md`
   - Content: Sessions, navigation, data extraction
   - Effort: 3 hours

4. **Building Workflows**
   - File: `WORKFLOW_GUIDE.md`
   - Content: Creating, executing, monitoring
   - Effort: 3 hours

5. **AI Orchestration**
   - File: `AI_AGENT_GUIDE.md`
   - Content: Starting agents, executing tasks
   - Effort: 2 hours

6. **Webhooks & Events**
   - File: `WEBHOOKS_GUIDE.md`
   - Content: Creating, securing, testing
   - Effort: 2 hours

7. **Error Handling**
   - File: `ERROR_HANDLING.md`
   - Content: Error codes, troubleshooting
   - Effort: 2 hours

8. **Rate Limiting & Quotas**
   - File: `RATE_LIMITS.md`
   - Content: Limits, monitoring, best practices
   - Effort: 1.5 hours

**Total Effort:** 17.5 hours

#### Task 3.2: Create Code Examples

**Example categories (in `/examples/api-usage/`):**

1. **Basic Operations** (3 examples)
   - Query data
   - Create resource
   - Update resource
   - Effort: 1.5 hours

2. **Browser Automation** (5 examples)
   - Create session
   - Navigate & take screenshot
   - Extract data
   - Error handling
   - Advanced features
   - Effort: 4 hours

3. **Workflow Execution** (3 examples)
   - Create & execute
   - Test execution
   - Monitor progress
   - Effort: 2 hours

4. **AI Integration** (2 examples)
   - Start agent
   - Analyze content
   - Effort: 1.5 hours

5. **Authentication** (2 examples)
   - API key usage
   - JWT tokens
   - Effort: 1 hour

**All examples in:**
- TypeScript
- JavaScript
- Python
- cURL

**Total Effort:** 10 hours per language = 30-40 hours total

(Start with TypeScript, add others later)

**Phase 3 Total:** 50-60 hours

---

## Phase 4: Automation & Maintenance (Week 7+)

### Goal: Ensure documentation stays current automatically

#### Task 4.1: Document-Driven Testing

**Test code examples to ensure they work:**

```typescript
// examples/__tests__/browser-automation.test.ts
describe('Browser Automation Examples', () => {
  it('should create session', async () => {
    const session = await createSession();
    expect(session.id).toBeDefined();
  });
});
```

**Setup:**
1. Create examples/__tests__/ directory
2. Add vitest configuration
3. Test each major example
4. Run in CI/CD pipeline

**Effort:** 4-6 hours

#### Task 4.2: Endpoint Documentation Sync

**Keep docs in sync with code:**

Option A (Recommended): Use @trpc/openapi
- Automatically generates from tRPC schema
- Re-generates on build
- Always accurate

Option B: Manual validation
- Script to verify all endpoints listed
- CI check fails if mismatches
- Effort: 2-3 hours

Option C: Documentation from comments
- Use typedoc to auto-generate
- Effort: 3-4 hours

**Effort:** 2-6 hours (depending on option)

#### Task 4.3: Changelog Generation

**Track API changes:**

File: `/docs/CHANGELOG.md`

Template:
```markdown
## [Unreleased]

### Added
- New endpoint: `router.newEndpoint`
- New field: `Task.customField`

### Changed
- Updated: `browser.navigate` input schema
- Deprecated: `tasks.old` → use `scheduledTasks.create`

### Fixed
- Fixed: Rate limit calculation error

### Breaking Changes
- Removed: `deprecated.oldEndpoint`
  Migration: Use `newRouter.replacementEndpoint`
```

**Effort:** 1-2 hours setup + ongoing maintenance

#### Task 4.4: CI/CD Integration

**Add documentation checks to pipeline:**

```yaml
# .github/workflows/docs-check.yml
name: Documentation Check

on: [pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate OpenAPI
        run: npx swagger-parser validate ./server/api/openapi.yaml
      - name: Test Examples
        run: npm run test:examples
      - name: Check Endpoint Coverage
        run: npm run check:endpoint-coverage
```

**Effort:** 2-3 hours

**Phase 4 Total:** 10-20 hours

---

## Timeline & Effort Summary

| Phase | Tasks | Hours | Weeks |
|-------|-------|-------|-------|
| 1: Baseline | JSDoc, schemas, catalog, README | 80-90 | 2 |
| 2: OpenAPI | OpenAPI spec, Swagger UI, testing | 30-45* | 2 |
| 3: Developer UX | Guides, examples, best practices | 50-60 | 2 |
| 4: Automation | Testing, sync, CI/CD | 10-20 | 1+ |
| **TOTAL** | | **170-215 hours** | **8-12 weeks** |

*With @trpc/openapi: 12-18 hours

### Team Size Recommendations

- **1 Developer:** 12-15 weeks (part-time), 8-10 weeks (full-time)
- **2 Developers:** 6-8 weeks
- **3+ Developers:** 4-6 weeks (can parallelize routers)

---

## Resource Allocation

### Suggested Distribution (2 Developer Team)

**Developer 1:**
- Week 1-2: Document browser, settings, ai routers (critical)
- Week 3: OpenAPI spec generation
- Week 4: Swagger UI setup
- Week 5: Browser automation & workflow guides

**Developer 2:**
- Week 1-2: Document remaining 28 routers
- Week 3: OpenAPI spec validation
- Week 4: Code examples (TypeScript)
- Week 5: Authentication & error handling guides
- Week 6: Documentation testing setup

**Shared:**
- Week 1: Planning & JSDoc template review
- Week 6: Integration & final review
- Week 7+: Maintenance & automation

---

## Success Criteria

### Baseline (Phase 1)
- [ ] All 31 routers have JSDoc header
- [ ] All 200+ endpoints have method documentation
- [ ] All Zod schemas have descriptions
- [ ] Main README updated with API overview
- [ ] Endpoint spreadsheet complete

### OpenAPI (Phase 2)
- [ ] OpenAPI 3.1 spec generated
- [ ] Covers all 200+ endpoints
- [ ] All schemas defined
- [ ] Swagger UI accessible at /api/docs
- [ ] SwaggerParser validation passes

### Developer Experience (Phase 3)
- [ ] 8 integration guides created
- [ ] 15+ code examples provided
- [ ] Examples work and are tested
- [ ] Quick-start guides complete

### Automation (Phase 4)
- [ ] CI/CD checks endpoint coverage
- [ ] Examples tested on every PR
- [ ] Changelog maintained
- [ ] OpenAPI auto-generated (optional)

---

## Tools & Technologies

### Required
- `swagger-ui-express` - Serve Swagger UI
- `swagger-parser` - Validate OpenAPI specs

### Optional
- `@trpc/openapi` - Auto-generate OpenAPI
- `typedoc` - Generate from TypeScript comments
- `vitest` - Test code examples

### Setup Time
- Install packages: 30 minutes
- Configure: 1-2 hours
- Validate: 1 hour

---

## Common Issues & Solutions

### Issue 1: Inconsistent Zod Schemas
**Problem:** Different routers use different validation patterns
**Solution:** Create schema guidelines document
**Time:** 1 hour

### Issue 2: Missing Input/Output Documentation
**Problem:** Complex types unclear for developers
**Example:** What is BrowserConfig exactly?
**Solution:** Create type definition guide with examples
**Time:** 2-3 hours

### Issue 3: Rate Limit Information
**Problem:** Not clear per endpoint
**Solution:** Document standard rates, note exceptions
**Time:** 2 hours

### Issue 4: Authentication Requirements
**Problem:** Not obvious which endpoints need JWT vs API key
**Solution:** Add @auth decorator to documentation
**Time:** 1-2 hours

---

## Prioritization Strategy

### Tier 1 (Do First)
1. JSDoc template for top 5 routers
2. Update main README
3. Create TRPC_ENDPOINTS_REFERENCE.md
4. Set up Swagger UI

**Effort:** 20-25 hours
**Impact:** High - developers can start using API docs immediately

### Tier 2 (Do Next)
1. Complete JSDoc for all 31 routers
2. Expand OpenAPI spec
3. Create integration guides
4. Add code examples (TypeScript)

**Effort:** 100-120 hours
**Impact:** Very High - comprehensive documentation

### Tier 3 (Do Later)
1. Code examples in other languages
2. Advanced guides (optimization, scaling)
3. API versioning documentation
4. Deprecation roadmap

**Effort:** 40-60 hours
**Impact:** Medium - polish and advanced use cases

---

## Getting Started (This Week)

### Immediate Actions (4 hours)

1. **Assign owner to each router**
   - Spreadsheet with router → developer mapping
   - Effort: 0.5 hours

2. **Create JSDoc template**
   - Finalize format with team
   - Add to style guide
   - Effort: 1 hour

3. **Start browser.ts documentation**
   - Use as template for others
   - Apply JSDoc to all methods
   - Effort: 2 hours

4. **Set up Zod descriptions**
   - Create helper function if needed
   - Effort: 0.5 hours

### Week 1 Plan (40 hours)

- [ ] Apply JSDoc to browser.ts (6h)
- [ ] Apply JSDoc to settings.ts (8h)
- [ ] Apply JSDoc to ai.ts (6h)
- [ ] Apply JSDoc to workflows.ts (4h)
- [ ] Apply JSDoc to webhooks.ts (5h)
- [ ] Update main README (2h)
- [ ] Create endpoint spreadsheet (6h)
- [ ] Plan Phase 2 (3h)

---

## Measuring Success

### Before Implementation
- OpenAPI coverage: 6%
- JSDoc coverage: 25%
- Code examples: 10%
- Developer experience: 3/10

### After Phase 1
- JSDoc coverage: 100%
- Schema documentation: 100%
- Endpoint reference: 100%
- Developer experience: 5/10

### After Phase 2
- OpenAPI coverage: 100%
- Interactive docs available: Yes
- Developer experience: 6.5/10

### After Phase 3
- Integration guides: 8
- Code examples: 15+
- Developer experience: 8+/10

### After Phase 4
- Automated testing: Yes
- CI/CD checks: Yes
- Documentation always current: Yes
- Developer experience: 9/10

---

## Next Steps

1. **Share this plan with team**
2. **Get buy-in on timeline**
3. **Assign owners to routers**
4. **Schedule kickoff meeting**
5. **Begin Phase 1 this week**

---

**Document prepared:** December 12, 2025
**Status:** Ready for implementation
**Questions?** Refer to API_DOCUMENTATION_AUDIT.md for more details
