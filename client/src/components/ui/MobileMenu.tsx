import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  headerHeight?: number;
}

/**
 * Enhanced Mobile Menu Component
 *
 * Features:
 * - Smooth slide-in/out animations
 * - Backdrop overlay with blur
 * - iOS safe area support
 * - Scroll lock when open
 * - Swipe-to-close gesture
 * - Proper z-index layering
 * - Touch-optimized interactions
 */
export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  children,
  headerHeight = 64,
}) => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Handle swipe-to-close gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isUpwardSwipe = distance > 50;
    const isDownwardSwipe = distance < -50;

    // Close on downward swipe
    if (isDownwardSwipe && window.scrollY === 0) {
      onClose();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`mobile-menu-backdrop ${isOpen ? '' : 'mobile-menu-backdrop-exit'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu Container */}
      <div
        className={`mobile-menu-container ${isOpen ? 'mobile-menu-enter' : 'mobile-menu-exit'}`}
        style={{ top: `${headerHeight}px` }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Indicator */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" aria-hidden="true" />
        </div>

        {/* Menu Content */}
        <div className="px-4 pb-6">
          {children}
        </div>
      </div>
    </>
  );
};

interface MobileMenuItemProps {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

/**
 * Mobile Menu Item Component
 *
 * Optimized for touch with:
 * - 44px minimum touch target
 * - Active state feedback
 * - Smooth transitions
 * - Proper focus management
 */
export const MobileMenuItem: React.FC<MobileMenuItemProps> = ({
  href,
  onClick,
  icon,
  children,
  active = false,
}) => {
  const className = `
    flex items-center gap-3 w-full text-left
    px-4 py-3 min-h-[44px]
    text-sm font-medium
    rounded-lg
    transition-all duration-200
    ${active
      ? 'bg-emerald-50 text-emerald-700 font-semibold'
      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
    }
  `;

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={className}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={className}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

interface MobileMenuSectionProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * Mobile Menu Section Component
 * Groups related menu items with optional title
 */
export const MobileMenuSection: React.FC<MobileMenuSectionProps> = ({
  title,
  children,
}) => {
  return (
    <div className="py-2">
      {title && (
        <h3 className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

/**
 * Mobile Menu Divider
 * Visual separator between menu sections
 */
export const MobileMenuDivider: React.FC = () => {
  return <hr className="my-2 border-gray-200" />;
};
