/**
 * src/server/middleware/errorHandler.js: Global Error Handler Middleware
 * Standaryzuje obsługę błędów w API i zwraca spójne formaty odpowiedzi
 * 
 * Funkcjonalności:
 * - Przechwytuje wszystkie błędy z Express routes
 * - Loguje błędy z użyciem loggera
 * - Zwraca standaryzowany format odpowiedzi
 * - Obsługuje różne typy błędów (walidacja, baza danych, API, etc.)
 */

import logger from '../config/logger.js';

/**
 * Kody błędów dla różnych typów problemów
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};

/**
 * Mapuje kod statusu HTTP na kod błędu aplikacji
 */
const getErrorCode = (statusCode) => {
  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 401) return ERROR_CODES.AUTHENTICATION_ERROR;
    if (statusCode === 403) return ERROR_CODES.AUTHORIZATION_ERROR;
    if (statusCode === 404) return ERROR_CODES.NOT_FOUND;
    if (statusCode === 400) return ERROR_CODES.VALIDATION_ERROR;
  }
  if (statusCode >= 500) {
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
  return ERROR_CODES.INTERNAL_SERVER_ERROR;
};

/**
 * Tworzy przyjazny komunikat błędu dla użytkownika
 */
const getUserFriendlyMessage = (error, statusCode) => {
  // Jeśli błąd ma już przyjazny komunikat, użyj go
  if (error.userMessage) {
    return error.userMessage;
  }

  // Jeśli błąd ma message, użyj go (ale sprawdź czy nie jest zbyt techniczny)
  if (error.message && !error.message.includes('Error:') && !error.message.includes('at ')) {
    return error.message;
  }

  // Domyślne komunikaty w zależności od typu błędu
  switch (statusCode) {
    case 400:
      return 'Nieprawidłowe dane wejściowe';
    case 401:
      return 'Brak autoryzacji. Zaloguj się ponownie';
    case 403:
      return 'Brak uprawnień do wykonania tej operacji';
    case 404:
      return 'Nie znaleziono żądanego zasobu';
    case 503:
      return 'Usługa tymczasowo niedostępna. Spróbuj ponownie za chwilę';
    default:
      return 'Wystąpił błąd podczas przetwarzania żądania';
  }
};

/**
 * Sprawdza czy błąd jest związany z bazą danych
 */
const isDatabaseError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('database') ||
    errorMessage.includes('sql') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorCode.includes('sql') ||
    errorCode.includes('db')
  );
};

/**
 * Sprawdza czy błąd jest związany z zewnętrznym API (np. FireSnow)
 */
const isExternalApiError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  return (
    errorMessage.includes('firesnow') ||
    errorMessage.includes('external api') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout')
  );
};

/**
 * Sprawdza czy błąd jest błędem walidacji
 */
const isValidationError = (error) => {
  if (!error) return false;
  
  return (
    error.name === 'ValidationError' ||
    error.name === 'CastError' ||
    error.message?.toLowerCase().includes('validation') ||
    error.message?.toLowerCase().includes('invalid')
  );
};

/**
 * Global Error Handler Middleware
 * 
 * Użycie w Express:
 * ```javascript
 * import errorHandler from './middleware/errorHandler.js';
 * 
 * // ... routes ...
 * 
 * // Error handler musi być ostatnim middleware
 * app.use(errorHandler);
 * ```
 * 
 * W kontrolerach, przekaż błąd do next():
 * ```javascript
 * try {
 *   // kod
 * } catch (error) {
 *   next(error); // Przekaż błąd do error handlera
 * }
 * ```
 */
const errorHandler = (err, req, res, next) => {
  // src/server/middleware/errorHandler.js: Przechwycono błąd w error handler middleware
  
  // Jeśli odpowiedź została już wysłana, deleguj do domyślnego Express error handlera
  if (res.headersSent) {
    // src/server/middleware/errorHandler.js: Odpowiedź już wysłana, delegowanie do domyślnego handlera
    return next(err);
  }

  // Określ kod statusu HTTP
  const statusCode = err.statusCode || err.status || 500;

  // Określ typ błędu i kod błędu aplikacji
  let errorCode = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  
  if (isDatabaseError(err)) {
    errorCode = ERROR_CODES.DATABASE_ERROR;
  } else if (isExternalApiError(err)) {
    errorCode = ERROR_CODES.EXTERNAL_API_ERROR;
  } else if (isValidationError(err)) {
    errorCode = ERROR_CODES.VALIDATION_ERROR;
  } else if (statusCode === 401) {
    errorCode = ERROR_CODES.AUTHENTICATION_ERROR;
  } else if (statusCode === 403) {
    errorCode = ERROR_CODES.AUTHORIZATION_ERROR;
  } else if (statusCode === 404) {
    errorCode = ERROR_CODES.NOT_FOUND;
  } else {
    errorCode = getErrorCode(statusCode);
  }

  // Przyjazny komunikat dla użytkownika
  const userMessage = getUserFriendlyMessage(err, statusCode);

  // Szczegóły błędu (tylko w development)
  const details = process.env.NODE_ENV === 'development' ? {
    message: err.message,
    stack: err.stack,
    name: err.name,
    ...(err.details && { details: err.details }),
  } : undefined;

  // Logowanie błędu
  const logContext = {
    method: req.method,
    url: req.url,
    statusCode,
    errorCode,
    error: err.message,
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params,
  };

  // src/server/middleware/errorHandler.js: Logowanie błędu z kontekstem
  if (statusCode >= 500) {
    logger.error(`API Error: ${req.method} ${req.url}`, logContext);
  } else {
    logger.warn(`API Warning: ${req.method} ${req.url}`, logContext);
  }

  // Standaryzowany format odpowiedzi
  const errorResponse = {
    success: false,
    error: {
      message: userMessage,
      code: errorCode,
      ...(details && { details }),
    },
  };

  // Zwróć odpowiedź
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
