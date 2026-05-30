import React from 'react';
import { type FieldError } from 'react-hook-form';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ValidatedFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  touched?: boolean;
  description?: string;
}

export const ValidatedFormField = React.forwardRef<HTMLInputElement, ValidatedFormFieldProps>(
  ({ label, error, touched, description, className, id, ...props }, ref) => {
    const fieldId = id || props.name;
    const hasError = !!error;
    const isValid = touched && !hasError && props.value;
    
    return (
      <div className="space-y-2">
        <Label 
          htmlFor={fieldId}
          className={cn(hasError && "text-destructive")}
        >
          {label}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            className={cn(
              "pr-10",
              hasError && "border-destructive focus-visible:ring-destructive/50",
              isValid && "border-green-500 focus-visible:ring-green-500/50",
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldId}-error` : undefined}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError && (
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            )}
            {isValid && (
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
            )}
          </div>
        </div>
        
        {hasError && (
          <p 
            id={`${fieldId}-error`}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            {error.message}
          </p>
        )}
        
        {description && !hasError && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }
);

ValidatedFormField.displayName = 'ValidatedFormField';
