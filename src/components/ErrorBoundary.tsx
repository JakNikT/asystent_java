/**
 * src/components/ErrorBoundary.tsx: React Error Boundary
 * Przechwytuje błędy renderowania w drzewie komponentów React
 * i wyświetla przyjazny komunikat błędu zamiast crashować aplikację
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary - komponent React do obsługi błędów renderowania
 * 
 * Przechwytuje błędy w:
 * - Renderowaniu komponentów
 * - Metodach lifecycle
 * - Konstruktorach całego drzewa komponentów
 * 
 * NIE przechwytuje błędów w:
 * - Event handlerach (użyj try/catch)
 * - Asynchronicznym kodzie (użyj try/catch)
 * - Server-side rendering
 * - Błędach w samym Error Boundary
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Metoda lifecycle wywoływana gdy błąd zostanie przechwycony
   * Aktualizuje stan, aby wyświetlić UI błędu
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    // src/components/ErrorBoundary.tsx: Aktualizacja stanu po przechwyceniu błędu
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Metoda lifecycle wywoływana po przechwyceniu błędu
   * Używana do logowania błędów
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // src/components/ErrorBoundary.tsx: Logowanie szczegółów błędu
    logger.error('Error Boundary przechwycił błąd:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // TODO: W przyszłości można tutaj dodać integrację z zewnętrznym serwisem
    // np. Sentry, LogRocket, etc.
    // if (process.env.NODE_ENV === 'production') {
    //   errorReportingService.captureException(error, { extra: errorInfo });
    // }
  }

  /**
   * Resetuje stan błędu, pozwalając użytkownikowi spróbować ponownie
   */
  handleReset = (): void => {
    // src/components/ErrorBoundary.tsx: Resetowanie stanu błędu
    logger.info('Użytkownik kliknął "Spróbuj ponownie"');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Przeładowuje całą aplikację
   */
  handleReload = (): void => {
    // src/components/ErrorBoundary.tsx: Przeładowanie aplikacji
    logger.info('Użytkownik kliknął "Wróć do strony głównej"');
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Jeśli podano custom fallback, użyj go
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Domyślny UI błędu
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-white/20">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Wystąpił nieoczekiwany błąd
              </h1>
              <p className="text-white/80 text-lg">
                Przepraszamy za utrudnienia. Aplikacja napotkała problem, którego nie mogła rozwiązać.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/20 rounded-lg p-4 mb-6 border border-white/10">
                <p className="text-red-300 font-mono text-sm break-words">
                  {this.state.error.toString()}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error.stack && (
                  <details className="mt-4">
                    <summary className="text-white/60 text-sm cursor-pointer hover:text-white/80">
                      Szczegóły techniczne (tylko w trybie development)
                    </summary>
                    <pre className="mt-2 text-xs text-white/70 font-mono overflow-auto max-h-48 bg-black/30 p-3 rounded">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 text-xs text-white/70 font-mono overflow-auto max-h-48 bg-black/30 p-3 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
              >
                🔄 Spróbuj ponownie
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
              >
                🏠 Wróć do strony głównej
              </button>
            </div>

            <div className="mt-6 text-center text-white/60 text-sm">
              <p>
                Jeśli problem się powtarza, skontaktuj się z administratorem systemu.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Jeśli nie ma błędu, renderuj dzieci normalnie
    return this.props.children;
  }
}

export default ErrorBoundary;
