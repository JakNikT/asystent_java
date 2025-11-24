import { reservationService } from '../services/reservationService.js';
import logger from '../config/logger.js';

export const reservationController = {
    async getAll(req, res) {
        try {
            const data = await reservationService.getAll();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching reservations', { error });
            res.status(500).json({ error: 'Błąd pobierania rezerwacji' });
        }
    },

    async create(req, res) {
        try {
            const data = await reservationService.create(req.body);
            res.json(data);
        } catch (error) {
            logger.error('Error creating reservation', { error });
            res.status(500).json({ error: 'Błąd dodawania rezerwacji' });
        }
    },

    async update(req, res) {
        try {
            const data = await reservationService.update(req.params.id, req.body);
            if (!data) return res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
            res.json(data);
        } catch (error) {
            logger.error('Error updating reservation', { error });
            res.status(500).json({ error: 'Błąd aktualizacji rezerwacji' });
        }
    },

    async delete(req, res) {
        try {
            const data = await reservationService.delete(req.params.id);
            if (!data) return res.status(404).json({ error: 'Rezerwacja nie znaleziona' });
            res.json(data);
        } catch (error) {
            logger.error('Error deleting reservation', { error });
            res.status(500).json({ error: 'Błąd usuwania rezerwacji' });
        }
    }
};
