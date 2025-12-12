import * as React from "react";
import { cn } from "@/lib/utils";

export interface LiveRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * How the screen reader should handle updates
   * - "polite": Wait for current speech to finish (default)
   * - "assertive": Interrupt current speech
   * - "off": Don't announce
   */
  politeness?: "polite" | "assertive" | "off";
  /**
   * Whether the entire region should be announced or just the changes
   * - "additions": Only announce new content (default)
   * - "all": Announce all content when changed
   * - "removals": Announce when content is removed
   */
  relevant?: "additions" | "all" | "removals" | "additions text" | "text additions" | "text removals" | "removals text" | "additions removals" | "removals additions";
  /**
   * Whether the region should be visually hidden
   */
  visuallyHidden?: boolean;
}

/**
 * LiveRegion - Component for announcing dynamic content changes to screen readers
 *
 * Use this component to wrap content that updates dynamically (like loading states,
 * form errors, or async data) to ensure screen reader users are notified.
 *
 * WCAG 4.1.3 (Status Messages) - Level AA
 *
 * @example
 * <LiveRegion>
 *   {isLoading ? "Loading..." : "Content loaded"}
 * </LiveRegion>
 *
 * @example
 * <LiveRegion politeness="assertive" visuallyHidden>
 *   {error && `Error: ${error}`}
 * </LiveRegion>
 */
const LiveRegion = React.forwardRef<HTMLDivElement, LiveRegionProps>(
  (
    {
      className,
      politeness = "polite",
      relevant = "additions",
      visuallyHidden = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          visuallyHidden && "sr-only",
          className
        )}
        role="status"
        aria-live={politeness}
        aria-relevant={relevant}
        aria-atomic="true"
        {...props}
      >
        {children}
      </div>
    );
  }
);
LiveRegion.displayName = "LiveRegion";

/**
 * LoadingAnnouncement - Pre-configured live region for loading states
 */
export const LoadingAnnouncement: React.FC<{ isLoading: boolean; message?: string }> = ({
  isLoading,
  message = "Loading..."
}) => {
  return (
    <LiveRegion visuallyHidden politeness="polite">
      {isLoading ? message : ""}
    </LiveRegion>
  );
};

/**
 * ErrorAnnouncement - Pre-configured live region for error messages
 */
export const ErrorAnnouncement: React.FC<{ error?: string | null }> = ({ error }) => {
  return (
    <LiveRegion visuallyHidden politeness="assertive">
      {error ? `Error: ${error}` : ""}
    </LiveRegion>
  );
};

/**
 * SuccessAnnouncement - Pre-configured live region for success messages
 */
export const SuccessAnnouncement: React.FC<{ message?: string | null }> = ({ message }) => {
  return (
    <LiveRegion visuallyHidden politeness="polite">
      {message || ""}
    </LiveRegion>
  );
};

export { LiveRegion };
