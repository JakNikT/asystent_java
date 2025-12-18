/**
 * src/server/controllers/fireSnowController.ts: Kontroler do obsługi FireSnow API
 */

import { fireSnowService } from '../services/fireSnowService.js';
import { config } from '../config/env.js';
import logger from '../config/logger.js';
import type { AppRequest, AppResponse } from '../types/express.types.js';

export const fireSnowController = {
    /**
     * Sprawdza status zdrowia FireSnow API
     */
    async checkHealth(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            const data = await fireSnowService.checkHealth();
            res.json({
                status: 'online',
                api_url: config.fireSnowApiUrl,
                api_response: data
            });
        } catch (error) {
            const err = error as Error;
            res.json({
                status: 'error',
                api_url: config.fireSnowApiUrl,
                error: err.message
            });
        }
    },

    /**
     * Odświeża cache FireSnow API
     */
    async refreshCache(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            const data = await fireSnowService.refreshCache();
            res.json({
                success: true,
                message: 'FireSnow API odświeżone',
                api_response: data
            });
        } catch (error) {
            const err = error as Error;
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    },

    /**
     * Pobiera dostępność sprzętu w danym okresie
     */
    async getAvailability(
        req: AppRequest<unknown, unknown, unknown, { from?: string; to?: string }>,
        res: AppResponse
    ): Promise<void> {
        const startTime = Date.now();
        try {
            const { from, to } = req.query;
            const data = await fireSnowService.getAvailability(from, to);

            const duration = Date.now() - startTime;
            logger.info(`Availability fetched in ${duration}ms`);

            res.json(data);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Error fetching availability (after ${duration}ms)`, { error });
            res.status(500).json({ error: 'Błąd pobierania dostępności' });
        }
    }
};



