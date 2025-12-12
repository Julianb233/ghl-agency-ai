import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { CheckCircle2 } from "lucide-react";

export interface FormFieldProps {
  /**
   * Unique identifier for the form field
   */
  id: string;
  /**
   * Label text for the field
   */
  label: string;
  /**
   * Error message to display (if any)
   */
  error?: string;
  /**
   * Whether to show success state
   */
  success?: boolean;
  /**
   * Success message to display
   */
  successMessage?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Optional helper text
   */
  helperText?: string;
  /**
   * The form input element (Input, Textarea, Select, etc.)
   */
  children: React.ReactElement;
  /**
   * Additional classes for the wrapper
   */
  className?: string;
}

/**
 * FormField - Accessible form field wrapper with validation feedback
 *
 * Provides:
 * - Label association
 * - Error message display with icons
 * - Success state indication
 * - Proper ARIA attributes
 * - Visual feedback (borders, icons)
 *
 * @example
 * <FormField
 *   id="email"
 *   label="Email Address"
 *   error={errors.email}
 *   success={!errors.email && touched.email}
 *   required
 * >
 *   <Input
 *     id="email"
 *     type="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *   />
 * </FormField>
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      id,
      label,
      error,
      success = false,
      successMessage,
      required = false,
      helperText,
      children,
      className,
    },
    ref
  ) => {
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const hasError = Boolean(error);

    // Clone the child element and add necessary props
    const childProps = children.props as Record<string, unknown>;
    const enhancedChild = React.cloneElement(children, {
      id,
      "aria-invalid": hasError,
      "aria-describedby": cn(
        error && errorId,
        helperText && helperId
      ) || undefined,
      "aria-required": required,
      className: cn(
        childProps.className as string | undefined,
        // Add visual feedback classes
        hasError && "border-destructive focus-visible:ring-destructive/30",
        success && !hasError && "border-green-500 focus-visible:ring-green-500/30"
      ),
    } as React.Attributes);

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <Label htmlFor={id} className="flex items-center gap-1">
          {label}
          {required && (
            <span className="text-destructive" aria-label="required">
              *
            </span>
          )}
          {success && !hasError && (
            <CheckCircle2
              className="h-4 w-4 text-green-500"
              aria-label="valid"
            />
          )}
        </Label>

        {enhancedChild}

        {helperText && !error && (
          <p
            id={helperId}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}

        {error && <FieldError id={errorId}>{error}</FieldError>}

        {success && !hasError && successMessage && (
          <p className="flex items-center gap-1.5 text-sm text-green-600 mt-1.5">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
