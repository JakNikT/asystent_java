import { fireSnowService } from '../services/fireSnowService.js';
import { config } from '../config/env.js';

export const fireSnowController = {
    async checkHealth(req, res) {
        try {
            const data = await fireSnowService.checkHealth();
            res.json({
                status: 'online',
                api_url: config.fireSnowApiUrl,
                api_response: data
            });
        } catch (error) {
            res.json({
                status: 'error',
                api_url: config.fireSnowApiUrl,
                error: error.message
            });
        }
    },

    async refreshCache(req, res) {
        try {
            const data = await fireSnowService.refreshCache();
            res.json({
                success: true,
                message: 'FireSnow API odświeżone',
                api_response: data
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    async getAvailability(req, res) {
        const startTime = Date.now();
        try {
            const { from, to } = req.query;
            const data = await fireSnowService.getAvailability(from, to);

            const duration = Date.now() - startTime;
            console.log(`Controller: Availability fetched in ${duration}ms`);

            res.json(data);
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`Controller: Error fetching availability (after ${duration}ms):`, error);
            res.status(500).json({ error: 'Błąd pobierania dostępności' });
        }
    }
};
