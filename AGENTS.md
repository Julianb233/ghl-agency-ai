# AGENTS.md - GHL Agency AI Workspace

## Commands

- **Build:** `pnpm run build`
- **Type Check:** `pnpm run check` (ALWAYS run before committing)
- **Test:** `pnpm test`
- **Single Test:** `pnpm test <file-pattern>`
- **Dev Server:** `pnpm dev`
- **Lint:** `pnpm run lint`

## Architecture

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend:** Node.js + Express + tRPC 11 + Drizzle ORM
- **Database:** Neon PostgreSQL with pgvector
- **Router:** `wouter` (NOT react-router-dom)
- **State:** Zustand + React Query (via tRPC)
- **Animation:** Framer Motion
- **Testing:** Vitest + Playwright

## Code Style

### TypeScript Patterns

1. **Lazy Loading Named Exports:**
   ```tsx
   // Always use .then() to transform named exports
   const Component = lazy(() => 
     import('./Component').then(m => ({ default: m.Component }))
   );
   ```

2. **Class Method Overrides:**
   ```tsx
   // Always use 'override' keyword
   override componentDidCatch(error: Error) { ... }
   override render() { ... }
   ```

3. **Readonly Arrays in Props:**
   ```tsx
   // Accept both mutable and readonly arrays
   items: readonly BreadcrumbItem[] | BreadcrumbItem[];
   ```

4. **Framer Motion Types:**
   ```tsx
   import { type Transition, type Variants } from 'framer-motion';
   ease?: Transition['ease'];  // NOT string
   ```

5. **useEffect Returns:**
   ```tsx
   useEffect(() => {
     if (condition) {
       return () => cleanup();
     }
     return undefined;  // Always explicit
   }, []);
   ```

6. **Dynamic Motion Components:**
   ```tsx
   const MotionComponent = motion[tag] as React.ComponentType<{
     ref: React.Ref<HTMLElement>;
     // ... props
   }>;
   ```

7. **tRPC v11 Transformer:**
   ```tsx
   httpBatchLink({
     url: '/api/trpc',
     transformer: superjson,  // Inside httpBatchLink, NOT at root
   })
   ```

### Routing

- Use `wouter` for all routing: `import { useLocation } from 'wouter';`
- DO NOT use `react-router-dom` (not installed)

### Component Exports

- Named exports for components: `export function Component() { ... }`
- Use `.then()` wrapper when lazy loading

## Rules

- Run `pnpm run check` before every commit
- No `as any` or `@ts-ignore` without explicit justification
- All new components need tests
- Follow existing patterns in neighboring files

## Reference Docs

- [TypeScript Error Prevention](docs/TYPESCRIPT_ERROR_PREVENTION.md)
- [Phase 2 Design System PRD](docs/PHASE_2_DESIGN_SYSTEM_PRD.md)
- [UI/UX Improvement Plan](UI_UX_IMPROVEMENT_PLAN.md)

## Current Work

**Phase 2 Design System** - Mobile & Accessibility
- See [todo.md](todo.md) for task list
- See [docs/PHASE_2_DESIGN_SYSTEM_PRD.md](docs/PHASE_2_DESIGN_SYSTEM_PRD.md) for specifications
