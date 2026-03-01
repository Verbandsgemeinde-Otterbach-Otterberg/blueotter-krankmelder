'use client';

import { useState } from 'react';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ 
  text, 
  children, 
  position = 'top',
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 flex-col-reverse',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 flex-col',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2 flex-row-reverse',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2 flex-row',
  };

  const arrowClasses = {
    top: 'top-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-8 border-transparent border-t-gray-900',
    bottom: 'bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-b-gray-900',
    left: 'left-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-8 border-transparent border-l-gray-900',
    right: 'right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-8 border-transparent border-r-gray-900',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-help inline-flex items-center justify-center"
      >
        {children || (
          <svg
            className="w-4 h-4 text-blue-600 hover:text-blue-800 transition"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {isVisible && (
        <div
          className={`absolute z-50 flex ${positionClasses[position]}`}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="bg-gray-900 text-white text-sm rounded py-2 px-3 whitespace-nowrap">
            {text}
            <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
}
