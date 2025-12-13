/**
 * Logger dla aplikacji frontendowej
 * Centralizuje logowanie i umożliwia kontrolę poziomów logowania w różnych środowiskach
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabledInProduction: boolean;
}

const config: LoggerConfig = {
  level: (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info',
  enabledInProduction: import.meta.env.VITE_ENABLE_LOGS === 'true',
};

const isProduction = import.meta.env.PROD;

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  // W produkcji loguj tylko jeśli włączone w konfiguracji
  if (isProduction && !config.enabledInProduction) {
    return level === 'error'; // W produkcji zawsze loguj błędy
  }
  
  // Sprawdź poziom logowania
  return levels[level] >= levels[config.level];
};

const formatMessage = (source: string, message: string): string => {
  const timestamp = new Date().toLocaleTimeString('pl-PL');
  return `[${timestamp}] ${source}: ${message}`;
};

class Logger {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(formatMessage(this.source, message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(formatMessage(this.source, message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage(this.source, message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(formatMessage(this.source, message), ...args);
    }
  }

  // Metoda pomocnicza do logowania z kontekstem
  logWithContext(level: LogLevel, context: string, message: string, ...args: unknown[]): void {
    const fullMessage = `[${context}] ${message}`;
    this[level](fullMessage, ...args);
  }
}

/**
 * Tworzy instancję loggera dla danego źródła
 * @param source - Nazwa źródła (np. nazwa pliku lub komponentu)
 * @returns Instancja loggera
 * 
 * @example
 * ```ts
 * const logger = createLogger('ReservationApiClient');
 * logger.info('Pobieranie rezerwacji z serwera...');
 * logger.error('Błąd pobierania danych:', error);
 * ```
 */
export const createLogger = (source: string): Logger => {
  return new Logger(source);
};

/**
 * Globalny logger dla szybkiego użycia
 */
export const logger = createLogger('App');

/**
 * Konfiguracja loggera
 * 
 * W pliku .env można ustawić:
 * - VITE_LOG_LEVEL=debug|info|warn|error (domyślnie: info)
 * - VITE_ENABLE_LOGS=true|false (czy logować w produkcji, domyślnie: false)
 */
export default logger;

