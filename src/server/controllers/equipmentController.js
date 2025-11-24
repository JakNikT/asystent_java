import { equipmentService } from '../services/equipmentService.js';

export const equipmentController = {
    async getAll(req, res) {
        try {
            const data = await equipmentService.getAll();
            res.json(data);
        } catch (error) {
            console.error('Controller: Error fetching equipment:', error);
            res.status(500).json({ error: 'Błąd pobierania danych sprzętu' });
        }
    },

    async create(req, res) {
        try {
            const data = await equipmentService.create(req.body);
            res.json(data);
        } catch (error) {
            console.error('Controller: Error creating equipment:', error);
            res.status(500).json({ error: 'Błąd dodawania narty' });
        }
    },

    async update(req, res) {
        try {
            const data = await equipmentService.update(req.params.id, req.body);
            if (!data) return res.status(404).json({ error: 'Narta nie znaleziona' });
            res.json(data);
        } catch (error) {
            console.error('Controller: Error updating equipment:', error);
            res.status(500).json({ error: 'Błąd aktualizacji narty' });
        }
    },

    async bulkUpdate(req, res) {
        try {
            const { ids, updates } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'Brak tablicy ID do aktualizacji' });
            }

            const data = await equipmentService.bulkUpdate(ids, updates);
            if (data.length === 0) return res.status(404).json({ error: 'Nie znaleziono nart o podanych ID' });

            res.json(data);
        } catch (error) {
            console.error('Controller: Error bulk updating equipment:', error);
            res.status(500).json({ error: 'Błąd aktualizacji wielu nart' });
        }
    }
};
