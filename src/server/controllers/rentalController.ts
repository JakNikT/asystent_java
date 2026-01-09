/**
 * src/server/controllers/rentalController.ts: Kontroler do obsługi wypożyczeń
 */

import { rentalService } from '../services/rentalService.js';
import logger from '../config/logger.js';
import type { AppRequest, AppResponse } from '../types/express.types.js';

export const rentalController = {
    /**
     * Pobiera aktywne wypożyczenia
     */
    async getActive(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            const data = await rentalService.getActive();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching active rentals', { error });
            res.status(500).json({ error: 'Błąd pobierania wypożyczeń' });
        }
    },

    /**
     * Pobiera przeszłe wypożyczenia
     */
    async getPast(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            const data = await rentalService.getPast();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching past rentals', { error });
            res.status(500).json({ error: 'Błąd pobierania przeszłych wypożyczeń' });
        }
    }
};






