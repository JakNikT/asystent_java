/**
 * src/server/controllers/equipmentController.ts: Kontroler do obsługi sprzętu narciarskiego
 */

import { equipmentService } from '../services/equipmentService.js';
import type { NextFunction } from 'express';
import type { AppRequest, AppResponse } from '../types/express.types.js';
import type { UpdateEquipmentData } from '../types/services.types.js';

export const equipmentController = {
    /**
     * Pobiera wszystkie urządzenia
     */
    async getAll(_req: AppRequest, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await equipmentService.getAll();
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Aktualizuje istniejący sprzęt
     */
    async update(req: AppRequest<{ id: string }, unknown, UpdateEquipmentData>, res: AppResponse, next: NextFunction): Promise<void> {
        try {
            const data = await equipmentService.update(req.params.id, req.body);
            if (!data) {
                res.status(404).json({ error: 'Narta nie znaleziona' });
                return;
            }
            res.json(data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Masowa aktualizacja wielu sprzętów
     */
    async bulkUpdate(
        req: AppRequest<unknown, unknown, { ids: string[]; updates: Partial<UpdateEquipmentData> }>,
        res: AppResponse,
        next: NextFunction
    ): Promise<void> {
        try {
            const { ids, updates } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'Brak tablicy ID do aktualizacji' });
                return;
            }

            const data = await equipmentService.bulkUpdate(ids, updates);
            if (data.length === 0) {
                res.status(404).json({ error: 'Nie znaleziono nart o podanych ID' });
                return;
            }

            res.json(data);
        } catch (error) {
            next(error);
        }
    }
};






