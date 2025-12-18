/**
 * src/server/services/fireSnowService.ts: Wrapper do komunikacji z FireSnow Bridge API
 * Generic fetch wrapper dla wszystkich endpointów FireSnow API
 */

import { config } from '../config/env.js';
import logger from '../config/logger.js';
import type { FireSnowReservation, FireSnowRental, FireSnowEquipment } from '../types/services.types.js';

/**
 * Opcje dla fetchFireSnow
 */
interface FetchOptions extends RequestInit {
    signal?: AbortSignal;
}

/**
 * Generic fetch wrapper for FireSnow API
 * src/server/services/fireSnowService.ts: Wrapper do komunikacji z FireSnow Bridge API
 */
async function fetchFireSnow<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const url = `${config.fireSnowApiUrl}${endpoint}`;
    logger.info(`FireSnow API request: ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            signal: options.signal || AbortSignal.timeout(10000) // 10s timeout default
        });

        if (!response.ok) {
            const errorMsg = `FireSnow API error: ${response.status} ${response.statusText}`;
            logger.error(`src/server/services/fireSnowService.ts: ${errorMsg} for ${url}`);
            throw new Error(errorMsg);
        }

        return await response.json() as T;
    } catch (error) {
        // src/server/services/fireSnowService.ts: Szczegółowe logowanie błędów połączenia
        const err = error as Error & { code?: string; cause?: Error };
        const errorDetails = {
            message: err.message,
            code: err.code || 'UNKNOWN',
            cause: err.cause?.message || err.cause || null,
            url: url
        };
        
        // Sprawdź typ błędu i dodaj pomocne komunikaty
        if (err.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
            logger.error(`src/server/services/fireSnowService.ts: FireSnow Bridge nie odpowiada na ${url}`, errorDetails);
            logger.error(`src/server/services/fireSnowService.ts: Sprawdź czy FireSnow Bridge jest uruchomiony na porcie 8081`);
            logger.error(`src/server/services/fireSnowService.ts: Upewnij się że Java Bridge działa (sprawdź błędy Java w logach)`);
        } else if (err.name === 'AbortError' || err.message.includes('timeout')) {
            logger.error(`src/server/services/fireSnowService.ts: Timeout połączenia z FireSnow API: ${url}`, errorDetails);
        } else {
            logger.error(`src/server/services/fireSnowService.ts: FireSnow API fetch error for ${url}:`, errorDetails);
        }
        
        throw error;
    }
}

export const fireSnowService = {
    /**
     * Pobiera aktywne rezerwacje z FireSnow API
     */
    async getActiveReservations(): Promise<FireSnowReservation[]> {
        return fetchFireSnow<FireSnowReservation[]>('/api/rezerwacje/aktywne');
    },

    /**
     * Pobiera aktywne wypożyczenia z FireSnow API
     */
    async getActiveRentals(): Promise<FireSnowRental[]> {
        return fetchFireSnow<FireSnowRental[]>('/api/wypozyczenia/aktualne');
    },

    /**
     * Pobiera przeszłe wypożyczenia z FireSnow API
     */
    async getPastRentals(): Promise<FireSnowRental[]> {
        return fetchFireSnow<FireSnowRental[]>('/api/wypozyczenia/przeszle');
    },

    /**
     * Pobiera wszystkie urządzenia z FireSnow API
     */
    async getAllEquipment(): Promise<FireSnowEquipment[]> {
        return fetchFireSnow<FireSnowEquipment[]>('/api/sprzet/wszystkie');
    },

    /**
     * Pobiera dostępność sprzętu w danym okresie
     */
    async getAvailability(from?: string, to?: string): Promise<unknown> {
        const queryParams = new URLSearchParams();
        if (from) queryParams.append('from', from);
        if (to) queryParams.append('to', to);
        return fetchFireSnow(`/api/dostepnosc/okres?${queryParams.toString()}`);
    },

    /**
     * Sprawdza status zdrowia FireSnow API
     */
    async checkHealth(): Promise<unknown> {
        return fetchFireSnow('/api/health', { signal: AbortSignal.timeout(5000) });
    },

    /**
     * Odświeża cache FireSnow API
     */
    async refreshCache(): Promise<unknown> {
        return fetchFireSnow('/api/refresh', {
            method: 'POST',
            signal: AbortSignal.timeout(5000)
        });
    }
};



