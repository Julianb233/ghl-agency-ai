# GHL Agency AI - tRPC Endpoints Reference

**Quick reference for all 200+ tRPC endpoints across 31 routers.**

---

## Router Index

| Router | File | Endpoints | Type | Status |
|--------|------|-----------|------|--------|
| [auth](#auth) | routers.ts | 2 | Core | Active |
| [system](#system) | _core/systemRouter.ts | 2 | Core | Active |
| [ai](#ai) | ai.ts | 12+ | Critical | Active |
| [email](#email) | email.ts | 8+ | Core | Active |
| [voice](#voice) | voice.ts | 6+ | Core | Active |
| [seo](#seo) | seo.ts | 7+ | Core | Active |
| [ads](#ads) | ads.ts | 8+ | Core | Active |
| [marketplace](#marketplace) | marketplace.ts | 4+ | Feature | Active |
| [browser](#browser) | browser.ts | 15+ | Critical | Active |
| [workflows](#workflows) | workflows.ts | 10+ | Critical | Active |
| [tasks](#tasks) | tasks.ts | 5+ | Basic | Active |
| [templates](#templates) | templates.ts | 4+ | Feature | Active |
| [quiz](#quiz) | quiz.ts | 8+ | Feature | Active |
| [onboarding](#onboarding) | onboarding.ts | 6+ | Feature | Active |
| [aiCalling](#aicalling) | aiCalling.ts | 5+ | Core | Active |
| [credits](#credits) | credits.ts | 6+ | Core | Active |
| [leadEnrichment](#leadenrichment) | leadEnrichment.ts | 5+ | Core | Active |
| [scheduledTasks](#scheduledtasks) | scheduledTasks.ts | 8+ | Core | Active |
| [rag](#rag) | rag.ts | 6+ | Core | Active |
| [alerts](#alerts) | alerts.ts | 7+ | Feature | Active |
| [analytics](#analytics) | analytics.ts | 8+ | Feature | Active |
| [health](#health) | health.ts | 10+ | Core | Active |
| [apiKeys](#apikeys) | apiKeys.ts | 5+ | Core | Active |
| [settings](#settings) | settings.ts | 20+ | Critical | Active |
| [webhooks](#webhooks) | webhooks.ts | 8+ | Core | Active |
| [agencyTasks](#agencytasks) | agencyTasks.ts | 6+ | Feature | Active |
| [clientProfiles](#clientprofiles) | clientProfiles.ts | 5+ | Feature | Active |
| [admin](#admin) | admin/index.ts | 8+ | Admin | Active |
| [agent](#agent) | agent.ts | 6+ | Core | Active |
| [webdev](#webdev) | webdev.ts | 7+ | Feature | Active |
| [deployment](#deployment) | deployment.ts | 5+ | Feature | Active |
| [mcp](#mcp) | mcp.ts | 4+ | Experimental | Beta |
| [swarm](#swarm) | swarm.ts | 5+ | Experimental | Beta |

---

## Endpoint Details by Router

### auth
**File:** `routers.ts`
**Type:** Core Authentication
**Access:** Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `me` | query | Get current user info |
| `logout` | mutation | Clear session and logout |

---

### system
**File:** `_core/systemRouter.ts`
**Type:** System Operations
**Access:** Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `notifyOwner` | mutation | Send notification to project owner |

---

### ai
**File:** `ai.ts`
**Size:** 49.5 KB (1,500+ lines)
**Type:** AI Agent Orchestration
**Access:** Protected
**Dependencies:** Google Gemini API, Browserbase

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `startAgent` | Initialize AI agent for task | `{ taskId, context, model }` | `{ agentId, status }` |
| `executeStep` | Execute single agent step | `{ agentId, step }` | `{ result, nextStep }` |
| `getAgentStatus` | Get current agent state | `{ agentId }` | `{ status, progress, logs }` |
| `stopAgent` | Halt running agent | `{ agentId, reason }` | `{ success }` |
| `analyzeContent` | Use Gemini to analyze content | `{ content, prompt }` | `{ analysis, confidence }` |
| `generateInsights` | Generate insights from data | `{ data, dataType }` | `{ insights, summary }` |
| `trainModel` | Fine-tune AI model | `{ trainingData, model }` | `{ modelId, accuracy }` |
| `evaluatePerformance` | Assess agent performance | `{ agentId, metrics }` | `{ score, recommendations }` |
| `getAgentHistory` | Retrieve agent execution history | `{ agentId, limit }` | `{ executions[] }` |
| `createPrompt` | Create reusable AI prompt | `{ name, template }` | `{ promptId, template }` |
| `optimizePrompt` | Optimize prompt for better results | `{ promptId, feedback }` | `{ optimizedPrompt }` |
| `batchAnalysis` | Process multiple items via AI | `{ items[], prompt }` | `{ results[] }` |

---

### email
**File:** `email.ts`
**Size:** 22.3 KB (700+ lines)
**Type:** Email Automation
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `sendEmail` | Send templated email | `{ to, template, variables }` | `{ messageId, status }` |
| `getEmailTemplates` | List email templates | `{ page, limit }` | `{ templates[], pagination }` |
| `createTemplate` | Create new email template | `{ name, subject, body }` | `{ templateId, preview }` |
| `updateTemplate` | Modify email template | `{ templateId, updates }` | `{ template }` |
| `deleteTemplate` | Remove email template | `{ templateId }` | `{ success }` |
| `testEmail` | Send test email | `{ templateId, recipient }` | `{ success, preview }` |
| `getEmailStats` | Get email delivery stats | `{ templateId, range }` | `{ sent, opened, clicked }` |
| `scheduleEmail` | Schedule email for later | `{ templateId, time }` | `{ scheduledId, confirmedTime }` |

---

### voice
**File:** `voice.ts`
**Size:** 23.1 KB (700+ lines)
**Type:** Voice/Call Automation
**Access:** Protected
**Dependencies:** Vapi API

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `initiateCall` | Start outbound call | `{ phoneNumber, script }` | `{ callId, status }` |
| `getCallStatus` | Check call progress | `{ callId }` | `{ status, duration, recording }` |
| `endCall` | Terminate active call | `{ callId, reason }` | `{ success, transcript }` |
| `getCallRecording` | Retrieve call recording | `{ callId }` | `{ recordingUrl, duration }` |
| `getCallTranscript` | Get call transcript | `{ callId }` | `{ transcript, sentiment }` |
| `recordVoiceMessage` | Create voice message | `{ text, voice }` | `{ messageId, audioUrl }` |

---

### seo
**File:** `seo.ts`
**Size:** 13.1 KB (400+ lines)
**Type:** SEO Analysis & Optimization
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `analyzePage` | SEO audit for URL | `{ url, depth }` | `{ score, issues[], suggestions[] }` |
| `getKeywordData` | Get keyword metrics | `{ keyword, location }` | `{ volume, difficulty, cpc }` |
| `generateSitemap` | Create XML sitemap | `{ domain, urlLimit }` | `{ sitemapUrl }` |
| `checkBacklinks` | Analyze backlink profile | `{ domain }` | `{ backlinks[], score }` |
| `auditMetaTags` | Review meta tags | `{ url }` | `{ issues[], recommendations[] }` |
| `getPageSpeed` | Analyze page performance | `{ url }` | `{ score, metrics, suggestions[] }` |
| `trackRankings` | Monitor keyword rankings | `{ keywords[], domain }` | `{ rankings, changes }` |

---

### ads
**File:** `ads.ts`
**Size:** 12.7 KB (400+ lines)
**Type:** Ad Management
**Access:** Protected
**Dependencies:** Google Ads API, Facebook Ads API

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createCampaign` | Set up new ad campaign | `{ name, budget, targeting }` | `{ campaignId, status }` |
| `updateBudget` | Adjust campaign budget | `{ campaignId, newBudget }` | `{ campaignId, allocations }` |
| `pauseCampaign` | Pause active campaign | `{ campaignId }` | `{ success }` |
| `getPerformance` | Get campaign metrics | `{ campaignId, range }` | `{ impressions, clicks, ctr, roi }` |
| `createAd` | Create individual ad | `{ campaignId, creative, targeting }` | `{ adId, preview }` |
| `updateAd` | Modify existing ad | `{ adId, updates }` | `{ ad }` |
| `getAdMetrics` | Get ad-level performance | `{ adId, range }` | `{ impressions, conversions, cost }` |
| `syncGoogleAds` | Sync with Google Ads | `{ accountId }` | `{ synced, lastSync }` |

---

### marketplace
**File:** `marketplace.ts`
**Size:** 9.8 KB (300+ lines)
**Type:** Template/Plugin Marketplace
**Access:** Public/Protected

| Endpoint | Description | Access |
|----------|-------------|--------|
| `listItems` | Browse marketplace | Public |
| `getItem` | Get marketplace item details | Public |
| `installItem` | Install template/plugin | Protected |
| `getInstalled` | List installed items | Protected |

---

### browser
**File:** `browser.ts`
**Size:** 78.8 KB (2,400+ lines)
**Type:** Browser Automation (Critical)
**Access:** Protected
**Dependencies:** Browserbase, Stagehand

| Endpoint | Category | Description |
|----------|----------|-------------|
| `createSession` | Session Mgmt | Create Browserbase session |
| `getSession` | Session Mgmt | Retrieve session info |
| `closeSession` | Session Mgmt | Terminate browser session |
| `listSessions` | Session Mgmt | Get user sessions |
| `executeAction` | Actions | Run single browser action |
| `navigate` | Actions | Load URL |
| `takeScreenshot` | Capture | Get current page screenshot |
| `recordSession` | Recording | Start/stop recording |
| `getRecording` | Recording | Retrieve session recording |
| `extractData` | Extraction | Extract data with schema |
| `getExtractedData` | Extraction | Retrieve extracted data |
| `observePage` | Observation | Describe page state |
| `waitForElement` | Waiting | Wait for element presence |
| `getSessionMetrics` | Analytics | Session cost & metrics |
| `debugSession` | Debugging | Get debug info |

---

### workflows
**File:** `workflows.ts`
**Size:** 21.3 KB (650+ lines)
**Type:** Workflow Orchestration (Critical)
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `create` | Create new workflow | `{ name, steps, trigger }` | `{ workflowId, status }` |
| `update` | Modify workflow | `{ workflowId, updates }` | `{ workflow }` |
| `delete` | Archive workflow | `{ workflowId }` | `{ success }` |
| `list` | List user workflows | `{ page, limit }` | `{ workflows[], pagination }` |
| `getById` | Get workflow details | `{ workflowId }` | `{ workflow, steps }` |
| `execute` | Run workflow | `{ workflowId, input }` | `{ executionId, status }` |
| `testExecute` | Test workflow run | `{ workflowId, input }` | `{ result, logs, duration }` |
| `getExecution` | Get execution status | `{ executionId }` | `{ status, result, logs }` |
| `cancelExecution` | Stop running execution | `{ executionId }` | `{ success }` |
| `getExecutionHistory` | List executions | `{ workflowId, limit }` | `{ executions[] }` |

---

### tasks
**File:** `tasks.ts`
**Size:** 2.2 KB (65 lines)
**Type:** Task Management (Basic)
**Access:** Public

| Endpoint | Description |
|----------|-------------|
| `getAll` | List all tasks |
| `create` | Create task |
| `toggle` | Enable/disable task |
| `runNow` | Execute task immediately |

---

### templates
**File:** `templates.ts`
**Size:** 1.2 KB (35 lines)
**Type:** Template Management
**Access:** Public/Protected

| Endpoint | Description |
|----------|-------------|
| `list` | Browse templates |
| `getById` | Get template details |
| `create` | Create new template |
| `update` | Modify template |

---

### quiz
**File:** `quiz.ts`
**Size:** 31.0 KB (950+ lines)
**Type:** Quiz/Assessment System
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createQuiz` | Create new quiz | `{ name, questions }` | `{ quizId }` |
| `updateQuiz` | Modify quiz | `{ quizId, updates }` | `{ quiz }` |
| `publishQuiz` | Make quiz live | `{ quizId }` | `{ success, shareUrl }` |
| `getQuiz` | Get quiz details | `{ quizId }` | `{ quiz, stats }` |
| `startAttempt` | Begin quiz taking | `{ quizId }` | `{ attemptId, questions }` |
| `submitAnswer` | Record answer | `{ attemptId, questionId, answer }` | `{ correct }` |
| `submitQuiz` | Complete quiz | `{ attemptId }` | `{ score, results }` |
| `getResults` | Get attempt results | `{ attemptId }` | `{ score, breakdown, feedback }` |

---

### onboarding
**File:** `onboarding.ts`
**Size:** 8.7 KB (260+ lines)
**Type:** Client Onboarding
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `startOnboarding` | Initialize client setup | `{ clientId, type }` | `{ onboardingId, steps }` |
| `completeStep` | Mark step complete | `{ onboardingId, stepId }` | `{ progress }` |
| `getProgress` | Check onboarding status | `{ onboardingId }` | `{ completed, currentStep }` |
| `sendInvite` | Invite to onboarding | `{ clientId, email }` | `{ inviteUrl }` |
| `getOnboardingData` | Retrieve client data | `{ onboardingId }` | `{ data }` |
| `completeOnboarding` | Finish process | `{ onboardingId }` | `{ clientId, ready }` |

---

### aiCalling
**File:** `aiCalling.ts`
**Size:** 22.3 KB (700+ lines)
**Type:** AI Call Center
**Access:** Protected
**Dependencies:** Vapi, Twilio

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `startCall` | Initiate AI call | `{ phoneNumber, scenario }` | `{ callId, status }` |
| `configureAgent` | Set call agent | `{ callId, agentConfig }` | `{ success }` |
| `getCallAnalytics` | Get call metrics | `{ callId }` | `{ duration, sentiment, summary }` |
| `transferCall` | Transfer to human | `{ callId, queueId }` | `{ success, agentId }` |
| `recordCall` | Enable call recording | `{ callId }` | `{ recordingId }` |
| `endCall` | Terminate call | `{ callId }` | `{ transcript, duration }` |

---

### credits
**File:** `credits.ts`
**Size:** 14.1 KB (430+ lines)
**Type:** Credit/Token Management
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `getBalance` | Get current credits | `{ userId }` | `{ balance, lastUpdated }` |
| `purchaseCredits` | Buy credits | `{ amount, paymentMethod }` | `{ transactionId, newBalance }` |
| `useCredits` | Deduct credits | `{ amount, reason }` | `{ success, newBalance }` |
| `getHistory` | Get credit transactions | `{ limit, offset }` | `{ transactions[] }` |
| `getMetrics` | Get usage stats | `{ range }` | `{ totalUsed, byFeature }` |
| `refundCredits` | Refund credits | `{ transactionId, amount }` | `{ success }` |

---

### leadEnrichment
**File:** `leadEnrichment.ts`
**Size:** 26.9 KB (800+ lines)
**Type:** Lead Data Enrichment
**Access:** Protected
**Dependencies:** Lead enrichment APIs

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `enrichEmail` | Get data for email | `{ email }` | `{ profile, confidence }` |
| `enrichPhone` | Get data for phone | `{ phoneNumber }` | `{ profile, confidence }` |
| `enrichCompany` | Get company data | `{ domain or name }` | `{ company, employees }` |
| `bulkEnrich` | Enrich multiple leads | `{ leads[] }` | `{ results[], unmatchedCount }` |
| `getEnrichmentHistory` | Get past enrichments | `{ limit }` | `{ enrichments[] }` |

---

### scheduledTasks
**File:** `scheduledTasks.ts`
**Size:** 23.6 KB (720+ lines)
**Type:** Task Scheduling
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createTask` | Schedule new task | `{ name, schedule, config }` | `{ taskId, nextRun }` |
| `updateTask` | Modify scheduled task | `{ taskId, updates }` | `{ task }` |
| `deleteTask` | Remove scheduled task | `{ taskId }` | `{ success }` |
| `listTasks` | Get scheduled tasks | `{ status, limit }` | `{ tasks[] }` |
| `enableTask` | Activate task | `{ taskId }` | `{ success }` |
| `disableTask` | Pause task | `{ taskId }` | `{ success }` |
| `runNow` | Execute immediately | `{ taskId }` | `{ executionId }` |
| `getExecutionHistory` | Get past executions | `{ taskId, limit }` | `{ executions[] }` |

---

### rag
**File:** `rag.ts`
**Size:** 15.6 KB (480+ lines)
**Type:** Retrieval-Augmented Generation
**Access:** Protected
**Dependencies:** Vector DB, LLM

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createKnowledgeBase` | Set up new KB | `{ name, documents }` | `{ kbId, indexed }` |
| `addDocuments` | Add to knowledge base | `{ kbId, documents }` | `{ success, count }` |
| `query` | Search knowledge base | `{ kbId, query, limit }` | `{ results[], scores }` |
| `deleteKnowledgeBase` | Remove KB | `{ kbId }` | `{ success }` |
| `getKbInfo` | Get KB stats | `{ kbId }` | `{ documentCount, embedding }` |
| `updateDocuments` | Modify KB content | `{ kbId, documents }` | `{ success }` |

---

### alerts
**File:** `alerts.ts`
**Size:** 19.4 KB (590+ lines)
**Type:** Alert & Notification System
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createAlert` | Set up alert | `{ condition, action, threshold }` | `{ alertId }` |
| `updateAlert` | Modify alert | `{ alertId, updates }` | `{ alert }` |
| `deleteAlert` | Remove alert | `{ alertId }` | `{ success }` |
| `listAlerts` | Get user alerts | `{ limit }` | `{ alerts[] }` |
| `getAlertHistory` | Get triggered alerts | `{ alertId, limit }` | `{ triggers[] }` |
| `testAlert` | Send test notification | `{ alertId }` | `{ success }` |
| `updatePreferences` | Set notification prefs | `{ channels, frequency }` | `{ success }` |

---

### analytics
**File:** `analytics.ts`
**Size:** 20.4 KB (600+ lines)
**Type:** Usage Analytics
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `getMetrics` | Get usage metrics | `{ range, type }` | `{ metrics }` |
| `getDashboard` | Get dashboard data | `{ dashboard }` | `{ widgets[] }` |
| `getReport` | Generate report | `{ range, format }` | `{ reportUrl }` |
| `getSessionMetrics` | Get session stats | `{ range }` | `{ sessions, duration, costs }` |
| `getFeatureUsage` | Get feature breakdown | `{ range }` | `{ features[], usage }` |
| `getCostAnalysis` | Get cost breakdown | `{ range }` | `{ byFeature[], total }` |
| `exportMetrics` | Export data | `{ range, format }` | `{ downloadUrl }` |
| `getCustomMetric` | Get custom metric | `{ metricId, range }` | `{ data }` |

---

### health
**File:** `health.ts`
**Size:** 8.4 KB (316 lines)
**Type:** System Health
**Access:** Public

| Endpoint | Description | Output |
|----------|-------------|--------|
| `getSystemHealth` | Overall health status | `{ healthy, circuits }` |
| `getCircuitStates` | Circuit breaker states | `{ states }` |
| `getServiceHealth` | Single service health | `{ state, failureRate }` |
| `resetCircuit` | Reset circuit breaker | `{ success }` |
| `resetAllCircuits` | Reset all breakers | `{ success }` |
| `getServiceAvailability` | Service availability | `{ available[], unavailable[] }` |
| `liveness` | K8s liveness probe | `{ status }` |
| `readiness` | K8s readiness probe | `{ ready, reasons }` |
| `getMetrics` | System metrics | `{ totalRequests, failureRate }` |
| `getHealth` | REST endpoint for health | `{ status, version }` |

---

### apiKeys
**File:** `apiKeys.ts`
**Size:** 12.5 KB (380+ lines)
**Type:** API Key Management
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `create` | Create API key | `{ name, scopes, rateLimitPerMinute }` | `{ key, secret }` |
| `list` | List API keys | `{ limit }` | `{ keys[] }` |
| `revoke` | Deactivate key | `{ keyId }` | `{ success }` |
| `rotate` | Generate new secret | `{ keyId }` | `{ newSecret }` |
| `getUsage` | Get key usage stats | `{ keyId, range }` | `{ requests, byEndpoint }` |

---

### settings
**File:** `settings.ts`
**Size:** 54.6 KB (1,650+ lines)
**Type:** Configuration (Critical)
**Access:** Protected/Admin

| Category | Endpoints |
|----------|-----------|
| **User Settings** | updateProfile, getProfile, updatePreferences, etc. |
| **Organization** | updateOrg, getMembers, addMember, removeMember, etc. |
| **Billing** | getPlan, updateBilling, getBillingHistory, etc. |
| **Integrations** | connectService, disconnectService, getIntegrations, etc. |
| **Automations** | getAutomationConfig, updateAutomationConfig, etc. |
| **Webhooks** | createWebhook, listWebhooks, updateWebhook, deleteWebhook |
| **Notifications** | updateNotificationSettings, testNotification, etc. |
| **Security** | updatePassword, enable2FA, getSecurityLog, etc. |

---

### webhooks
**File:** `webhooks.ts`
**Size:** 29.5 KB (900+ lines)
**Type:** Webhook Management
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `create` | Create webhook | `{ url, events, secret }` | `{ webhookId }` |
| `update` | Modify webhook | `{ webhookId, updates }` | `{ webhook }` |
| `delete` | Remove webhook | `{ webhookId }` | `{ success }` |
| `list` | List webhooks | `{ limit }` | `{ webhooks[] }` |
| `test` | Send test event | `{ webhookId, event }` | `{ success, response }` |
| `getDeliveries` | Get delivery history | `{ webhookId, limit }` | `{ deliveries[] }` |
| `retryDelivery` | Resend failed delivery | `{ deliveryId }` | `{ success }` |
| `getSignatureKey` | Get signing secret | `{ webhookId }` | `{ secret }` |

---

### agencyTasks
**File:** `agencyTasks.ts`
**Size:** 25.5 KB (800+ lines)
**Type:** Agency Operations
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `create` | Create agency task | `{ clientId, type, config }` | `{ taskId }` |
| `list` | List agency tasks | `{ clientId, status }` | `{ tasks[] }` |
| `update` | Modify task | `{ taskId, updates }` | `{ task }` |
| `delete` | Remove task | `{ taskId }` | `{ success }` |
| `execute` | Run task | `{ taskId }` | `{ executionId }` |
| `getStatus` | Get task status | `{ taskId }` | `{ status, progress }` |

---

### clientProfiles
**File:** `clientProfiles.ts`
**Size:** 9.3 KB (280+ lines)
**Type:** Client Management
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `create` | Create client profile | `{ name, contact, config }` | `{ clientId }` |
| `update` | Update profile | `{ clientId, updates }` | `{ client }` |
| `get` | Get profile | `{ clientId }` | `{ client }` |
| `list` | List clients | `{ limit }` | `{ clients[], pagination }` |
| `delete` | Remove client | `{ clientId }` | `{ success }` |

---

### admin
**File:** `admin/index.ts`
**Size:** Variable
**Type:** Admin Dashboard
**Access:** Admin only

| Endpoint | Description |
|----------|-------------|
| `getSystemStats` | System-wide metrics |
| `getUserStats` | User base statistics |
| `getUsageStats` | Overall usage metrics |
| `getBillingStats` | Billing overview |
| `getErrorLogs` | System error logs |
| `getUsersList` | All users (paginated) |
| `suspendUser` | Disable user account |
| `resetUserPassword` | Admin password reset |

---

### agent
**File:** `agent.ts`
**Size:** 17.5 KB (530+ lines)
**Type:** Autonomous Agent
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `deploy` | Deploy agent | `{ name, config }` | `{ agentId, status }` |
| `getStatus` | Get agent status | `{ agentId }` | `{ status, metrics }` |
| `executeTask` | Run agent task | `{ agentId, task }` | `{ executionId }` |
| `getMetrics` | Get agent performance | `{ agentId }` | `{ accuracy, speed }` |
| `updateConfig` | Modify agent config | `{ agentId, config }` | `{ success }` |
| `remove` | Delete agent | `{ agentId }` | `{ success }` |

---

### webdev
**File:** `webdev.ts`
**Size:** 22.2 KB (680+ lines)
**Type:** Web Development Automation
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createProject` | New web project | `{ name, template }` | `{ projectId }` |
| `updateProject` | Modify project | `{ projectId, updates }` | `{ project }` |
| `deployProject` | Deploy site | `{ projectId, target }` | `{ deploymentId }` |
| `getProjectStatus` | Get project state | `{ projectId }` | `{ status, preview }` |
| `generateCode` | Generate code | `{ projectId, spec }` | `{ code }` |
| `optimizePerformance` | Performance tuning | `{ projectId }` | `{ suggestions[] }` |
| `getAnalytics` | Get site analytics | `{ projectId, range }` | `{ metrics }` |

---

### deployment
**File:** `deployment.ts`
**Size:** 10.2 KB (310+ lines)
**Type:** Deployment Management
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `deploy` | Deploy project | `{ projectId, env }` | `{ deploymentId, url }` |
| `getStatus` | Deployment status | `{ deploymentId }` | `{ status, logs }` |
| `rollback` | Revert deployment | `{ deploymentId }` | `{ success, version }` |
| `listDeployments` | Deployment history | `{ projectId, limit }` | `{ deployments[] }` |
| `getLogs` | Get deployment logs | `{ deploymentId }` | `{ logs }` |

---

### mcp
**File:** `mcp.ts`
**Size:** 10.2 KB (310+ lines)
**Type:** Model Context Protocol
**Status:** Experimental
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `connectContext` | Connect context | `{ contextId, data }` | `{ success }` |
| `queryContext` | Query context | `{ contextId, query }` | `{ results }` |
| `updateContext` | Update context | `{ contextId, updates }` | `{ success }` |
| `getContexts` | List contexts | `{ limit }` | `{ contexts[] }` |

---

### swarm
**File:** `swarm.ts`
**Size:** 22.2 KB (680+ lines)
**Type:** Multi-Agent Swarm
**Status:** Experimental
**Access:** Protected

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `createSwarm` | Create agent swarm | `{ name, agents, config }` | `{ swarmId }` |
| `addAgent` | Add to swarm | `{ swarmId, agentId }` | `{ success }` |
| `removeAgent` | Remove from swarm | `{ swarmId, agentId }` | `{ success }` |
| `executeTask` | Run swarm task | `{ swarmId, task }` | `{ executionId }` |
| `getMetrics` | Swarm performance | `{ swarmId }` | `{ efficiency, accuracy }` |

---

## Authentication & Access Levels

### Access Tiers

- **Public** - No authentication required
  - `health.*`, `auth.me` (partially)
- **Protected** - User must be authenticated
  - Most endpoints (default)
- **Admin** - Administrator only
  - `admin.*` and some `settings.*`

### Authentication Methods

1. **Session-based** (Frontend)
   - JWT cookie in session
   - Automatic via HTTP-only cookie

2. **API Key** (REST API)
   - Bearer token in header
   - Format: `Authorization: Bearer ghl_xxx`

3. **tRPC Client** (Internal)
   - Automatic context passing
   - Type-safe

---

## Common Patterns

### Pagination
```typescript
// Input
{ limit: 20, offset: 0 }
// or
{ page: 1, limit: 20 }

// Output
{ data: T[], pagination: { total, limit, offset, pages } }
```

### Bulk Operations
```typescript
// Input
{ items: T[] }

// Output
{ results: U[], failures: Error[] }
```

### Async Operations
```typescript
// Returns immediately with execution ID
{ executionId: string, status: 'queued' }

// Poll for results
getExecutionStatus({ executionId })
// Returns: { status, result, error }
```

---

## Error Handling

All endpoints return consistent error format:

```typescript
{
  code: "ERROR_CODE",
  message: "Human readable message",
  details?: {}
}
```

Common HTTP codes:
- `200` - Success
- `201` - Created
- `202` - Accepted (async)
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `422` - Validation error
- `429` - Rate limited
- `500` - Server error

---

## Rate Limits

**Defaults:**
- Per user: 100 requests/minute
- Burst: 500 requests/5 seconds
- Per API key: Configurable

---

## Related Documentation

- [Full OpenAPI Spec](./server/api/rest/openapi.yaml)
- [REST API Guide](./server/api/rest/README.md)
- [Authentication Architecture](./docs/Authentication-Architecture.md)
- [Architecture Report](./docs/GHL-Agent-Architecture-Report.md)

---

**Last Updated:** December 12, 2025
**Status:** Complete and Accurate
**Maintained By:** API Documentation Team
