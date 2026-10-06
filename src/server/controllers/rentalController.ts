/**
 * src/server/controllers/rentalController.ts: Kontroler do obsługi wypożyczeń
 */

import { rentalService } from '../services/rentalService.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';

export const rentalController = {
    /**
     * Pobiera aktywne wypożyczenia
     */
    async getActive(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await rentalService.getActive();
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Pobiera przeszłe wypożyczenia
     */
    async getPast(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await rentalService.getPast();
            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






