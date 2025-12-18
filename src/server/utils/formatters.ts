/**
 * src/server/utils/formatters.ts: Funkcje formatujące dane
 * Formatowanie dat, kodów sprzętu i innych wartości
 */

import logger from '../config/logger.js';

/**
 * Formatuje datę z FireSnow API do formatu ISO 8601 (rozumiany przez JavaScript Date)
 * Input: "2026-02-13 11:00:00.000000" → Output: "2026-02-13T11:00:00"
 */
export function formatFireSnowDate(dateString: string | null | undefined): string {
    if (!dateString) return '';

    try {
        // Format z API: "2026-02-13 11:00:00.000000"
        // Usuń mikrosekundy i zamień spację na T (ISO 8601)
        const isoString = dateString.split('.')[0]!.replace(' ', 'T');

        // Sprawdź czy to poprawna data
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            logger.warn('src/server/utils/formatters.ts: Nieprawidłowa data:', { dateString });
            return dateString;
        }

        return isoString; // "2026-02-13T11:00:00"
    } catch (error) {
        logger.error('src/server/utils/formatters.ts: Błąd formatowania daty:', { dateString, error });
        return dateString;
    }
}

/**
 * Wyciąga kod sprzętu z nazwy (np. "NARTY ATOMIC //01" -> "01")
 */
export function extractKodFromName(name: string | null | undefined): string {
    if (!name) return '';
    const match = name.match(/\/\/(\d+)/);
    return match ? match[1]! : '';
}

/**
 * Konwertuje datę z formatu DD.MM.YYYY na ISO 8601
 * server.ts: Konwersja dat z bazy historii (DD.MM.YYYY) na format ISO 8601
 */
export function convertDateToISO(dateString: string | null | undefined): string {
    if (!dateString) return '';

    try {
        // Input: "31.12.2022"
        // Output: "2022-12-31T00:00:00"
        const [day, month, year] = dateString.split('.');
        if (!day || !month || !year) {
            logger.warn('src/server/utils/formatters.ts: Nieprawidłowy format daty:', { dateString });
            return dateString;
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
    } catch (error) {
        logger.error('src/server/utils/formatters.ts: Błąd konwersji daty:', { dateString, error });
        return dateString;
    }
}



