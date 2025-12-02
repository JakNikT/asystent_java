import { config } from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Generic fetch wrapper for FireSnow API
 * src/server/services/fireSnowService.js: Wrapper do komunikacji z FireSnow Bridge API
 */
async function fetchFireSnow(endpoint, options = {}) {
    const url = `${config.fireSnowApiUrl}${endpoint}`;
    logger.info(`FireSnow API request: ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            signal: options.signal || AbortSignal.timeout(10000) // 10s timeout default
        });

        if (!response.ok) {
            const errorMsg = `FireSnow API error: ${response.status} ${response.statusText}`;
            logger.error(`src/server/services/fireSnowService.js: ${errorMsg} for ${url}`);
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        // src/server/services/fireSnowService.js: Szczegółowe logowanie błędów połączenia
        const errorDetails = {
            message: error.message,
            code: error.code || 'UNKNOWN',
            cause: error.cause?.message || error.cause || null,
            url: url
        };
        
        // Sprawdź typ błędu i dodaj pomocne komunikaty
        if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
            logger.error(`src/server/services/fireSnowService.js: FireSnow Bridge nie odpowiada na ${url}`, errorDetails);
            logger.error(`src/server/services/fireSnowService.js: Sprawdź czy FireSnow Bridge jest uruchomiony na porcie 8081`);
            logger.error(`src/server/services/fireSnowService.js: Upewnij się że Java Bridge działa (sprawdź błędy Java w logach)`);
        } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
            logger.error(`src/server/services/fireSnowService.js: Timeout połączenia z FireSnow API: ${url}`, errorDetails);
        } else {
            logger.error(`src/server/services/fireSnowService.js: FireSnow API fetch error for ${url}:`, errorDetails);
        }
        
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
