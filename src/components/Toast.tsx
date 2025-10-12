import React, { useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'error';
  isVisible: boolean;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-hide po 3 sekundach

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600'
  }[type];

  const icon = {
    info: '🔄',
    success: '✅',
    error: '❌'
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[500px]`}>
        <span className="text-2xl">{icon}</span>
        <span className="font-medium flex-1">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold ml-2"
            aria-label="Zamknij"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

