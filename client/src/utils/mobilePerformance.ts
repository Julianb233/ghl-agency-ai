/**
 * Mobile Performance Optimization Utilities
 *
 * Collection of utilities to improve mobile app performance:
 * - Lazy loading components
 * - Image optimization
 * - Network detection
 * - Battery status
 * - Memory management
 */

/**
 * Detect if user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Detect if user is on a slow connection
 */
export const isSlowConnection = (): boolean => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }

  const connection = (navigator as any).connection;
  return (
    connection?.saveData ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g' ||
    connection?.effectiveType === '3g'
  );
};

/**
 * Get network information
 */
export const getNetworkInfo = () => {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null;
  }

  const connection = (navigator as any).connection;
  return {
    effectiveType: connection?.effectiveType || 'unknown',
    saveData: connection?.saveData || false,
    downlink: connection?.downlink || null,
    rtt: connection?.rtt || null,
  };
};

/**
 * Detect if device is running low on battery
 */
export const isLowBattery = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return false;
  }

  try {
    const battery = await (navigator as any).getBattery();
    return battery.level < 0.2 && !battery.charging;
  } catch {
    return false;
  }
};

/**
 * Optimize image loading based on device and network conditions
 */
export const getOptimalImageQuality = (): 'low' | 'medium' | 'high' => {
  const isSlow = isSlowConnection();
  const isMobile = isMobileDevice();

  if (isSlow) return 'low';
  if (isMobile) return 'medium';
  return 'high';
};

/**
 * Preload critical images
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Lazy load images with Intersection Observer
 */
export const setupLazyImages = (selector: string = 'img[data-src]') => {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll(selector);

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;

          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach((img: any) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }
};

/**
 * Debounce function for optimizing frequent events (scroll, resize, etc.)
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for limiting execution frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Request idle callback polyfill for task scheduling
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

/**
 * Cancel idle callback polyfill
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

/**
 * Schedule low-priority work during idle time
 */
export const scheduleIdleWork = (callback: () => void) => {
  requestIdleCallback(() => {
    callback();
  });
};

/**
 * Get device memory (if available)
 */
export const getDeviceMemory = (): number | null => {
  if (typeof navigator === 'undefined' || !('deviceMemory' in navigator)) {
    return null;
  }
  return (navigator as any).deviceMemory;
};

/**
 * Check if device has enough memory for heavy operations
 */
export const hasEnoughMemory = (): boolean => {
  const memory = getDeviceMemory();
  if (memory === null) return true; // Assume yes if we can't detect
  return memory >= 4; // At least 4GB RAM
};

/**
 * Adaptive loading strategy based on device capabilities
 */
export const getLoadingStrategy = (): 'aggressive' | 'moderate' | 'conservative' => {
  const isSlow = isSlowConnection();
  const isLowMem = !hasEnoughMemory();
  const isMobile = isMobileDevice();

  if (isSlow || isLowMem) return 'conservative';
  if (isMobile) return 'moderate';
  return 'aggressive';
};

/**
 * Prefetch resources during idle time
 */
export const prefetchResources = (urls: string[]) => {
  if (isSlowConnection()) return; // Don't prefetch on slow connections

  scheduleIdleWork(() => {
    urls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  });
};

/**
 * Monitor performance metrics
 */
export const getPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  return {
    // Core Web Vitals approximations
    fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0,
    lcp: 0, // Would need PerformanceObserver for accurate LCP
    cls: 0, // Would need PerformanceObserver for accurate CLS
    fid: 0, // Would need PerformanceObserver for accurate FID

    // Navigation timing
    domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
    totalTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
  };
};

/**
 * Reduce motion for users with prefers-reduced-motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get optimal animation duration based on user preferences
 */
export const getAnimationDuration = (defaultMs: number): number => {
  return prefersReducedMotion() ? 0 : defaultMs;
};

/**
 * Clear caches to free up memory
 */
export const clearCaches = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
};

/**
 * Service Worker registration helper
 */
export const registerServiceWorker = async (scriptUrl: string) => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(scriptUrl);
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};
