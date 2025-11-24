import { rentalService } from '../services/rentalService.js';
import logger from '../config/logger.js';

export const rentalController = {
    async getActive(req, res) {
        try {
            const data = await rentalService.getActive();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching active rentals', { error });
            res.status(500).json({ error: 'Błąd pobierania wypożyczeń' });
        }
    },

    async getPast(req, res) {
        try {
            const data = await rentalService.getPast();
            res.json(data);
        } catch (error) {
            logger.error('Error fetching past rentals', { error });
            res.status(500).json({ error: 'Błąd pobierania przeszłych wypożyczeń' });
        }
    }
};
