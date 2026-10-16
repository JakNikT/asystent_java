/**
 * src/server/controllers/reservationController.ts: Kontroler do obsługi rezerwacji
 */

import { reservationService } from '../services/reservationService.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';

interface DateQueryParams {
    date?: string;
}

export const reservationController = {
    /**
     * Pobiera rezerwacje dla konkretnej daty
     * GET /api/reservations/date?date=YYYY-MM-DD
     */
    async getForDate(req: AppRequest<unknown, unknown, unknown, DateQueryParams>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const date = req.query.date;

            if (!date) {
                res.status(400).json({ error: 'Brak wymaganego parametru: date (format: YYYY-MM-DD)' });
                return;
            }

            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                res.status(400).json({ error: 'Nieprawidłowy format daty. Użyj: YYYY-MM-DD' });
                return;
            }

            const data = await reservationService.getForDate(date);
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Pobiera wszystkie rezerwacje
     */
    async getAll(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await reservationService.getAll();
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






