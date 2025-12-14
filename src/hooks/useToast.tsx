/**
 * src/hooks/useToast.tsx: Toast Manager - Context API i Hook
 * Centralizuje wyświetlanie powiadomień w aplikacji
 * 
 * Funkcjonalności:
 * - Context API dla globalnego stanu Toast
 * - Hook useToast() dostępny w każdym komponencie
 * - Singleton ToastService dostępny poza komponentami React (dla API clients)
 * - Kolejka powiadomień (maksymalnie 3 naraz)
 * - Auto-dismiss po 3-5 sekundach
 * - Debouncing dla identycznych komunikatów
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Toast } from '../components/Toast';
import { createLogger } from '../utils/logger';

const logger = createLogger('ToastManager');

/**
 * Singleton Toast Service - dostępny poza komponentami React
 * Używany przez API clients i inne serwisy
 */
class ToastService {
  private static instance: ToastService | null = null;
  private callbacks: {
    showSuccess?: (message: string) => void;
    showError?: (message: string) => void;
    showInfo?: (message: string) => void;
  } = {};

  private constructor() {}

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  /**
   * Rejestruje callbacki z ToastProvider
   * Wywoływane automatycznie przez ToastProvider
   */
  registerCallbacks(callbacks: {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showInfo: (message: string) => void;
  }): void {
    this.callbacks = callbacks;
  }

  showSuccess(message: string): void {
    if (this.callbacks.showSuccess) {
      this.callbacks.showSuccess(message);
    } else {
      // Fallback: loguj jeśli ToastProvider nie jest jeszcze zainicjalizowany
      logger.warn('ToastProvider nie jest jeszcze zainicjalizowany. Komunikat:', message);
    }
  }

  showError(message: string): void {
    if (this.callbacks.showError) {
      this.callbacks.showError(message);
    } else {
      logger.warn('ToastProvider nie jest jeszcze zainicjalizowany. Błąd:', message);
    }
  }

  showInfo(message: string): void {
    if (this.callbacks.showInfo) {
      this.callbacks.showInfo(message);
    } else {
      logger.warn('ToastProvider nie jest jeszcze zainicjalizowany. Info:', message);
    }
  }
}

/**
 * Eksport singleton dla użycia poza komponentami React
 * @example
 * ```ts
 * import { toastService } from '../hooks/useToast';
 * toastService.showError('Błąd pobierania danych');
 * ```
 */
export const toastService = ToastService.getInstance();

export type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook do używania Toast w komponentach
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError } = useToast();
 * 
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     showSuccess('Dane zostały zapisane');
 *   } catch (error) {
 *     showError('Nie udało się zapisać danych');
 *   }
 * };
 * ```
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number; // Maksymalna liczba Toastów naraz (domyślnie 3)
  autoDismissDelay?: number; // Czas auto-dismiss w ms (domyślnie 4000)
  debounceDelay?: number; // Czas debounce dla identycznych komunikatów w ms (domyślnie 1000)
}

/**
 * Provider dla Toast Context
 * Owinąć główną aplikację w ten komponent
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 3,
  autoDismissDelay = 4000,
  debounceDelay = 1000,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const activeToastRef = useRef<ToastItem | null>(null);
  const lastMessageRef = useRef<{ message: string; timestamp: number } | null>(null);
  
  // Synchronizuj ref z state
  useEffect(() => {
    activeToastRef.current = activeToast;
  }, [activeToast]);

  /**
   * Sprawdza czy komunikat jest duplikatem (w ciągu debounceDelay)
   */
  const isDuplicate = useCallback(
    (message: string): boolean => {
      if (!lastMessageRef.current) {
        return false;
      }

      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageRef.current.timestamp;

      if (
        lastMessageRef.current.message === message &&
        timeSinceLastMessage < debounceDelay
      ) {
        // src/hooks/useToast.ts: Ignorowanie duplikatu komunikatu
        logger.debug(`Ignorowanie duplikatu komunikatu: "${message}"`);
        return true;
      }

      return false;
    },
    [debounceDelay]
  );

  /**
   * Dodaje nowy Toast do kolejki
   */
  const addToast = useCallback(
    (message: string, type: ToastType): void => {
      // src/hooks/useToast.ts: Sprawdzanie duplikatów przed dodaniem Toast
      if (isDuplicate(message)) {
        return;
      }

      const newToast: ToastItem = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
      };

      // Aktualizuj referencję ostatniego komunikatu
      lastMessageRef.current = {
        message,
        timestamp: Date.now(),
      };

      setToasts((prev) => {
        // Jeśli kolejka jest pełna, usuń najstarszy Toast
        if (prev.length >= maxToasts) {
          // src/hooks/useToast.ts: Kolejka pełna, usuwanie najstarszego Toast
          const oldestToast = prev[0];
          logger.debug(`Kolejka Toast pełna (${maxToasts}), usuwanie najstarszego: ${oldestToast.id}`);
          
          // Jeśli usuwany toast jest aktywny, wyczyść activeToast natychmiast
          if (activeToastRef.current && activeToastRef.current.id === oldestToast.id) {
            logger.debug(`Usuwany toast (${oldestToast.id}) jest aktywny, czyszczenie activeToast`);
            setActiveToast(null);
          }
          
          return [...prev.slice(1), newToast];
        }
        return [...prev, newToast];
      });

      // src/hooks/useToast.ts: Dodano nowy Toast
      logger.debug(`Dodano Toast: ${type} - "${message}"`);
    },
    [maxToasts, isDuplicate]
  );

  /**
   * Usuwa Toast z kolejki i pokazuje następny
   */
  const removeToast = useCallback((id: string): void => {
    // src/hooks/useToast.ts: Usuwanie Toast z kolejki
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    setActiveToast(null);
    activeToastRef.current = null;
  }, []);

  /**
   * Sprawdza czy activeToast jest nadal w kolejce
   * Jeśli nie, wyczyść go aby umożliwić pokazanie następnego
   */
  useEffect(() => {
    if (activeToast) {
      const isStillInQueue = toasts.some((toast) => toast.id === activeToast.id);
      if (!isStillInQueue) {
        // src/hooks/useToast.ts: activeToast został usunięty z kolejki (np. przez maxToasts), czyszczenie
        logger.debug(`activeToast (${activeToast.id}) nie jest już w kolejce, czyszczenie`);
        setActiveToast(null);
      }
    }
  }, [toasts, activeToast]);

  /**
   * Pokazuje następny Toast z kolejki
   */
  useEffect(() => {
    if (toasts.length > 0 && !activeToast) {
      // src/hooks/useToast.ts: Pokazywanie następnego Toast z kolejki
      const nextToast = toasts[0];
      setActiveToast(nextToast);
      activeToastRef.current = nextToast;
      logger.debug(`Pokazywanie Toast: ${nextToast.type} - "${nextToast.message}"`);
    }
  }, [toasts, activeToast]);

  /**
   * Auto-dismiss dla aktywnego Toast
   */
  useEffect(() => {
    if (activeToast) {
      // src/hooks/useToast.ts: Ustawienie auto-dismiss dla Toast
      const timer = setTimeout(() => {
        logger.debug(`Auto-dismiss Toast: ${activeToast.id}`);
        removeToast(activeToast.id);
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [activeToast, autoDismissDelay, removeToast]);

  /**
   * Funkcje do wyświetlania Toast
   */
  const showSuccess = useCallback(
    (message: string): void => {
      addToast(message, 'success');
    },
    [addToast]
  );

  const showError = useCallback(
    (message: string): void => {
      addToast(message, 'error');
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string): void => {
      addToast(message, 'info');
    },
    [addToast]
  );

  const contextValue: ToastContextType = {
    showSuccess,
    showError,
    showInfo,
  };

  // Rejestruj callbacki w singleton service (dla użycia poza React)
  useEffect(() => {
    toastService.registerCallbacks({
      showSuccess,
      showError,
      showInfo,
    });
  }, [showSuccess, showError, showInfo]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {activeToast && (
        <Toast
          message={activeToast.message}
          type={activeToast.type}
          isVisible={true}
          onClose={() => removeToast(activeToast.id)}
        />
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
