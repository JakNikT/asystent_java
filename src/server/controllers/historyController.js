import { historyService } from '../services/historyService.js';

export const historyController = {
    async searchClients(req, res) {
        try {
            const data = await historyService.searchClients(req.query.nazwisko);
            res.json(data);
        } catch (error) {
            console.error('Controller: Error searching clients:', error);
            res.status(500).json({ error: 'Błąd wyszukiwania klientów' });
        }
    },

    async getClientDates(req, res) {
        try {
            const clientId = parseInt(req.params.id);
            if (isNaN(clientId)) return res.status(400).json({ error: 'Nieprawidłowe ID klienta' });

            const data = await historyService.getClientDates(clientId);
            res.json(data);
        } catch (error) {
            console.error('Controller: Error fetching client dates:', error);
            res.status(500).json({ error: 'Błąd pobierania dat klienta' });
        }
    },

    async getClientEquipment(req, res) {
        try {
            const clientId = parseInt(req.params.id);
            if (isNaN(clientId)) return res.status(400).json({ error: 'Nieprawidłowe ID klienta' });

            const { od, do: doDate, sezon } = req.query;
            if (!od || !doDate) return res.status(400).json({ error: 'Brakuje parametrów od lub do' });

            const data = await historyService.getClientEquipment(clientId, od, doDate, sezon);
            res.json(data);
        } catch (error) {
            console.error('Controller: Error fetching client equipment:', error);
            res.status(500).json({ error: 'Błąd pobierania sprzętu klienta' });
        }
    }
};
