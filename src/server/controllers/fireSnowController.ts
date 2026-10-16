/**
 * src/server/controllers/fireSnowController.ts: Kontroler do obsługi FireSnow API
 */

import { fireSnowService } from '../services/fireSnowService.js';
import logger from '../config/logger.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';

export const fireSnowController = {
    /**
     * Sprawdza status zdrowia FireSnow API
     */
    async checkHealth(_req: AppRequest, res: AppResponse): Promise<void> {
        try {
            await fireSnowService.checkHealth();
            res.json({ status: 'online' });
        } catch (error) {
            logger.warn('FireSnow health check failed', { error: (error as Error).message });
            res.json({ status: 'error' });
        }
    },

    /**
     * Odświeża cache FireSnow API
     */
    async refreshCache(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await fireSnowService.refreshCache();
            res.json({
                success: true,
                message: 'FireSnow API odświeżone',
                api_response: data
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Pobiera dostępność sprzętu w danym okresie
     */
    async getAvailability(
        req: AppRequest<unknown, unknown, unknown, { from?: string; to?: string }>,
        res: AppResponse,
        next: NextFunction
    ): Promise<void> {
        const startTime = Date.now();
        try {
            const { from, to } = req.query;
            const data = await fireSnowService.getAvailability(from, to);

            const duration = Date.now() - startTime;
            logger.info(`Availability fetched in ${duration}ms`);

            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






