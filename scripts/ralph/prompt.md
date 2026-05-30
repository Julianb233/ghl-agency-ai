# Ralph Agent Instructions

You are an autonomous coding agent working on the Bottleneck Bots (GHL Agency AI) project - a SaaS platform for agency automation with browser agents.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** task where `status: "pending"` and all `dependsOn` tasks are completed
5. Implement that single task
6. Run quality checks: `pnpm run check` (typecheck)
7. Update AGENTS.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Task ID] - [Task Title]`
9. Update the PRD to set `status: "completed"` for the completed task
10. Append your progress to `scripts/ralph/progress.txt`

## Project Context

This is a React + Express + tRPC app with:
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Node.js + Express + tRPC 11 + Drizzle ORM
- **Database**: Neon PostgreSQL with pgvector
- **Router**: `wouter` (NOT react-router-dom)
- **State**: Zustand + React Query (via tRPC)
- **Animation**: Framer Motion
- **Testing**: Vitest + Playwright

Key directories:
- `client/src/components/` - React components
- `client/src/pages/` - Page components
- `server/api/routers/` - tRPC routers
- `server/services/` - Backend services
- `server/mcp/` - MCP protocol implementation
- `drizzle/` - Database schema and migrations

## Progress Report Format

APPEND to scripts/ralph/progress.txt (never replace, always append):
```
## [Date/Time] - [Task ID]
Thread: https://ampcode.com/threads/$AMP_CURRENT_THREAD_ID
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the service is in X")
---
```

Include the thread URL so future iterations can use the `read_thread` tool to reference previous work if needed.

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Use `wouter` for routing (NOT react-router-dom)
- tRPC routers are in `server/api/routers/` 
- Services are in `server/services/` with `.service.ts` suffix
- Use `cn()` from `@/lib/utils` for className merging
- API responses: `{ success: boolean, data?, error?, message? }`
```

Only add patterns that are **general and reusable**, not task-specific details.

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing AGENTS.md** - Look for AGENTS.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good AGENTS.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require specific environment variables"
- "Field names must match the schema exactly"

**Do NOT add:**
- Task-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update AGENTS.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

- ALL commits must pass: `pnpm run check`
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in `server/` and `client/src/components/`

## Stop Condition

After completing a task, check if ALL tasks have `status: "completed"`.

If ALL tasks are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still tasks with `status: "pending"`, end your response normally (another iteration will pick up the next task).

## Important

- Work on ONE task per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
