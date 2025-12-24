# GHL Agency AI - Complete Documentation Map

> Visual file tree of all documentation resources for agent reference

**Last Updated**: 2025-12-24
**Purpose**: Quick file path reference for AI agents and developers

---

## Complete File Tree

```
/root/github-repos/ghl-agency-ai/docs/
│
├── INDEX.md                                    # Master documentation index (this is the main entry point)
├── DOCUMENT_MAP.md                             # This file - complete file tree reference
├── README.md                                   # Project overview and main README
│
├── Getting Started
│   ├── QUICK_START_GUIDE.md                   # Fastest way to get started
│   ├── GETTING_STARTED.md                     # Comprehensive setup guide
│   ├── DEVELOPMENT_SETUP.md                   # Local development environment
│   ├── QUICKSTART.md                          # Alternative quickstart
│   ├── USER_GUIDE.md                          # Complete user documentation
│   ├── USER_FLOWS.md                          # Common user workflows
│   └── AGENT_DASHBOARD_USER_GUIDE.md         # Agent dashboard guide
│
├── Architecture
│   ├── ARCHITECTURE.md                        # System architecture with diagrams
│   ├── INTEGRATION_ARCHITECTURE.md            # Service integrations and data flow
│   ├── GHL-Agent-Architecture-Report.md       # GHL-specific architecture
│   ├── DATABASE_SCHEMA.md                     # PostgreSQL schema documentation
│   ├── Authentication-Architecture.md          # Auth flow details
│   ├── AUTHENTICATION_GUIDE.md                # Auth implementation guide
│   └── AUTH_COOKIE_CONFIGURATION.md           # Cookie security setup
│
├── Security
│   ├── SECURITY_INTEGRATION_GUIDE.md          # Security best practices
│   ├── AGENT_PERMISSIONS.md                   # Agent authorization system
│   └── PERMISSIONS_QUICK_REFERENCE.md         # Quick permission lookup
│
├── Browser Automation
│   ├── BROWSERBASE_INTEGRATION.md             # Browserbase setup
│   ├── Browserbase-Integration-Guide.md       # Detailed integration steps
│   ├── STAGEHAND_EXAMPLES.md                  # AI action code examples
│   ├── STAGEHAND_PROMPTING.md                 # Prompt best practices
│   ├── STAGEHAND_V3_FEATURES.md               # Latest features
│   ├── BROWSER_AGENT_GAP_ANALYSIS.md          # Feature gaps and roadmap
│   └── Concurrent-Browser-Limits-System.md    # Session management
│
├── AI Agent System
│   ├── agent-sse-integration.md               # Server-sent events setup
│   ├── agent-sse-flow.md                      # SSE event flow diagrams
│   └── AI-Agent-Training-Methodology.md       # Agent training guide
│
├── RAG & Knowledge
│   ├── RAG_SYSTEM.md                          # Document retrieval system
│   └── RAG_QUICKSTART.md                      # Quick RAG implementation
│
├── Credits & Billing
│   ├── CREDIT_SYSTEM_IMPLEMENTATION.md        # Credit system details
│   └── Pricing-Strategy.md                    # Pricing tiers and models
│
├── Marketing Tools
│   ├── SEO_MODULE.md                          # SEO optimization features
│   ├── META_ADS_INTEGRATION.md                # Meta ads automation
│   ├── META_ADS_QUICK_START.md                # Quick Meta ads setup
│   └── conversion-tracking-quick-reference.md # Analytics tracking
│
├── Performance & Caching
│   ├── REDIS_CACHE_IMPLEMENTATION.md          # Redis cache setup
│   ├── REDIS_CACHE_USAGE.md                   # Cache service usage
│   └── CACHE_QUICK_REFERENCE.md               # Cache patterns
│
├── API & Development
│   ├── API_REFERENCE.md                       # Complete API docs
│   ├── API_DEVELOPER_GUIDE.md                 # Developer guide
│   ├── QUICK_API_REFERENCE.md                 # Fast API lookup
│   ├── TRPC_ENDPOINTS_REFERENCE.md            # All tRPC endpoints
│   ├── GHL-Complete-Functions-Reference.md    # All GHL functions
│   ├── GHL-Expert-Functions-Reference.md      # Advanced GHL functions
│   ├── GHL-Task-Priority-List.md              # Implementation priorities
│   ├── GHL_AUTOMATION_TUTORIALS.md            # Step-by-step tutorials
│   ├── COMPLETE_INTEGRATION_GUIDE.md          # Integration walkthrough
│   ├── FINAL_INTEGRATION_SUMMARY.md           # Integration checklist
│   └── IMPLEMENTATION_SUMMARY.md              # What's implemented
│
├── Deployment
│   ├── DEPLOYMENT_CHECKLIST.md                # Pre-deployment checks
│   ├── REQUIREMENTS_CHECKLIST.md              # System requirements
│   ├── PRELAUNCH_TEST_REPORT.md               # Test results
│   ├── DOCUMENTATION_IMPLEMENTATION_PLAN.md   # Doc organization
│   ├── PHASE_9_1_DOCUMENTATION.md             # Phase 9.1 docs
│   └── INDEX_PHASE_9_1.md                     # Phase 9.1 index
│
├── Marketing & Launch
│   ├── 7_DAY_LAUNCH_PLAYBOOK.md               # Week 1 launch plan
│   ├── WEEK_2_PLAYBOOK.md                     # Week 2 post-launch
│   ├── DUAL_TIMEZONE_SCHEDULE.md              # Multi-timezone launch
│   ├── MARKETING_AUDIT_REPORT.md              # Marketing analysis
│   ├── MARKETING_AUDIT_SUMMARY.md             # Audit summary
│   ├── MARKETING_ACTION_ITEMS.md              # Action items
│   ├── MARKETING_CHECKLIST.md                 # Pre-launch marketing
│   └── NOTION_UPDATE_FOR_HITESH.md            # Client communication
│
├── Voice AI
│   ├── VOICE-AI-IMPLEMENTATION-GUIDE.md       # Complete setup guide
│   └── voice-ai/
│       ├── SYSTEM-PROMPT.md                   # Voice AI personality
│       ├── ACTIONS-CONFIG.md                  # Available actions
│       └── CUSTOM-FIELDS.md                   # GHL custom fields
│
├── Manus Integration
│   ├── MANUS_REPLICA_ARCHITECTURE.md          # Manus architecture
│   ├── MANUS_REPLICA_README.md                # Manus overview
│   ├── MANUS_SYSTEM_PROMPT.md                 # AI configuration
│   └── manus/
│       ├── README.md                          # Manus docs index
│       ├── MANUS_REPLICA_ARCHITECTURE.md      # Architecture details
│       ├── USER_FLOWS.md                      # Manus workflows
│       ├── QUICKSTART.md                      # Quick setup
│       ├── TODO.md                            # Implementation tasks
│       ├── MERGING_TODO.md                    # Integration tasks
│       ├── 7-Day Launch Playbook.md           # Launch strategy
│       ├── WEEK_2_PLAYBOOK.md                 # Week 2 plan
│       ├── Complete Requirements Checklist.md # Requirements
│       ├── Existing Open Source Claude Agent Platforms.md # Alternatives
│       ├── Integration Cost Analysis.md       # Cost breakdown
│       ├── Claude-Flow + GHL Agency AI Integration Architecture.md # Combined arch
│       └── Manus 1.5 System Prompt for Claude API.md # System prompt
│
├── Project Management
│   ├── TODO.md                                # Current dev tasks
│   ├── TODO_FUTURE.md                         # Future roadmap
│   ├── MERGING_TODO.md                        # Integration tasks
│   ├── ADMIN_DASHBOARD_IMPROVEMENT_PLAN.md    # Admin UI enhancements
│   ├── UI_UX_IMPROVEMENT_PLAN.md              # UX improvements
│   └── INTEGRATION_COST_ANALYSIS.md           # Cost estimates
│
├── Troubleshooting
│   ├── TROUBLESHOOTING.md                     # Issue resolution guide
│   └── EXISTING_SOLUTIONS.md                  # Alternative platforms
│
├── Specifications (Archived)
│   └── specifications/
│       ├── INTEGRATION_ARCHITECTURE.md        # Integration specs
│       ├── LAUNCH_PLAYBOOK.md                 # Launch specifications
│       ├── MANUS_REPLICA_ARCHITECTURE.md      # Manus specs
│       ├── MERGING_TODO.md                    # Merge specifications
│       ├── REQUIREMENTS_CHECKLIST.md          # Requirements specs
│       └── USER_FLOWS.md                      # User flow specs
│
├── Testing (To Be Organized)
│   └── testing/                               # Testing documentation
│
├── Monitoring (To Be Organized)
│   └── monitoring/                            # Monitoring setup
│
├── Security (To Be Organized)
│   └── security/                              # Security docs
│
└── Deployment (To Be Organized)
    └── deployment/                            # Deployment docs
```

---

## Document Count by Category

| Category | Count | Location |
|----------|-------|----------|
| Getting Started | 7 | Root directory |
| Architecture | 7 | Root directory |
| Security | 3 | Root directory |
| Browser Automation | 7 | Root directory |
| AI Agent System | 3 | Root directory |
| RAG & Knowledge | 2 | Root directory |
| Credits & Billing | 2 | Root directory |
| Marketing Tools | 4 | Root directory |
| Performance | 3 | Root directory |
| API & Development | 10 | Root directory |
| Deployment | 6 | Root directory |
| Marketing & Launch | 8 | Root directory |
| Voice AI | 4 | /voice-ai subdirectory |
| Manus Integration | 13 | /manus subdirectory |
| Project Management | 6 | Root directory |
| Troubleshooting | 2 | Root directory |
| Specifications | 6 | /specifications subdirectory |
| **Total** | **93 documents** | |

---

## Absolute File Paths (For Agent Reference)

All file paths are relative to the project root. Agents should use absolute paths:

### Root Documentation Files

```
/root/github-repos/ghl-agency-ai/docs/INDEX.md
/root/github-repos/ghl-agency-ai/docs/DOCUMENT_MAP.md
/root/github-repos/ghl-agency-ai/docs/README.md
/root/github-repos/ghl-agency-ai/docs/7_DAY_LAUNCH_PLAYBOOK.md
/root/github-repos/ghl-agency-ai/docs/ADMIN_DASHBOARD_IMPROVEMENT_PLAN.md
/root/github-repos/ghl-agency-ai/docs/AGENT_DASHBOARD_USER_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/AGENT_PERMISSIONS.md
/root/github-repos/ghl-agency-ai/docs/AI-Agent-Training-Methodology.md
/root/github-repos/ghl-agency-ai/docs/API_DEVELOPER_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/API_REFERENCE.md
/root/github-repos/ghl-agency-ai/docs/ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/AUTHENTICATION_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/AUTH_COOKIE_CONFIGURATION.md
/root/github-repos/ghl-agency-ai/docs/Authentication-Architecture.md
/root/github-repos/ghl-agency-ai/docs/BROWSERBASE_INTEGRATION.md
/root/github-repos/ghl-agency-ai/docs/BROWSER_AGENT_GAP_ANALYSIS.md
/root/github-repos/ghl-agency-ai/docs/Browserbase-Integration-Guide.md
/root/github-repos/ghl-agency-ai/docs/CACHE_QUICK_REFERENCE.md
/root/github-repos/ghl-agency-ai/docs/COMPLETE_INTEGRATION_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/CREDIT_SYSTEM_IMPLEMENTATION.md
/root/github-repos/ghl-agency-ai/docs/Concurrent-Browser-Limits-System.md
/root/github-repos/ghl-agency-ai/docs/DATABASE_SCHEMA.md
/root/github-repos/ghl-agency-ai/docs/DEPLOYMENT_CHECKLIST.md
/root/github-repos/ghl-agency-ai/docs/DEVELOPMENT_SETUP.md
/root/github-repos/ghl-agency-ai/docs/DOCUMENTATION_IMPLEMENTATION_PLAN.md
/root/github-repos/ghl-agency-ai/docs/DUAL_TIMEZONE_SCHEDULE.md
/root/github-repos/ghl-agency-ai/docs/EXISTING_SOLUTIONS.md
/root/github-repos/ghl-agency-ai/docs/FINAL_INTEGRATION_SUMMARY.md
/root/github-repos/ghl-agency-ai/docs/GETTING_STARTED.md
/root/github-repos/ghl-agency-ai/docs/GHL-Agent-Architecture-Report.md
/root/github-repos/ghl-agency-ai/docs/GHL-Complete-Functions-Reference.md
/root/github-repos/ghl-agency-ai/docs/GHL-Expert-Functions-Reference.md
/root/github-repos/ghl-agency-ai/docs/GHL-Task-Priority-List.md
/root/github-repos/ghl-agency-ai/docs/GHL_AUTOMATION_TUTORIALS.md
/root/github-repos/ghl-agency-ai/docs/IMPLEMENTATION_SUMMARY.md
/root/github-repos/ghl-agency-ai/docs/INDEX_PHASE_9_1.md
/root/github-repos/ghl-agency-ai/docs/INTEGRATION_ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/INTEGRATION_COST_ANALYSIS.md
/root/github-repos/ghl-agency-ai/docs/MANUS_REPLICA_ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/MANUS_REPLICA_README.md
/root/github-repos/ghl-agency-ai/docs/MANUS_SYSTEM_PROMPT.md
/root/github-repos/ghl-agency-ai/docs/MARKETING_ACTION_ITEMS.md
/root/github-repos/ghl-agency-ai/docs/MARKETING_AUDIT_REPORT.md
/root/github-repos/ghl-agency-ai/docs/MARKETING_AUDIT_SUMMARY.md
/root/github-repos/ghl-agency-ai/docs/MARKETING_CHECKLIST.md
/root/github-repos/ghl-agency-ai/docs/MERGING_TODO.md
/root/github-repos/ghl-agency-ai/docs/META_ADS_INTEGRATION.md
/root/github-repos/ghl-agency-ai/docs/META_ADS_QUICK_START.md
/root/github-repos/ghl-agency-ai/docs/NOTION_UPDATE_FOR_HITESH.md
/root/github-repos/ghl-agency-ai/docs/PERMISSIONS_QUICK_REFERENCE.md
/root/github-repos/ghl-agency-ai/docs/PHASE_9_1_DOCUMENTATION.md
/root/github-repos/ghl-agency-ai/docs/PRELAUNCH_TEST_REPORT.md
/root/github-repos/ghl-agency-ai/docs/Pricing-Strategy.md
/root/github-repos/ghl-agency-ai/docs/QUICKSTART.md
/root/github-repos/ghl-agency-ai/docs/QUICK_API_REFERENCE.md
/root/github-repos/ghl-agency-ai/docs/QUICK_START_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/RAG_QUICKSTART.md
/root/github-repos/ghl-agency-ai/docs/RAG_SYSTEM.md
/root/github-repos/ghl-agency-ai/docs/REDIS_CACHE_IMPLEMENTATION.md
/root/github-repos/ghl-agency-ai/docs/REDIS_CACHE_USAGE.md
/root/github-repos/ghl-agency-ai/docs/REQUIREMENTS_CHECKLIST.md
/root/github-repos/ghl-agency-ai/docs/SECURITY_INTEGRATION_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/SEO_MODULE.md
/root/github-repos/ghl-agency-ai/docs/STAGEHAND_EXAMPLES.md
/root/github-repos/ghl-agency-ai/docs/STAGEHAND_PROMPTING.md
/root/github-repos/ghl-agency-ai/docs/STAGEHAND_V3_FEATURES.md
/root/github-repos/ghl-agency-ai/docs/TODO.md
/root/github-repos/ghl-agency-ai/docs/TODO_FUTURE.md
/root/github-repos/ghl-agency-ai/docs/TROUBLESHOOTING.md
/root/github-repos/ghl-agency-ai/docs/TRPC_ENDPOINTS_REFERENCE.md
/root/github-repos/ghl-agency-ai/docs/UI_UX_IMPROVEMENT_PLAN.md
/root/github-repos/ghl-agency-ai/docs/USER_FLOWS.md
/root/github-repos/ghl-agency-ai/docs/USER_GUIDE.md
/root/github-repos/ghl-agency-ai/docs/VOICE-AI-IMPLEMENTATION-GUIDE.md
/root/github-repos/ghl-agency-ai/docs/WEEK_2_PLAYBOOK.md
/root/github-repos/ghl-agency-ai/docs/agent-sse-flow.md
/root/github-repos/ghl-agency-ai/docs/agent-sse-integration.md
/root/github-repos/ghl-agency-ai/docs/conversion-tracking-quick-reference.md
```

### Subdirectory: /manus

```
/root/github-repos/ghl-agency-ai/docs/manus/7-Day Launch Playbook.md
/root/github-repos/ghl-agency-ai/docs/manus/Claude-Flow + GHL Agency AI Integration Architecture.md
/root/github-repos/ghl-agency-ai/docs/manus/Complete Requirements Checklist.md
/root/github-repos/ghl-agency-ai/docs/manus/Existing Open Source Claude Agent Platforms.md
/root/github-repos/ghl-agency-ai/docs/manus/Integration Cost Analysis.md
/root/github-repos/ghl-agency-ai/docs/manus/MANUS_REPLICA_ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/manus/MERGING_TODO.md
/root/github-repos/ghl-agency-ai/docs/manus/Manus 1.5 System Prompt for Claude API.md
/root/github-repos/ghl-agency-ai/docs/manus/QUICKSTART.md
/root/github-repos/ghl-agency-ai/docs/manus/README.md
/root/github-repos/ghl-agency-ai/docs/manus/TODO.md
/root/github-repos/ghl-agency-ai/docs/manus/USER_FLOWS.md
/root/github-repos/ghl-agency-ai/docs/manus/WEEK_2_PLAYBOOK.md
```

### Subdirectory: /specifications

```
/root/github-repos/ghl-agency-ai/docs/specifications/INTEGRATION_ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/specifications/LAUNCH_PLAYBOOK.md
/root/github-repos/ghl-agency-ai/docs/specifications/MANUS_REPLICA_ARCHITECTURE.md
/root/github-repos/ghl-agency-ai/docs/specifications/MERGING_TODO.md
/root/github-repos/ghl-agency-ai/docs/specifications/REQUIREMENTS_CHECKLIST.md
/root/github-repos/ghl-agency-ai/docs/specifications/USER_FLOWS.md
```

### Subdirectory: /voice-ai

```
/root/github-repos/ghl-agency-ai/docs/voice-ai/ACTIONS-CONFIG.md
/root/github-repos/ghl-agency-ai/docs/voice-ai/CUSTOM-FIELDS.md
/root/github-repos/ghl-agency-ai/docs/voice-ai/SYSTEM-PROMPT.md
```

### Empty Subdirectories (Ready for Organization)

```
/root/github-repos/ghl-agency-ai/docs/deployment/     # Empty - ready for deployment docs
/root/github-repos/ghl-agency-ai/docs/monitoring/     # Empty - ready for monitoring docs
/root/github-repos/ghl-agency-ai/docs/security/       # Empty - ready for security docs
/root/github-repos/ghl-agency-ai/docs/testing/        # Empty - ready for testing docs
```

---

## Quick Search Patterns

### Find documents by keyword (for agents)

**Architecture Documents:**
```
grep -l "architecture\|system design\|diagram" /root/github-repos/ghl-agency-ai/docs/*.md
```

**Setup & Getting Started:**
```
grep -l "setup\|installation\|getting started\|quickstart" /root/github-repos/ghl-agency-ai/docs/*.md
```

**API Documentation:**
```
grep -l "API\|endpoint\|tRPC\|router" /root/github-repos/ghl-agency-ai/docs/*.md
```

**Browser Automation:**
```
grep -l "browser\|Browserbase\|Stagehand" /root/github-repos/ghl-agency-ai/docs/*.md
```

**Marketing & Launch:**
```
grep -l "marketing\|launch\|playbook" /root/github-repos/ghl-agency-ai/docs/*.md
```

---

## Document Organization Guidelines

### For Agents Working with Documentation

1. **Always use absolute paths** starting with `/root/github-repos/ghl-agency-ai/docs/`
2. **Check INDEX.md first** for navigation and context
3. **Use this DOCUMENT_MAP.md** for quick file path lookup
4. **Verify file exists** before reading (files may be moved during organization)
5. **Update both INDEX.md and DOCUMENT_MAP.md** when adding new documentation

### File Organization Rules

- Root directory: Main documentation files
- Subdirectories: Category-specific or feature-specific docs
- Naming convention: UPPERCASE for major docs, lowercase for supporting docs

---

## Navigation Tips for Agents

### Most Commonly Referenced Documents

1. `/root/github-repos/ghl-agency-ai/docs/INDEX.md` - Start here
2. `/root/github-repos/ghl-agency-ai/docs/ARCHITECTURE.md` - System overview
3. `/root/github-repos/ghl-agency-ai/docs/API_REFERENCE.md` - API details
4. `/root/github-repos/ghl-agency-ai/docs/GETTING_STARTED.md` - Setup guide
5. `/root/github-repos/ghl-agency-ai/docs/TROUBLESHOOTING.md` - Problem solving

### Quick Category Lookups

- **Need setup help?** → `/docs/GETTING_STARTED.md` or `/docs/QUICK_START_GUIDE.md`
- **Need API info?** → `/docs/API_REFERENCE.md` or `/docs/QUICK_API_REFERENCE.md`
- **Need architecture?** → `/docs/ARCHITECTURE.md`
- **Need deployment info?** → `/docs/DEPLOYMENT_CHECKLIST.md`
- **Need troubleshooting?** → `/docs/TROUBLESHOOTING.md`

---

## File Path Validation

To verify a file exists before reading:

```bash
# Check if file exists
test -f /root/github-repos/ghl-agency-ai/docs/FILENAME.md && echo "EXISTS" || echo "NOT FOUND"

# List all markdown files in docs root
ls -1 /root/github-repos/ghl-agency-ai/docs/*.md

# List all files recursively
find /root/github-repos/ghl-agency-ai/docs -type f -name "*.md" | sort
```

---

## Maintenance Notes

This document map is auto-maintained by the Documentation Navigator Agent. Last reorganization: 2025-12-24.

When adding new documentation:
1. Place in appropriate subdirectory (or root if general)
2. Update INDEX.md with entry in correct category
3. Update this DOCUMENT_MAP.md with file path
4. Follow naming conventions
5. Add metadata to top of new document

---

**End of Document Map**
