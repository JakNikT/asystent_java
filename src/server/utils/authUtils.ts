/**
 * src/server/utils/authUtils.ts: Narzędzia kryptograficzne dla uwierzytelniania personelu
 * Wykorzystuje wbudowany moduł node:crypto do generowania i weryfikacji tokenów sesyjnych oraz bezpiecznego porównywania PIN.
 */

import crypto from 'node:crypto';
import { config } from '../config/env.js';

export interface TokenPayload {
    role: string;
    exp: number;
}

export interface TokenVerificationResult {
    valid: boolean;
    payload?: TokenPayload;
    error?: string;
}

/**
 * Bezpieczne, odporne na timing attacks porównywanie kodu PIN
 */
export function verifyPin(inputPin: string, expectedPin: string = config.auth.employeePin): boolean {
    if (typeof inputPin !== 'string' || typeof expectedPin !== 'string') {
        return false;
    }

    const inputBuffer = Buffer.from(inputPin, 'utf8');
    const expectedBuffer = Buffer.from(expectedPin, 'utf8');

    if (inputBuffer.length !== expectedBuffer.length) {
        // Oblicz stałoczasowy dummy hash aby zapobiec wyciekowi czasu długości
        crypto.timingSafeEqual(inputBuffer, inputBuffer);
        return false;
    }

    return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

/**
 * Tworzy podpisany token HMAC-SHA256 dla sesji pracownika
 * Domyślny czas ważności: 12 godzin
 */
export function createSessionToken(
    role: string = 'employee',
    expiresInMs: number = 12 * 60 * 60 * 1000,
    secret: string = config.auth.secret
): string {
    const payload: TokenPayload = {
        role,
        exp: Date.now() + expiresInMs
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('base64url');

    return `${payloadBase64}.${signature}`;
}

/**
 * Weryfikuje integralność, podpis i ważność tokenu sesyjnego
 */
export function verifySessionToken(
    token: string,
    secret: string = config.auth.secret
): TokenVerificationResult {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Brak tokenu autoryzacji' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return { valid: false, error: 'Nieprawidłowy format tokenu' };
    }

    const [payloadBase64, signature] = parts;
    if (!payloadBase64 || !signature) {
        return { valid: false, error: 'Nieprawidłowy format tokenu' };
    }

    // Oblicz oczekiwaną sygnaturę
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadBase64)
        .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false, error: 'Nieprawidłowy podpis tokenu' };
    }

    try {
        const decodedString = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        const payload = JSON.parse(decodedString) as TokenPayload;

        if (!payload.exp || typeof payload.exp !== 'number') {
            return { valid: false, error: 'Nieprawidłowy payload tokenu' };
        }

        if (Date.now() > payload.exp) {
            return { valid: false, error: 'Token wygasł' };
        }

        return { valid: true, payload };
    } catch {
        return { valid: false, error: 'Błąd dekodowania payloadu' };
    }
}
