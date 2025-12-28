import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Undo2
} from 'lucide-react';

// ==================== Types ====================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ==================== Context ====================

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// ==================== Provider ====================

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? getDefaultDuration(toast.type),
    };

    setToasts((prev) => {
      const updated = [newToast, ...prev];
      // Limit max toasts
      return updated.slice(0, maxToasts);
    });

    // Auto-dismiss (except for errors which require manual dismissal)
    if (toast.type !== 'error' && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <NotificationContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Container */}
      <div
        className={cn(
          'fixed z-[100] flex flex-col gap-2 pointer-events-none',
          positionClasses[position],
          position.includes('bottom') && 'flex-col-reverse'
        )}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastComponent
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

// ==================== Toast Component ====================

interface ToastComponentProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onDismiss }) => {
  const config = getToastConfig(toast.type);
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="pointer-events-auto"
    >
      <div className={cn(
        'flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-sm max-w-sm',
        'bg-slate-900/95 border-slate-700/50'
      )}>
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-slate-400 mt-0.5">{toast.message}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                config.actionColor,
                'hover:underline'
              )}
            >
              <Undo2 className="w-3 h-3" />
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ==================== Helpers ====================

function getDefaultDuration(type: ToastType): number {
  switch (type) {
    case 'success':
      return 3000;
    case 'error':
      return 0; // Requires manual dismissal
    case 'warning':
      return 5000;
    case 'info':
      return 5000;
    default:
      return 5000;
  }
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        iconColor: 'text-emerald-400',
        actionColor: 'text-emerald-400',
      };
    case 'error':
      return {
        icon: XCircle,
        iconColor: 'text-red-400',
        actionColor: 'text-red-400',
      };
    case 'warning':
      return {
        icon: AlertCircle,
        iconColor: 'text-yellow-400',
        actionColor: 'text-yellow-400',
      };
    case 'info':
      return {
        icon: Info,
        iconColor: 'text-blue-400',
        actionColor: 'text-blue-400',
      };
  }
}

// ==================== Hook for easy toast creation ====================

export const useToast = () => {
  const { addToast, removeToast, success, error, warning, info } = useNotifications();

  return {
    toast: addToast,
    dismiss: removeToast,
    success,
    error,
    warning,
    info,
    // Convenience method for action toasts
    withUndo: (title: string, onUndo: () => void, type: ToastType = 'success') => {
      return addToast({
        type,
        title,
        action: {
          label: 'Undo',
          onClick: onUndo,
        },
      });
    },
  };
};

export default {
  NotificationProvider,
  useNotifications,
  useToast,
};
