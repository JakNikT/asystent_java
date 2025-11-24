import { rentalService } from '../services/rentalService.js';

export const rentalController = {
    async getActive(req, res) {
        try {
            const data = await rentalService.getActive();
            res.json(data);
        } catch (error) {
            console.error('Controller: Error fetching active rentals:', error);
            res.status(500).json({ error: 'Błąd pobierania wypożyczeń' });
        }
    },

    async getPast(req, res) {
        try {
            const data = await rentalService.getPast();
            res.json(data);
        } catch (error) {
            console.error('Controller: Error fetching past rentals:', error);
            res.status(500).json({ error: 'Błąd pobierania przeszłych wypożyczeń' });
        }
    }
};
