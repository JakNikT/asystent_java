/**
 * src/utils/apiErrorHandler.ts: Centralized API Error Handler
 * 
 * Parses backend JSON error responses and extracts user-friendly error messages.
 * The backend's global error handler returns errors in this format:
 * {
 *   "success": false,
 *   "error": {
 *     "message": "User-friendly error message",
 *     "code": "ERROR_CODE",
 *     "details": { ... }
 *   }
 * }
 * 
 * This utility extracts the error.message field for display to users.
 */

/**
 * Parses an API error response and extracts the user-friendly error message.
 * 
 * @param response - The fetch Response object (must have !response.ok)
 * @returns Promise<string> - The error message from backend, or fallback message
 * 
 * @example
 * ```typescript
 * if (!response.ok) {
 *   const errorMessage = await parseApiError(response);
 *   throw new Error(errorMessage);
 * }
 * ```
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    // Try to parse JSON response
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      
      // Backend error format: { success: false, error: { message: "...", code: "..." } }
      if (errorData?.error?.message) {
        return errorData.error.message;
      }
      
      // Fallback: check for direct error.message (some endpoints might use this)
      if (errorData?.message) {
        return errorData.message;
      }
      
      // Fallback: check for error field (legacy format)
      if (typeof errorData?.error === 'string') {
        return errorData.error;
      }
    }
    
    // If not JSON or parsing failed, return status-based message
    return getStatusBasedMessage(response.status);
  } catch (parseError) {
    // If JSON parsing fails (malformed response), return status-based message
    return getStatusBasedMessage(response.status);
  }
}

/**
 * Returns a user-friendly error message based on HTTP status code.
 * Used as fallback when JSON parsing fails or response doesn't contain error details.
 * 
 * @param status - HTTP status code
 * @returns User-friendly error message in Polish
 */
function getStatusBasedMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Nieprawidłowe dane wejściowe';
    case 401:
      return 'Brak autoryzacji. Zaloguj się ponownie';
    case 403:
      return 'Brak uprawnień do wykonania tej operacji';
    case 404:
      return 'Nie znaleziono żądanego zasobu';
    case 409:
      return 'Konflikt danych. Sprawdź czy dane nie są już używane';
    case 422:
      return 'Błąd walidacji danych';
    case 500:
      return 'Błąd serwera. Spróbuj ponownie za chwilę';
    case 503:
      return 'Usługa tymczasowo niedostępna. Spróbuj ponownie za chwilę';
    default:
      return `Błąd połączenia (status: ${status})`;
  }
}

/**
 * Handles any error (from catch blocks) and extracts a user-friendly message.
 * Works with both Error objects and unknown error types.
 * 
 * @param error - The error caught in catch block (can be Error, unknown, etc.)
 * @param fallbackMessage - Default message if error doesn't contain useful info
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * catch (error) {
 *   logger.error('Błąd:', error);
 *   const errorMessage = handleApiError(error, 'Nie udało się utworzyć rezerwacji');
 *   toastService.showError(errorMessage);
 * }
 * ```
 */
/**
 * Checks if an error message contains technical error patterns that should not be shown to users.
 */
function isTechnicalError(message: string): boolean {
  const technicalPatterns = [
    // JavaScript error types
    /TypeError|ReferenceError|SyntaxError|RangeError|URIError/i,
    // Stack trace indicators
    /at\s+\w+\.\w+|at\s+<anonymous>|at\s+Object\.<anonymous>/,
    // File paths and line numbers
    /\.(js|ts|tsx|jsx):\d+:\d+/,
    // Technical property access errors
    /Cannot\s+read\s+property|Cannot\s+read\s+properties|Cannot\s+set\s+property/i,
    // Undefined/null technical errors
    /\bundefined\b.*\bis\s+not|is\s+not.*\bundefined\b/i,
    // Function call errors
    /\w+\s+is\s+not\s+a\s+function/i,
    // Network technical errors (not user-friendly)
    /Failed\s+to\s+fetch|Network\s+request\s+failed|ECONNREFUSED|ETIMEDOUT/i,
    // Generic error prefixes that indicate technical errors
    /^Error:\s*[A-Z]/,
  ];
  
  return technicalPatterns.some(pattern => pattern.test(message));
}

export function handleApiError(error: unknown, fallbackMessage: string): string {
  // If it's an Error object with a message, check if it's user-friendly
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // If the error message is a generic HTTP error, return fallback
    if (errorMessage.startsWith('HTTP error! status:')) {
      return fallbackMessage;
    }
    
    // If the error message contains technical error patterns, use fallback
    if (isTechnicalError(errorMessage)) {
      return fallbackMessage;
    }
    
    // Only trust messages that are clearly user-friendly (from parseApiError)
    // These are typically in Polish and don't contain technical patterns
    // If we're uncertain, default to fallback for safety
    if (errorMessage && errorMessage.trim().length > 0) {
      // Trust messages that are likely from parseApiError (Polish user-friendly messages)
      // or short, simple messages that don't look technical
      const isLikelyUserFriendly = 
        errorMessage.length < 200 && // Not too long (stack traces are long)
        !isTechnicalError(errorMessage); // Already checked above, but double-check
      
      if (isLikelyUserFriendly) {
        return errorMessage;
      }
    }
  }
  
  // For unknown error types, technical errors, or uncertain cases, return fallback
  return fallbackMessage;
}
