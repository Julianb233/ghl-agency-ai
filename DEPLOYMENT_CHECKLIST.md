# Agent SSE Deployment Checklist

## ✅ Pre-Integration Checklist

### Files Created & Updated

- [x] `/client/src/stores/agentStore.ts` - Created/Updated with full SSE integration (557 lines)
- [x] `/client/src/hooks/useAgentSSE.ts` - Created with 3 hooks (174 lines)
- [x] `/server/_core/sse-manager.ts` - Updated with agent functions (240 lines)
- [x] `/server/_core/sse-routes.ts` - Updated with `/api/agent/stream/:executionId` route (125 lines)
- [x] `/server/_core/agent-sse-events.ts` - Created event emitters (307 lines)
- [x] `/AGENT_SSE_INTEGRATION.md` - Documentation created
- [x] `/AGENT_SSE_SUMMARY.md` - Summary created
- [x] `/INTEGRATION_EXAMPLE.md` - Example code created

## 🔧 Integration Steps

### 1. Verify SSE Routes Registration

Check that SSE routes are registered in your main server file:

```typescript
// In server/_core/index.ts or server/index.ts
import { registerSSERoutes } from './_core/sse-routes';

// Find where Express app is set up and add:
registerSSERoutes(app);
```

**Location to check:**
- [ ] `/server/_core/index.ts`
- [ ] `/server/index.ts`
- [ ] Look for `registerSSERoutes(app)`

### 2. Update Agent Orchestrator Service

Add SSE event emitters to your agent execution logic:

```typescript
// In server/services/agentOrchestrator.service.ts
import { AgentSSEEmitter } from '../_core/agent-sse-events';

// In your executeTask function:
const emitter = new AgentSSEEmitter(userId, executionId.toString());

emitter.executionStarted({ task, startedAt: new Date() });
// ... emit events throughout execution
emitter.executionComplete({ result });
```

**Files to update:**
- [ ] `/server/services/agentOrchestrator.service.ts`
- [ ] Add `import { AgentSSEEmitter }` at top
- [ ] Create emitter instance at start of execution
- [ ] Add event emissions throughout execution flow

### 3. Verify API Endpoints

Ensure these endpoints exist in your API router:

- [ ] `POST /api/agent/execute` - Start execution
- [ ] `POST /api/agent/execute/:id/cancel` - Cancel execution
- [ ] `GET /api/agent/executions` - List executions
- [ ] `GET /api/agent/executions/:id` - Get execution details
- [ ] `GET /api/agent/stream/:executionId` - SSE stream (already added)

**File to check:**
- [ ] `/server/api/routers/agent.ts`

### 4. Database Schema Verification

Ensure `taskExecutions` table has required fields:

```sql
taskExecutions:
  - id (integer, primary key)
  - userId (integer, foreign key)
  - task (text)
  - status (enum: planning, executing, completed, failed, cancelled)
  - plan (json, nullable)
  - result (json, nullable)
  - error (text, nullable)
  - createdAt (timestamp)
  - updatedAt (timestamp)
  - completedAt (timestamp, nullable)
```

**Files to check:**
- [ ] `/drizzle/schema-webhooks.ts`
- [ ] Verify `taskExecutions` table schema

### 5. Client-Side Integration

Create or update React components to use the new hooks:

```tsx
import { useAgentExecution, useAgentSSE } from '@/hooks/useAgentSSE';

function MyComponent() {
  const { startExecution, currentExecution, thinkingSteps } = useAgentExecution();
  useAgentSSE(currentExecution?.id);
  // ... rest of component
}
```

**Components to create/update:**
- [ ] Agent execution page
- [ ] Agent dashboard
- [ ] Execution history page
- [ ] Execution detail page

## 🧪 Testing Checklist

### Unit Tests

- [ ] Test SSE connection establishment
- [ ] Test event handlers in agentStore
- [ ] Test automatic reconnection
- [ ] Test cleanup on unmount
- [ ] Test error handling

### Integration Tests

- [ ] Start execution and verify SSE connection
- [ ] Cancel execution mid-stream
- [ ] Test with multiple concurrent executions
- [ ] Test authentication/authorization
- [ ] Test execution history loading

### Manual Testing

```bash
# 1. Start server
npm run dev

# 2. Test SSE endpoint
curl -N -H "Cookie: your-session-cookie" \
  http://localhost:3000/api/agent/stream/12345

# 3. In browser console
const store = useAgentStore.getState();
const id = await store.startExecution('Test task');
console.log('Started:', id);
```

- [ ] SSE connection established in Network tab
- [ ] Events received in real-time
- [ ] UI updates with each event
- [ ] Cleanup works on page navigation
- [ ] Reconnection works after network interruption

## 🚀 Production Deployment

### Pre-Deployment

- [ ] Add rate limiting to SSE endpoints
- [ ] Add monitoring/metrics for SSE connections
- [ ] Configure proper CORS headers
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Load test with multiple concurrent connections
- [ ] Review and adjust heartbeat interval
- [ ] Add connection count monitoring

### Environment Variables

Verify these are set:

- [ ] `OAUTH_SERVER_URL` - For authentication
- [ ] `DATABASE_URL` - Database connection
- [ ] `NODE_ENV` - Set to 'production'

### Performance Tuning

- [ ] Heartbeat interval: Default 30s (adjust if needed)
- [ ] Reconnection delay: Default 3s (adjust if needed)
- [ ] Event throttling for high-frequency events
- [ ] Connection limits per user
- [ ] Memory monitoring for long-running executions

## 📊 Monitoring

### Metrics to Track

- [ ] Active SSE connections count
- [ ] Events sent per second
- [ ] Connection duration
- [ ] Reconnection rate
- [ ] Error rate by event type

### Logging

Add logging for:

- [ ] SSE connection established/closed
- [ ] Authentication failures
- [ ] Event emission errors
- [ ] Execution errors
- [ ] Unusual connection patterns

## 🐛 Common Issues & Solutions

### Issue: SSE connection fails

**Check:**
- [ ] User authenticated (valid session cookie)
- [ ] Execution exists and belongs to user
- [ ] SSE routes registered in main server file
- [ ] No proxy blocking SSE connections

### Issue: Events not received

**Check:**
- [ ] `sendAgentEvent()` being called
- [ ] userId and executionId match
- [ ] No JavaScript errors in console
- [ ] Server logs show event emissions

### Issue: Memory leak

**Check:**
- [ ] `unsubscribeFromExecution()` called on unmount
- [ ] No duplicate subscriptions
- [ ] Connections cleaned up properly
- [ ] EventSource closed on errors

## ✅ Final Verification

Run this complete test:

1. [ ] Start a new execution via UI
2. [ ] Verify SSE connection in Network tab
3. [ ] See real-time thinking steps appear
4. [ ] See plan phases update
5. [ ] See tool usage events
6. [ ] Cancel execution mid-stream
7. [ ] Start new execution immediately after
8. [ ] Navigate away and verify cleanup
9. [ ] Check for memory leaks in DevTools
10. [ ] Review server logs for errors

## 📝 Documentation Updates

- [ ] Add to main README
- [ ] Update API documentation
- [ ] Add architecture diagrams
- [ ] Update changelog
- [ ] Add to developer onboarding docs

## 🎉 Launch

Once all checkboxes are complete:

1. [ ] Merge to main branch
2. [ ] Deploy to staging
3. [ ] Run full test suite
4. [ ] Monitor for 24 hours
5. [ ] Deploy to production
6. [ ] Monitor SSE connections
7. [ ] Celebrate! 🎊

---

**Completion Date:** _____________

**Deployed By:** _____________

**Production URL:** _____________
