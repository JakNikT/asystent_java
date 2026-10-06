/**
 * src/services/authService.ts: Klient autoryzacji personelu
 * Zarządza tokenem sesyjnym w sessionStorage i komunikacją z API autoryzacji
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('AuthService');
const TOKEN_KEY = 'employee_session_token';

export class AuthService {
  /**
   * Pobiera zapisany token sesyjny
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  }

  /**
   * Zapisuje token sesyjny
   */
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }

  /**
   * Usuwa token sesyjny
   */
  static removeToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  /**
   * Zwraca nagłówek Authorization: Bearer <token> jeśli użytkownik jest zalogowany
   */
  static getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Logowanie kodem PIN pracownika przez API backendu
   */
  static async login(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Wysyłanie zapytania logowania pracownika do API');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.token) {
        this.setToken(data.token);
        logger.info('Logowanie pracownika powiodło się');
        return { success: true };
      }

      logger.warn('Logowanie pracownika odrzucone przez serwer:', data.error);
      return {
        success: false,
        error: data.error || 'Nieprawidłowe hasło pracownika'
      };
    } catch (err) {
      logger.error('Błąd sieci podczas logowania:', err);
      return {
        success: false,
        error: 'Błąd połączenia z serwerem logowania'
      };
    }
  }

  /**
   * Wylogowanie pracownika
   */
  static async logout(): Promise<void> {
    try {
      const headers = this.getAuthHeaders();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers
      }).catch(() => {});
    } finally {
      this.removeToken();
      logger.info('Wylogowano pracownika i usunięto token');
    }
  }

  /**
   * Weryfikacja ważności sesji pracownika w tle
   */
  static async checkStatus(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/status', {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.removeToken();
        return false;
      }

      const data = await response.json();
      if (data.authenticated) {
        return true;
      }

      this.removeToken();
      return false;
    } catch {
      // W razie błędu sieci nie usuwamy natychmiast sesji (offline tolerance)
      return !!token;
    }
  }
}
