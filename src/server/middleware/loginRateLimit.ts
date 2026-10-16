/**
 * src/server/middleware/loginRateLimit.ts: Limit nieudanych prób logowania (per IP, w pamięci procesu)
 * Po MAX_FAILED nieudanych próbach adres IP jest blokowany do końca okna WINDOW_MS.
 */

import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failedLogins = new Map<string, { count: number; resetAt: number }>();

// Czyszczenie wygasłych wpisów
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of failedLogins) {
        if (entry.resetAt <= now) failedLogins.delete(ip);
    }
}, WINDOW_MS).unref();

export function loginRateLimit(req: AppRequest, res: AppResponse, next: NextFunction): void {
    const entry = failedLogins.get(req.ip ?? 'unknown');
    const now = Date.now();

    if (entry && entry.resetAt > now && entry.count >= MAX_FAILED) {
        res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        res.status(429).json({
            success: false,
            error: 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.'
        });
        return;
    }

    next();
}

export function recordFailedLogin(ip: string): void {
    const now = Date.now();
    const entry = failedLogins.get(ip);

    if (!entry || entry.resetAt <= now) {
        failedLogins.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return;
    }
    entry.count += 1;
}

export function clearFailedLogins(ip: string): void {
    failedLogins.delete(ip);
}
