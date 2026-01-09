/**
 * src/server/controllers/historyController.ts: Kontroler do obsługi historii klientów
 */

import { historyService } from '../services/historyService.js';
import logger from '../config/logger.js';
import type { AppRequest, AppResponse } from '../types/express.types.js';

export const historyController = {
    /**
     * Wyszukuje klientów po nazwisku
     */
    async searchClients(
        req: AppRequest<unknown, unknown, unknown, { nazwisko?: string }>,
        res: AppResponse
    ): Promise<void> {
        try {
            const data = await historyService.searchClients(req.query.nazwisko || '');
            res.json(data);
        } catch (error) {
            logger.error('Error searching clients', { error });
            res.status(500).json({ error: 'Błąd wyszukiwania klientów' });
        }
    },

    /**
     * Pobiera daty dla danego klienta
     */
    async getClientDates(req: AppRequest<{ id: string }>, res: AppResponse): Promise<void> {
        try {
            const clientId = parseInt(req.params.id);
            if (isNaN(clientId)) {
                res.status(400).json({ error: 'Nieprawidłowe ID klienta' });
                return;
            }

            const data = await historyService.getClientDates(clientId);
            res.json(data);
        } catch (error) {
            logger.error('Error fetching client dates', { error });
            res.status(500).json({ error: 'Błąd pobierania dat klienta' });
        }
    },

    /**
     * Pobiera sprzęt dla danego klienta w określonym okresie
     */
    async getClientEquipment(
        req: AppRequest<{ id: string }, unknown, unknown, { od?: string; do?: string; sezon?: string }>,
        res: AppResponse
    ): Promise<void> {
        try {
            const clientId = parseInt(req.params.id);
            if (isNaN(clientId)) {
                res.status(400).json({ error: 'Nieprawidłowe ID klienta' });
                return;
            }

            const { od, do: doDate, sezon } = req.query;
            if (!od || !doDate) {
                res.status(400).json({ error: 'Brakuje parametrów od lub do' });
                return;
            }

            const data = await historyService.getClientEquipment(clientId, od, doDate, sezon);
            res.json(data);
        } catch (error) {
            logger.error('Error fetching client equipment', { error });
            res.status(500).json({ error: 'Błąd pobierania sprzętu klienta' });
        }
    }
};






