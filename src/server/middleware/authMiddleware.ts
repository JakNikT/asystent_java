/**
 * src/server/middleware/authMiddleware.ts: Middleware autoryzacji personelu
 * Chroni wrażliwe endpointy (modyfikacja sprzętu, rezerwacje z danymi klientów)
 */

import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import { verifySessionToken } from '../utils/authUtils.js';
import logger from '../config/logger.js';

/**
 * Wymaga ważnego tokenu pracownika w nagłówku Authorization (Bearer token)
 */
export function requireEmployeeAuth(req: AppRequest, res: AppResponse, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        logger.warn('Próba nieautoryzowanego dostępu: brak nagłówka Authorization', {
            path: req.originalUrl,
            method: req.method,
            ip: req.ip
        });
        res.status(401).json({ error: 'Wymagana autoryzacja pracownika' });
        return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        logger.warn('Próba nieautoryzowanego dostępu: nieprawidłowy schemat autoryzacji', {
            path: req.originalUrl,
            method: req.method
        });
        res.status(401).json({ error: 'Wymagany format: Bearer <token>' });
        return;
    }

    const verification = verifySessionToken(token);
    if (!verification.valid || !verification.payload) {
        logger.warn('Próba nieautoryzowanego dostępu: nieprawidłowy lub wygasły token', {
            path: req.originalUrl,
            error: verification.error
        });
        res.status(401).json({ error: verification.error || 'Nieprawidłowy lub wygasły token autoryzacji' });
        return;
    }

    // Dołącz dane sesji do obiektu request
    (req as AppRequest & { user?: { role: string } }).user = {
        role: verification.payload.role
    };

    next();
}
