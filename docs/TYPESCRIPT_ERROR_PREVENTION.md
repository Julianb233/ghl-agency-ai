# TypeScript Error Prevention Guide

**Created:** January 2026
**Purpose:** Document common TypeScript errors and patterns to avoid them

---

## Errors Encountered in Phase 2

### 1. Missing Default Export for Lazy Loading

**Error:**
```
Type 'Promise<typeof import(...)>' is not assignable to type 'Promise<{ default: ComponentType<any>; }>'
Property 'default' is missing
```

**Cause:** React's `lazy()` expects a module with a `default` export, but the component uses named exports.

**Bad Pattern:**
```tsx
// Component uses named export
export const OnboardingFlow = () => { ... }

// Lazy import fails
const OnboardingFlow = lazy(() => import('./OnboardingFlow'));
```

**Good Pattern:**
```tsx
// Either add default export to component
export default OnboardingFlow;

// Or transform in the lazy call
const OnboardingFlow = lazy(() => 
  import('./OnboardingFlow').then(m => ({ default: m.OnboardingFlow }))
);
```

**Prevention:** Always use the `.then(m => ({ default: m.ComponentName }))` pattern for lazy loading named exports.

---

### 2. Readonly Arrays from `as const`

**Error:**
```
Type 'readonly [...]' is 'readonly' and cannot be assigned to the mutable type 'BreadcrumbItem[]'
```

**Cause:** Using `as const` creates deeply readonly types, but functions expect mutable arrays.

**Bad Pattern:**
```tsx
export const BREADCRUMB_PATHS = {
  home: [{ name: 'Home', url: '/' }],
} as const;

interface Props {
  items: BreadcrumbItem[];  // Mutable array
}

// Error: readonly array can't be assigned to mutable array
<BreadcrumbSchema items={BREADCRUMB_PATHS.home} />
```

**Good Pattern:**
```tsx
interface Props {
  items: readonly BreadcrumbItem[] | BreadcrumbItem[];  // Accept both
}
```

**Prevention:** When defining props that accept constant data, use `readonly T[]` or union types.

---

### 3. Framer Motion Easing Types

**Error:**
```
Type 'string' is not assignable to type 'Easing | Easing[] | undefined'
```

**Cause:** Framer Motion's `ease` property expects specific types, not arbitrary strings.

**Bad Pattern:**
```tsx
interface Props {
  ease?: string;  // Too loose
}

<motion.div transition={{ ease }} />  // Error
```

**Good Pattern:**
```tsx
import { type Transition } from 'framer-motion';

interface Props {
  ease?: Transition['ease'];  // Use framer-motion's type
}
```

**Prevention:** Import and use library-specific types rather than primitive types.

---

### 4. Dynamic Component Selection with `motion[tag]`

**Error:**
```
Element implicitly has an 'any' type because expression of type 'string' can't be used to index type
```

**Cause:** TypeScript can't infer the type when dynamically indexing the `motion` object.

**Bad Pattern:**
```tsx
const Component = motion[as];  // 'as' is a string, TypeScript can't know the result type
```

**Good Pattern:**
```tsx
type MotionTag = 'div' | 'section' | 'article' | 'main';

const MotionComponent = motion[as] as React.ComponentType<{
  ref: React.Ref<HTMLElement>;
  initial: string;
  animate: string;
  variants: Variants;
  className?: string;
  children?: React.ReactNode;
}>;
```

**Prevention:** Use explicit type unions and type assertions for dynamic component selection.

---

### 5. Missing `override` Modifier

**Error:**
```
This member must have an 'override' modifier because it overrides a member in the base class
```

**Cause:** TypeScript 4.3+ requires explicit `override` when overriding class methods.

**Bad Pattern:**
```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error) { ... }  // Missing override
}
```

**Good Pattern:**
```tsx
class ErrorBoundary extends React.Component {
  override componentDidCatch(error: Error) { ... }
}
```

**Prevention:** Always use `override` keyword when overriding base class methods.

---

### 6. Inconsistent Return Types in useEffect

**Error:**
```
Not all code paths return a value
```

**Cause:** `useEffect` callbacks should either always return a cleanup function or never return.

**Bad Pattern:**
```tsx
useEffect(() => {
  if (condition) {
    const timer = setTimeout(...);
    return () => clearTimeout(timer);  // Returns only conditionally
  }
  // No return here
}, []);
```

**Good Pattern:**
```tsx
useEffect(() => {
  if (condition) {
    const timer = setTimeout(...);
    return () => clearTimeout(timer);
  }
  return undefined;  // Explicit return
}, []);
```

**Prevention:** Always have consistent return statements in useEffect.

---

### 7. Wrong Export Names

**Error:**
```
'"./useMobile"' has no exported member named 'useMobile'. Did you mean 'useIsMobile'?
```

**Cause:** Export name in index.ts doesn't match the actual export name in the module.

**Prevention:** 
- Use IDE auto-imports
- Run `pnpm run check` before committing
- Consider using barrel exports with explicit re-exports

---

### 8. Library Import Mismatches

**Error:**
```
Cannot find module 'react-router-dom' or its corresponding type declarations
```

**Cause:** Code references a library that isn't installed. This project uses `wouter`, not `react-router-dom`.

**Prevention:**
- Check `package.json` before using routing imports
- Use consistent patterns across the codebase
- Example files should use the same libraries as the main code

---

### 9. tRPC v11 API Changes

**Error:**
```
Property 'transformer' is missing in type '...' but required in type 'TransformerOptionYes'
```

**Cause:** tRPC v11 moved `transformer` property inside `httpBatchLink`.

**Bad Pattern (tRPC v10):**
```tsx
createTRPCClient({
  links: [httpBatchLink({ url: '/api/trpc' })],
  transformer: superjson,  // Old location
});
```

**Good Pattern (tRPC v11):**
```tsx
createTRPCClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,  // Inside httpBatchLink
    }),
  ],
});
```

**Prevention:** Check library changelogs when upgrading major versions.

---

### 10. Prop Name Mismatches

**Error:**
```
Property 'schema' does not exist on type 'IntrinsicAttributes & JsonLDProps'
```

**Cause:** Using wrong prop name (component expects `data`, code passes `schema`).

**Prevention:**
- Use TypeScript's autocomplete
- Hover over components to see their props
- Add JSDoc comments to component props

---

## Recommended Practices

### 1. Run Type Check Before Committing
```bash
pnpm run check
```

### 2. Enable Strict Mode
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitOverride": true
  }
}
```

### 3. Use Library Types
Import types from libraries rather than guessing:
```tsx
import type { Variants, Transition } from 'framer-motion';
import type { ComponentProps } from 'react';
```

### 4. Prefer Explicit Types for Complex Props
```tsx
// Instead of inferring
const Component = motion[as];

// Be explicit
const Component = motion[as] as React.ComponentType<MotionProps>;
```

### 5. Keep Example Files Updated
Example files (`.example.tsx`) should:
- Use the same libraries as production code
- Be included in type checking
- Be tested in CI

### 6. Document API Changes
When upgrading libraries, document breaking changes in this file.

---

## CI/CD Recommendations

Add to `.github/workflows/test.yml`:
```yaml
- name: Type Check
  run: pnpm run check

- name: Lint
  run: pnpm run lint
```

This ensures TypeScript errors are caught before merging.

---

*Last Updated: January 2026*
