/**
 * src/server/controllers/reservationController.ts: Kontroler do obsługi rezerwacji
 */

import { reservationService } from '../services/reservationService.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import type { CreateReservationData, UpdateReservationData } from '../types/services.types.js';

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
    },

    /**
     * Tworzy nową rezerwację
     */
    async create(req: AppRequest<unknown, unknown, CreateReservationData>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await reservationService.create(req.body);
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Aktualizuje istniejącą rezerwację
     */
    async update(req: AppRequest<{ id: string }, unknown, UpdateReservationData>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await reservationService.update(req.params.id, req.body);
            if (!data) {
                res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Usuwa rezerwację
     */
    async delete(req: AppRequest<{ id: string }>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await reservationService.delete(req.params.id);
            if (!data) {
                res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






