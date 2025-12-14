/**
 * src/server/controllers/reservationController.ts: Kontroler do obsługi rezerwacji
 */

import { reservationService } from '../services/reservationService.js';
import logger from '../config/logger.js';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import type { CreateReservationData, UpdateReservationData } from '../types/services.types.js';

export const reservationController = {
    /**
     * Pobiera wszystkie rezerwacje
     */
    async getAll(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            const data = await reservationService.getAll();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching reservations', { error });
            res.status(500).json({ error: 'Błąd pobierania rezerwacji' });
        }
    },

    /**
     * Tworzy nową rezerwację
     */
    async create(req: AppRequest<unknown, unknown, CreateReservationData>, res: AppResponse): Promise<void> {
        try {
            const data = await reservationService.create(req.body);
            res.json(data);
        } catch (error) {
            logger.error('Error creating reservation', { error });
            res.status(500).json({ error: 'Błąd dodawania rezerwacji' });
        }
    },

    /**
     * Aktualizuje istniejącą rezerwację
     */
    async update(req: AppRequest<{ id: string }, unknown, UpdateReservationData>, res: AppResponse): Promise<void> {
        try {
            const data = await reservationService.update(req.params.id, req.body);
            if (!data) {
                res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            logger.error('Error updating reservation', { error });
            res.status(500).json({ error: 'Błąd aktualizacji rezerwacji' });
        }
    },

    /**
     * Usuwa rezerwację
     */
    async delete(req: AppRequest<{ id: string }>, res: AppResponse): Promise<void> {
        try {
            const data = await reservationService.delete(req.params.id);
            if (!data) {
                res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            logger.error('Error deleting reservation', { error });
            res.status(500).json({ error: 'Błąd usuwania rezerwacji' });
        }
    }
};
