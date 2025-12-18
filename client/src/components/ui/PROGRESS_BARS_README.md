# ProgressBars Component

A comprehensive, accessible progress bar component suite for the Bottleneck Bots project. Built with React 19, TypeScript, Radix UI, and Tailwind CSS.

## Features

- **Multi-step Progress Visualization** - Show workflow steps with current state and completion percentage
- **State Management** - Support for `pending`, `in-progress`, `completed`, and `error` states
- **Animated Transitions** - Smooth progress animations with CSS transitions
- **Indeterminate Progress** - Loading spinner mode for unknown duration tasks
- **Time Estimation** - Display elapsed time and remaining time estimates
- **Accessibility** - WCAG 2.1 AA compliant with proper ARIA attributes
- **Responsive Design** - Works on all screen sizes
- **TypeScript Support** - Full type safety with exported types
- **Customizable Variants** - Multiple color schemes (default, success, warning, error)

## Components

### 1. ProgressBar

Simple progress bar with optional percentage display.

```tsx
import { ProgressBar } from "@/components/ui/progress-bars";

// Basic usage
<ProgressBar value={50} />

// With percentage
<ProgressBar value={75} showPercentage />

// With variant
<ProgressBar value={100} variant="success" showPercentage />

// Indeterminate mode
<ProgressBar indeterminate />

// Animated
<ProgressBar value={50} animated />
```

**Props:**
- `value?: number` - Progress value (0-100)
- `variant?: "default" | "success" | "warning" | "error"` - Color variant
- `animated?: boolean` - Enable pulse animation
- `indeterminate?: boolean` - Show indeterminate progress
- `showPercentage?: boolean` - Display percentage below bar
- `className?: string` - Additional CSS classes
- All Radix Progress props

### 2. MultiStepProgress

Visual representation of multi-step workflows.

```tsx
import { MultiStepProgress, type ProgressStep } from "@/components/ui/progress-bars";

const steps: ProgressStep[] = [
  { id: "1", label: "Upload", description: "Upload files", status: "completed" },
  { id: "2", label: "Process", description: "Processing data", status: "in-progress" },
  { id: "3", label: "Complete", description: "Finalize", status: "pending" },
];

// Horizontal (default)
<MultiStepProgress steps={steps} />

// Vertical
<MultiStepProgress steps={steps} orientation="vertical" />

// Without step numbers
<MultiStepProgress steps={steps} showStepNumbers={false} />

// With variant
<MultiStepProgress steps={steps} variant="success" />
```

**Props:**
- `steps: ProgressStep[]` - Array of step objects (required)
- `currentStep?: number` - Currently active step index
- `variant?: "default" | "success" | "warning" | "error"` - Color variant
- `showStepNumbers?: boolean` - Show step numbers (default: true)
- `orientation?: "horizontal" | "vertical"` - Layout orientation
- `className?: string` - Additional CSS classes

**ProgressStep Type:**
```tsx
interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: "pending" | "in-progress" | "completed" | "error";
}
```

### 3. ProgressWithTime

Progress bar with time estimation display.

```tsx
import { ProgressWithTime } from "@/components/ui/progress-bars";

// With time remaining
<ProgressWithTime
  value={60}
  timeRemaining={120} // seconds
/>

// With elapsed time
<ProgressWithTime
  value={40}
  timeElapsed={30} // seconds
/>

// With both
<ProgressWithTime
  value={50}
  timeElapsed={60}
  timeRemaining={60}
  showPercentage
/>

// Hide time display
<ProgressWithTime
  value={50}
  timeRemaining={30}
  showTime={false}
/>
```

**Props:**
- All `ProgressBar` props
- `timeRemaining?: number` - Remaining time in seconds
- `timeElapsed?: number` - Elapsed time in seconds
- `showTime?: boolean` - Show time display (default: true)

**Time Formatting:**
- Under 60s: "30s"
- Under 1h: "2m 30s"
- Over 1h: "1h 30m"

### 4. IndeterminateProgress

Loading spinner for tasks with unknown duration.

```tsx
import { IndeterminateProgress } from "@/components/ui/progress-bars";

// Basic spinner
<IndeterminateProgress />

// With label
<IndeterminateProgress label="Loading data..." />

// Different sizes
<IndeterminateProgress size="sm" label="Small" />
<IndeterminateProgress size="default" label="Default" />
<IndeterminateProgress size="lg" label="Large" />

// Different variants
<IndeterminateProgress variant="success" label="Syncing..." />
<IndeterminateProgress variant="warning" label="Analyzing..." />
<IndeterminateProgress variant="error" label="Retrying..." />
```

**Props:**
- `label?: string` - Optional loading text
- `size?: "sm" | "default" | "lg"` - Spinner size
- `variant?: "default" | "success" | "warning" | "error"` - Color variant
- `className?: string` - Additional CSS classes

## Accessibility Features

All components follow WCAG 2.1 AA guidelines:

### ARIA Attributes
- `role="progressbar"` on ProgressBar (via Radix UI)
- `role="list"` and `role="listitem"` on MultiStepProgress
- `role="status"` on IndeterminateProgress
- `aria-live="polite"` for dynamic updates
- `aria-current="step"` for current step
- `aria-label` on icons for screen readers

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Proper tab order maintained

### Screen Reader Support
- Descriptive labels on all interactive elements
- Progress updates announced via aria-live regions
- Step status communicated through accessible icons

### Reduced Motion
Animations respect `prefers-reduced-motion` media query (configured in global CSS).

## Use Cases

### 1. File Upload
```tsx
function FileUpload() {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  return (
    <ProgressWithTime
      value={progress}
      variant={progress === 100 ? "success" : "default"}
      timeElapsed={timeElapsed}
      timeRemaining={estimateRemaining(progress, timeElapsed)}
      showPercentage
    />
  );
}
```

### 2. Multi-Step Form
```tsx
function OnboardingWizard() {
  const [steps, setSteps] = useState<ProgressStep[]>([
    { id: "1", label: "Account", status: "completed" },
    { id: "2", label: "Profile", status: "in-progress" },
    { id: "3", label: "Preferences", status: "pending" },
  ]);

  return <MultiStepProgress steps={steps} />;
}
```

### 3. Data Processing
```tsx
function DataPipeline() {
  const [isProcessing, setIsProcessing] = useState(false);

  if (isProcessing) {
    return <IndeterminateProgress label="Processing data..." />;
  }

  return <ProgressBar value={progress} showPercentage />;
}
```

### 4. Workflow Status
```tsx
function WorkflowStatus({ workflow }) {
  const steps: ProgressStep[] = workflow.stages.map(stage => ({
    id: stage.id,
    label: stage.name,
    description: stage.description,
    status: stage.status,
  }));

  return (
    <MultiStepProgress
      steps={steps}
      orientation="vertical"
    />
  );
}
```

## Styling

Components use Tailwind CSS and follow the project's design system:

### Color Variants
- **Default**: Primary brand color (emerald green)
- **Success**: Green (#22c55e)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (destructive color)

### Customization
All components accept `className` prop for additional styling:

```tsx
<ProgressBar
  value={50}
  className="h-4" // Custom height
/>

<MultiStepProgress
  steps={steps}
  className="max-w-2xl mx-auto" // Custom container
/>
```

## Animation

### CSS Animations
The indeterminate progress bar uses a custom keyframe animation:

```css
@keyframes progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}
```

Applied in `client/src/index.css`.

### Transitions
- Progress changes: 500ms ease-out
- Step state changes: 300ms ease-out
- Color transitions: 300ms

## Testing

Comprehensive test suite with 74 tests covering:

- Basic rendering and props
- All variant types
- Step status icons and colors
- Progress calculations
- Time formatting
- Accessibility attributes
- Edge cases (empty arrays, invalid values)
- Dynamic updates

Run tests:
```bash
npm test -- progress-bars.test.tsx
```

## Examples

See `progress-bars.example.tsx` for interactive examples:

- Simple Progress Bar
- File Upload Progress
- Multi-Step Workflow
- Vertical Progress
- Error Handling
- Indeterminate Progress
- Data Processing Pipeline

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android

## Dependencies

- `react` ^19.2.3
- `@radix-ui/react-progress` ^1.1.8
- `lucide-react` ^0.453.0 (for icons)
- `class-variance-authority` ^0.7.1
- `tailwindcss` ^4.1.18

## Performance

- Minimal re-renders with React.memo (if needed)
- CSS animations for smooth 60fps
- Lightweight bundle size (~5KB gzipped)
- No external animation libraries

## Future Enhancements

Potential additions:
- [ ] Circular progress variant
- [ ] Segmented progress bars
- [ ] Custom icon support
- [ ] Progress bar groups
- [ ] Success/error callbacks
- [ ] Sound notifications (with opt-out)

## Contributing

When modifying this component:

1. Update tests in `progress-bars.test.tsx`
2. Update examples in `progress-bars.example.tsx`
3. Update this README
4. Ensure accessibility is maintained
5. Test with screen readers
6. Check reduced motion support

## License

MIT
