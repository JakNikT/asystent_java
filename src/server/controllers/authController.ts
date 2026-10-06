/**
 * src/server/controllers/authController.ts: Kontroler uwierzytelniania pracownika
 * Obsługuje logowanie kodem PIN, sprawdzanie statusu sesji i wylogowanie
 */

import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import { verifyPin, createSessionToken, verifySessionToken } from '../utils/authUtils.js';
import logger from '../config/logger.js';

interface LoginBody {
    password?: string;
    pin?: string;
}

export const authController = {
    /**
     * Weryfikuje PIN pracownika i wydaje podpisany token sesyjny
     * POST /api/auth/login
     */
    async login(
        req: AppRequest<unknown, unknown, LoginBody>,
        res: AppResponse,
        next: NextFunction
    ): Promise<void> {
        try {
            const inputPin = req.body.password || req.body.pin || '';

            if (!inputPin) {
                res.status(400).json({ success: false, error: 'Wymagane jest podanie hasła lub kodu PIN' });
                return;
            }

            const isValid = verifyPin(inputPin);

            if (!isValid) {
                logger.warn('Nieudana próba logowania pracownika (błędne hasło)', {
                    ip: req.ip
                });
                res.status(401).json({ success: false, error: 'Nieprawidłowe hasło pracownika' });
                return;
            }

            const token = createSessionToken('employee');
            logger.info('Pomyślne logowanie pracownika', { ip: req.ip });

            res.json({
                success: true,
                token,
                role: 'employee',
                expiresIn: 12 * 60 * 60 // 12 godzin w sekundach
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Wylogowanie pracownika
     * POST /api/auth/logout
     */
    async logout(_req: AppRequest, res: AppResponse): Promise<void> {
        res.json({
            success: true,
            message: 'Wylogowano pomyślnie'
        });
    },

    /**
     * Sprawdzenie ważności bieżącego tokenu pracownika
     * GET /api/auth/status
     */
    async status(req: AppRequest, res: AppResponse): Promise<void> {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.json({ authenticated: false });
            return;
        }

        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            res.json({ authenticated: false });
            return;
        }

        const verification = verifySessionToken(token);
        if (verification.valid && verification.payload) {
            res.json({
                authenticated: true,
                role: verification.payload.role
            });
        } else {
            res.json({
                authenticated: false,
                reason: verification.error
            });
        }
    }
};
