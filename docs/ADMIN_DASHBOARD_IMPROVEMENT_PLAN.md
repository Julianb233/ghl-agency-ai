# Admin Dashboard Improvement Plan

## Current State Assessment

| Page | Backend Status | Frontend Status | Data Source |
|------|---------------|-----------------|-------------|
| AdminDashboard | Ready | Partial | Hardcoded mock |
| UserManagement | 100% implemented | Mock only | Local state |
| SystemHealth | 100% implemented | 80% connected | Real tRPC |
| AuditLog | 100% implemented | Schema mismatch | Broken connection |
| ConfigCenter | 100% implemented | Mock only | Local state |

**Key Finding:** Backend is production-ready, but frontend is largely disconnected.

---

## Phase 1: Critical Fixes (Connect Real Data)

### 1.1 Connect UserManagement to Real API
**Priority:** Critical | **Complexity:** Medium

**Current Issue:** Page uses `mockUsers` array with local state operations.

**Tasks:**
- [ ] Replace mock data with `trpc.admin.users.list.useQuery()`
- [ ] Wire up search/filter inputs to query parameters
- [ ] Connect suspend/unsuspend buttons to `trpc.admin.users.suspend.useMutation()`
- [ ] Connect role change to `trpc.admin.users.updateRole.useMutation()`
- [ ] Add loading states and error handling
- [ ] Add optimistic updates for better UX

**Files to modify:**
- `client/src/pages/admin/UserManagement.tsx`

---

### 1.2 Fix AuditLog Schema Mismatch
**Priority:** Critical | **Complexity:** Low

**Current Issue:** Frontend expects different input schema than backend provides.

**Client expects:**
```typescript
{ eventType, startDate, endDate, userSearch, page, limit }
```

**Server provides:**
```typescript
{ limit, offset, userId, eventType, startDate, endDate, sortOrder }
```

**Tasks:**
- [ ] Update frontend to match backend input schema
- [ ] Change `page` to `offset`-based pagination
- [ ] Change `userSearch` to `userId` (add user lookup)
- [ ] Fix `getStats` call (remove unsupported `period` param)
- [ ] Test expandable row details

**Files to modify:**
- `client/src/pages/admin/AuditLog.tsx`

---

### 1.3 Connect ConfigCenter to Backend
**Priority:** High | **Complexity:** Medium

**Current Issue:** Feature flags and system config use local mock state.

**Tasks:**
- [ ] Create tRPC router for feature flags CRUD operations
- [ ] Create tRPC router for system config CRUD operations
- [ ] Replace `mockFeatureFlags` with `trpc.admin.config.flags.list.useQuery()`
- [ ] Replace `mockSystemConfigs` with `trpc.admin.config.settings.list.useQuery()`
- [ ] Wire up create/update/delete mutations
- [ ] Implement maintenance mode toggle with real persistence

**New files needed:**
- `server/api/routers/admin/config.ts`

**Files to modify:**
- `server/api/routers/admin/index.ts`
- `client/src/pages/admin/ConfigCenter.tsx`

---

### 1.4 Connect AdminDashboard to Real Data
**Priority:** High | **Complexity:** Low

**Current Issue:** Stats and activity feed are hardcoded.

**Tasks:**
- [ ] Replace hardcoded stats with `trpc.admin.system.getStats.useQuery()`
- [ ] Replace mock activity with `trpc.admin.audit.list.useQuery({ limit: 5 })`
- [ ] Connect Quick Actions to real navigation/actions
- [ ] Wire up system status from `trpc.admin.system.getServiceStatus.useQuery()`

**Files to modify:**
- `client/src/pages/admin/AdminDashboard.tsx`

---

## Phase 2: Missing Features (New Pages)

### 2.1 Security Events Dashboard
**Priority:** High | **Complexity:** Medium

**Purpose:** Monitor security threats, failed logins, suspicious activity.

**Features:**
- Real-time security event feed
- Failed login attempts by IP/user
- Suspicious activity alerts
- IP blocking interface
- Geographic access map

**New files:**
- `client/src/pages/admin/SecurityEvents.tsx`
- `server/api/routers/admin/security.ts`

---

### 2.2 Support Tickets System
**Priority:** Medium | **Complexity:** High

**Purpose:** Customer support ticket management.

**Features:**
- Ticket list with status filters (open, pending, resolved, closed)
- Ticket detail view with conversation thread
- Internal notes (admin only)
- Ticket assignment
- Priority levels
- Response templates
- SLA tracking

**New files:**
- `client/src/pages/admin/SupportTickets.tsx`
- `client/src/pages/admin/TicketDetail.tsx`
- `server/api/routers/admin/tickets.ts`

---

### 2.3 Announcements Management
**Priority:** Medium | **Complexity:** Low

**Purpose:** System-wide user notifications.

**Features:**
- Create/edit/delete announcements
- Target audience (all users, admins, specific roles)
- Schedule publish/expire dates
- Announcement types (info, warning, critical)
- Preview before publish
- View statistics (dismissals, views)

**New files:**
- `client/src/pages/admin/Announcements.tsx`
- `server/api/routers/admin/announcements.ts`

---

### 2.4 Logs Viewer
**Priority:** Medium | **Complexity:** Medium

**Purpose:** View and search server/application logs.

**Features:**
- Real-time log streaming
- Log level filtering (error, warn, info, debug)
- Full-text search
- Time range selection
- Download logs
- Log source filtering (API, worker, scheduler)

**New files:**
- `client/src/pages/admin/LogsViewer.tsx`
- `server/api/routers/admin/logs.ts`

---

## Phase 3: Security Hardening

### 3.1 Fix Service Status Exposure
**Priority:** High | **Complexity:** Low

**Current Issue:** Exposes whether API keys are configured.

**Fix:** Only return connectivity status, not configuration presence.

```typescript
// Before (insecure)
browserbase: { configured: !!process.env.BROWSERBASE_API_KEY }

// After (secure)
browserbase: { status: await checkBrowserbaseConnection() }
```

**Files to modify:**
- `server/api/routers/admin/system.ts`

---

### 3.2 Add Granular Permissions
**Priority:** Medium | **Complexity:** High

**Current Issue:** Only "admin" or "user" roles exist.

**Implementation:**
- Add permissions table to schema
- Create permission constants (users.read, users.write, config.read, etc.)
- Add permission check middleware
- Update admin UI to show/hide based on permissions

**New schema:**
```typescript
export const adminPermissions = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id),
  permission: varchar("permission", { length: 50 }).notNull(),
  grantedBy: integer("grantedBy").references(() => users.id),
  grantedAt: timestamp("grantedAt").defaultNow(),
});
```

---

### 3.3 Admin Action Audit Trail
**Priority:** High | **Complexity:** Medium

**Current Issue:** Admin actions aren't logged to audit table.

**Implementation:**
- Create `logAdminAction()` helper function
- Call on every admin mutation (user changes, config changes, etc.)
- Include: action, userId, targetId, oldValue, newValue, ipAddress

**Files to modify:**
- `server/api/routers/admin/users.ts`
- `server/api/routers/admin/config.ts` (new)
- `server/api/routers/admin/audit.ts`

---

## Phase 4: UX/UI Improvements

### 4.1 Loading States & Skeletons
**Priority:** Medium | **Complexity:** Low

**Tasks:**
- [ ] Add skeleton loaders to all data tables
- [ ] Add loading spinners to mutation buttons
- [ ] Implement optimistic updates where appropriate
- [ ] Add page-level loading states

---

### 4.2 Error Handling
**Priority:** High | **Complexity:** Low

**Tasks:**
- [ ] Add error boundaries to admin pages
- [ ] Show toast notifications on API errors
- [ ] Add retry buttons for failed requests
- [ ] Implement graceful degradation

---

### 4.3 Responsive Design
**Priority:** Medium | **Complexity:** Medium

**Tasks:**
- [ ] Add horizontal scroll to tables on mobile
- [ ] Optimize filter layouts for small screens
- [ ] Make dialogs mobile-friendly
- [ ] Test all pages on tablet/mobile viewports

---

### 4.4 Bulk Operations
**Priority:** Low | **Complexity:** Medium

**Tasks:**
- [ ] Add checkbox selection to user table
- [ ] Implement bulk suspend/unsuspend
- [ ] Implement bulk role change
- [ ] Add bulk export functionality

---

## Phase 5: Performance Optimization

### 5.1 Fix Audit Log Aggregation
**Priority:** Medium | **Complexity:** Medium

**Current Issue:** Queries split across 4 tables, sorted in memory.

**Fix:**
- Use actual `auditLogs` table instead of aggregating
- Add proper indexes for common queries
- Implement cursor-based pagination

---

### 5.2 Add Database Indexes
**Priority:** Medium | **Complexity:** Low

```sql
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
```

---

### 5.3 Background Tab Detection
**Priority:** Low | **Complexity:** Low

**Fix:** Pause auto-refresh when tab is not visible.

```typescript
const isVisible = usePageVisibility();
const { data } = trpc.admin.system.getHealth.useQuery(undefined, {
  refetchInterval: isVisible ? 30000 : false,
});
```

---

## Phase 6: Export & Reporting

### 6.1 Data Export
**Priority:** Medium | **Complexity:** Medium

**Features:**
- Export users to CSV/JSON
- Export audit logs to CSV
- Export system metrics to PDF report
- Scheduled report generation

---

### 6.2 Analytics Dashboard
**Priority:** Low | **Complexity:** High

**Features:**
- User growth charts
- Feature usage analytics
- API request trends
- Error rate monitoring
- Custom date range comparisons

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Recommended Order |
|-------|----------|--------|--------|-------------------|
| 1.1 UserManagement | Critical | Medium | High | 1st |
| 1.2 AuditLog Fix | Critical | Low | Medium | 2nd |
| 1.3 ConfigCenter | High | Medium | High | 3rd |
| 1.4 Dashboard | High | Low | Medium | 4th |
| 3.1 Security Fix | High | Low | High | 5th |
| 3.3 Audit Trail | High | Medium | High | 6th |
| 4.2 Error Handling | High | Low | Medium | 7th |
| 2.1 Security Events | High | Medium | High | 8th |
| 2.2 Support Tickets | Medium | High | Medium | 9th |
| 2.3 Announcements | Medium | Low | Low | 10th |

---

## Quick Wins (Can Be Done Immediately)

1. **Fix AuditLog schema mismatch** - 30 min
2. **Connect Dashboard stats to real API** - 1 hour
3. **Add error boundaries** - 30 min
4. **Fix service status security exposure** - 30 min
5. **Add loading skeletons** - 1 hour

---

## Parallel Agent Strategy

For fastest implementation, use 3-4 parallel agents:

**Agent 1:** Phase 1.1 + 1.4 (UserManagement + Dashboard connection)
**Agent 2:** Phase 1.2 + 1.3 (AuditLog fix + ConfigCenter connection)
**Agent 3:** Phase 3.1 + 3.3 (Security fixes + Audit trail)
**Agent 4:** Phase 2.1 (Security Events page)

This allows completing critical fixes while starting new feature development.
