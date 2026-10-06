/**
 * src/test/authUtils.test.ts: Testy jednostkowe dla narzędzi autoryzacji
 */

import { describe, it, expect } from 'vitest';
import {
  verifyPin,
  createSessionToken,
  verifySessionToken
} from '../server/utils/authUtils';

describe('authUtils', () => {
  describe('verifyPin', () => {
    it('powinien poprawnie weryfikować zgodny kod PIN', () => {
      expect(verifyPin('1234', '1234')).toBe(true);
      expect(verifyPin('0000', '0000')).toBe(true);
    });

    it('powinien odrzucać niezgodny kod PIN o tej samej długości', () => {
      expect(verifyPin('1234', '5678')).toBe(false);
      expect(verifyPin('0001', '0000')).toBe(false);
    });

    it('powinien odrzucać kod PIN o różnej długości', () => {
      expect(verifyPin('123', '1234')).toBe(false);
      expect(verifyPin('12345', '1234')).toBe(false);
      expect(verifyPin('', '1234')).toBe(false);
    });

    it('powinien odrzucać nieprawidłowe typy wejściowe', () => {
      // @ts-expect-error testowanie odporności na niepoprawne typy
      expect(verifyPin(null, '1234')).toBe(false);
      // @ts-expect-error testowanie odporności na niepoprawne typy
      expect(verifyPin(undefined, '1234')).toBe(false);
    });
  });

  describe('createSessionToken & verifySessionToken', () => {
    const testSecret = 'super-bezpieczny-klucz-testowy-12345';

    it('powinien wygenerować token o poprawnym formacie payload.signature', () => {
      const token = createSessionToken('employee', 3600000, testSecret);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts.length).toBe(2);
    });

    it('powinien pomyślnie zweryfikować świeżo wygenerowany token', () => {
      const token = createSessionToken('employee', 3600000, testSecret);
      const result = verifySessionToken(token, testSecret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.role).toBe('employee');
      expect(result.payload?.exp).toBeGreaterThan(Date.now());
    });

    it('powinien odrzucić token ze sfałszowaną sygnaturą', () => {
      const token = createSessionToken('employee', 3600000, testSecret);
      const [payloadBase64] = token.split('.');
      const forgedToken = `${payloadBase64}.nieprawidlowa_sygnatura_hmac`;

      const result = verifySessionToken(forgedToken, testSecret);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nieprawidłowy podpis tokenu');
    });

    it('powinien odrzucić token podpisany innym kluczem sekretnym', () => {
      const token = createSessionToken('employee', 3600000, 'inny-sekret-1');
      const result = verifySessionToken(token, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Nieprawidłowy podpis tokenu');
    });

    it('powinien odrzucić wygasły token', () => {
      // Token wygasający w przeszłości (-10 sekund)
      const expiredToken = createSessionToken('employee', -10000, testSecret);
      const result = verifySessionToken(expiredToken, testSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token wygasł');
    });

    it('powinien odrzucić token o uszkodzonym formacie', () => {
      expect(verifySessionToken('', testSecret).valid).toBe(false);
      expect(verifySessionToken('sam-payload-bez-kropki', testSecret).valid).toBe(false);
      expect(verifySessionToken('a.b.c', testSecret).valid).toBe(false);
    });
  });
});
