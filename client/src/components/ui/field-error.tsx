import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

/**
 * FieldError component for displaying validation error messages
 *
 * Provides visual feedback for form validation errors with:
 * - Error icon for better visibility
 * - Proper ARIA labeling
 * - Consistent styling
 */
const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;

    return (
      <p
        ref={ref}
        className={cn(
          "flex items-center gap-1.5 text-sm text-destructive mt-1.5",
          className
        )}
        role="alert"
        aria-live="polite"
        {...props}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </p>
    );
  }
);
FieldError.displayName = "FieldError";

export { FieldError };
