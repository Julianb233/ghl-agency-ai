
import React from 'react';

interface GlassPaneProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  headerAction?: React.ReactNode;
}

export const GlassPane: React.FC<GlassPaneProps> = ({ children, className = '', title, headerAction }) => {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md ${className}`}>
      {(title || headerAction) && (
        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          {title && (
            <h3 className="text-sm font-bold tracking-wide text-emerald-700 uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></span>
              {title}
            </h3>
          )}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
};
