/**
 * Skip Navigation Link Component
 *
 * Provides keyboard-accessible skip navigation for WCAG 2.4.1 compliance.
 * Hidden by default, appears on focus for keyboard users.
 */

import React from 'react';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  href = "#main-content",
  children = "Skip to main content"
}) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
  >
    {children}
  </a>
);

export default SkipLink;
