import logger from '../config/logger.js';

/**
 * Formatuje datę z FireSnow API do formatu ISO 8601 (rozumiany przez JavaScript Date)
 * Input: "2026-02-13 11:00:00.000000" → Output: "2026-02-13T11:00:00"
 */
export function formatFireSnowDate(dateString) {
    if (!dateString) return '';

    try {
        // Format z API: "2026-02-13 11:00:00.000000"
        // Usuń mikrosekundy i zamień spację na T (ISO 8601)
        const isoString = dateString.split('.')[0].replace(' ', 'T');

        // Sprawdź czy to poprawna data
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            logger.warn('src/server/utils/formatters.js: Nieprawidłowa data:', { dateString });
            return dateString;
        }

        return isoString; // "2026-02-13T11:00:00"
    } catch (error) {
        logger.error('src/server/utils/formatters.js: Błąd formatowania daty:', { dateString, error });
        return dateString;
    }
}

/**
 * Wyciąga kod sprzętu z nazwy (np. "NARTY ATOMIC //01" -> "01")
 */
export function extractKodFromName(name) {
    const match = name.match(/\/\/(\d+)/);
    return match ? match[1] : '';
}

/**
 * Konwertuje datę z formatu DD.MM.YYYY na ISO 8601
 * server.js: Konwersja dat z bazy historii (DD.MM.YYYY) na format ISO 8601
 */
export function convertDateToISO(dateString) {
    if (!dateString) return '';

    try {
        // Input: "31.12.2022"
        // Output: "2022-12-31T00:00:00"
        const [day, month, year] = dateString.split('.');
        if (!day || !month || !year) {
            logger.warn('src/server/utils/formatters.js: Nieprawidłowy format daty:', { dateString });
            return dateString;
        }
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`;
    } catch (error) {
        logger.error('src/server/utils/formatters.js: Błąd konwersji daty:', { dateString, error });
        return dateString;
    }
}
