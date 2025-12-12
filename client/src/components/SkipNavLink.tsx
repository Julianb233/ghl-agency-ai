import React from 'react';

/**
 * SkipNavLink - Accessibility component for keyboard navigation
 *
 * Provides a hidden link that appears on focus, allowing keyboard users
 * to skip directly to the main content, bypassing navigation menus.
 *
 * WCAG 2.4.1 (Bypass Blocks) - Level A
 */
export const SkipNavLink: React.FC<{ targetId?: string }> = ({
  targetId = 'main-content'
}) => {
  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
};
