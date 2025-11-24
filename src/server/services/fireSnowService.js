import { config } from '../config/env.js';

/**
 * Generic fetch wrapper for FireSnow API
 */
async function fetchFireSnow(endpoint, options = {}) {
    const url = `${config.fireSnowApiUrl}${endpoint}`;
    console.log(`Server: FireSnow API request: ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            signal: options.signal || AbortSignal.timeout(10000) // 10s timeout default
        });

        if (!response.ok) {
            throw new Error(`FireSnow API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Server: FireSnow API fetch error for ${url}:`, error.message);
        throw error;
    }
}

export const fireSnowService = {
    async getActiveReservations() {
        return fetchFireSnow('/api/rezerwacje/aktywne');
    },

    async getActiveRentals() {
        return fetchFireSnow('/api/wypozyczenia/aktualne');
    },

    async getPastRentals() {
        return fetchFireSnow('/api/wypozyczenia/przeszle');
    },

    async getAllEquipment() {
        return fetchFireSnow('/api/sprzet/wszystkie');
    },

    async getAvailability(from, to) {
        const queryParams = new URLSearchParams();
        if (from) queryParams.append('from', from);
        if (to) queryParams.append('to', to);
        return fetchFireSnow(`/api/dostepnosc/okres?${queryParams.toString()}`);
    },

    async checkHealth() {
        return fetchFireSnow('/api/health', { signal: AbortSignal.timeout(5000) });
    },

    async refreshCache() {
        return fetchFireSnow('/api/refresh', {
            method: 'POST',
            signal: AbortSignal.timeout(5000)
        });
    }
};
