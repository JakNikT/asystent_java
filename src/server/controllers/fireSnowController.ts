/**
 * src/server/controllers/fireSnowController.ts: Kontroler do obsługi FireSnow API
 */

import { fireSnowService } from '../services/fireSnowService.js';
import logger from '../config/logger.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';

/** Pola identyfikujące klienta lub zawierające swobodny tekst o kliencie */
const CLIENT_FIELDS = ['klient', 'klient_id', 'klient_nazwisko', 'uwagi'] as const;

/**
 * Zwraca kopię odpowiedzi dostępności bez pól klienta w rezerwacjach i wypożyczeniach
 */
function withoutClientData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data;
    const strip = (items: unknown): unknown =>
        Array.isArray(items)
            ? items.map((item: unknown) => {
                if (typeof item !== 'object' || item === null) return item;
                const copy = { ...(item as Record<string, unknown>) };
                for (const field of CLIENT_FIELDS) delete copy[field];
                return copy;
            })
            : items;
    const payload = data as { reservations?: unknown; rentals?: unknown };
    return { ...payload, reservations: strip(payload.reservations), rentals: strip(payload.rentals) };
}

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

            res.json(req.isEmployee ? data : withoutClientData(data));
        } catch (error) {
            next(error);
        }
    }
};






