/**
 * src/server/services/reservationService.ts: Serwis do obsługi rezerwacji
 * Pobiera rezerwacje z FireSnow API
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { formatFireSnowDate } from '../utils/formatters.js';
import logger from '../config/logger.js';
import type { FireSnowReservation, Reservation } from '../types/services.types.js';

/**
 * Mapuje rezerwację z FireSnow API na format aplikacji
 */
function mapFireSnowReservation(item: FireSnowReservation): Reservation {
    let klient = '';

    // Priority 1: klient_nazwa
    if (item.klient_nazwa && item.klient_nazwa.trim()) {
        klient = item.klient_nazwa.trim();
    }
    // Priority 2: imie + nazwisko
    else {
        const imie = (item.imie && item.imie.trim()) || '';
        const nazwisko = (item.nazwisko && item.nazwisko.trim()) || '';
        if (imie || nazwisko) {
            klient = `${imie} ${nazwisko}`.trim();
        }
    }
    // Priority 3: Fallback
    if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
    }

    return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: formatFireSnowDate(item.data_od),
        do: formatFireSnowDate(item.data_do),
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: '',
        numer: item.rezerwacja_id ? item.rezerwacja_id.toString() : '',
        typumowy: item.typumowy || 'STANDARD',
        uwagi: item.uwagi || '',
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id,
        parent_group_id: item.parent_group_id !== undefined ? item.parent_group_id : null,
        status: item.status !== undefined ? item.status : 0
    };
}

export const reservationService = {
    /**
     * Pobiera rezerwacje dla konkretnej daty (aktywne i wydane)
     * @param date - Data w formacie YYYY-MM-DD
     */
    async getForDate(date: string): Promise<Reservation[]> {
        if (!config.useFireSnowApi) {
            logger.warn('reservationService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }

        try {
            const data = await fireSnowService.getReservationsForDate(date);
            logger.info(`reservationService: Pobrano ${data.length} rezerwacji dla daty ${date} z FireSnow API`);
            return data.map(mapFireSnowReservation);
        } catch (error) {
            const err = error as Error;
            logger.error(`reservationService: Błąd pobierania rezerwacji dla daty ${date} z FireSnow API`, {
                error: err.message
            });
            return [];
        }
    },

    /**
     * Pobiera wszystkie aktywne rezerwacje
     */
    async getAll(): Promise<Reservation[]> {
        if (!config.useFireSnowApi) {
            logger.warn('reservationService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }

        try {
            const data = await fireSnowService.getActiveReservations();
            logger.info(`reservationService: Pobrano ${data.length} rezerwacji z FireSnow API`);
            return data.map(mapFireSnowReservation);
        } catch (error) {
            const err = error as Error;
            logger.error('reservationService: Błąd pobierania rezerwacji z FireSnow API', {
                error: err.message,
                hint: 'Sprawdź czy FireSnow Bridge jest uruchomiony (port 8081) i czy Java jest poprawnie skonfigurowana'
            });
            return [];
        }
    }
};






