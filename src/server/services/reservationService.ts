/**
 * src/server/services/reservationService.ts: Serwis do obsługi rezerwacji
 * Pobiera rezerwacje z FireSnow API lub CSV fallback
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';
import { formatFireSnowDate } from '../utils/formatters.js';
import logger from '../config/logger.js';
import type { FireSnowReservation, Reservation, CreateReservationData, UpdateReservationData } from '../types/services.types.js';

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
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id,
        parent_group_id: item.parent_group_id !== undefined ? item.parent_group_id : null
    };
}

/**
 * Filtruje rezerwacje z CSV, usuwając nieprawidłowe wpisy
 */
function filterCsvReservations(reservations: Record<string, unknown>[]): Reservation[] {
    return reservations.filter(reservation => {
        const r = reservation as Record<string, unknown>;
        if (!r.klient || !r.sprzet) return false;
        if (r.klient === '57' || r.sprzet === 'Suma:') return false;
        if (typeof r.klient === 'string' && r.klient.includes('Suma:')) return false;
        if (typeof r.sprzet === 'string' && r.sprzet.includes('Suma:')) return false;
        if (!r.od || !r.do) return false;
        return true;
    }) as unknown as Reservation[];
}

export const reservationService = {
    /**
     * Pobiera wszystkie rezerwacje
     */
    async getAll(): Promise<Reservation[]> {
        // src/server/services/reservationService.ts: Próba pobrania rezerwacji z FireSnow API
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getActiveReservations();
                logger.info(`src/server/services/reservationService.ts: Pobrano ${data.length} rezerwacji z FireSnow API`);
                return data.map(mapFireSnowReservation);
            } catch (error) {
                // src/server/services/reservationService.ts: FireSnow API niedostępne - użycie fallback do CSV
                const err = error as Error;
                logger.warn(`src/server/services/reservationService.ts: FireSnow API unavailable, fallback to CSV`, { 
                    error: err.message,
                    code: (err as { code?: string }).code || 'UNKNOWN',
                    hint: 'Sprawdź czy FireSnow Bridge jest uruchomiony (port 8081) i czy Java jest poprawnie skonfigurowana'
                });
            }
        }

        // Fallback or default to CSV
        const data = await csvService.getReservations();
        const filtered = filterCsvReservations(data);
        logger.info(`Loaded ${filtered.length} reservations from CSV`);
        return filtered as unknown as Reservation[];
    },

    /**
     * Tworzy nową rezerwację
     */
    async create(data: CreateReservationData): Promise<Reservation> {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations);

        const newReservation: Reservation = {
            klient: data.klient,
            sprzet: data.sprzet,
            kod: data.kod,
            od: data.od,
            do: data.do,
            cena: data.cena || '0',
            zaplacono: data.zaplacono || '',
            numer: Date.now().toString(),
            typumowy: data.typumowy || 'STANDARD'
        };

        filtered.push(newReservation);
        await csvService.saveReservations(filtered);
        return newReservation;
    },

    /**
     * Aktualizuje istniejącą rezerwację
     */
    async update(id: string, data: UpdateReservationData): Promise<Reservation | null> {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations);

        const index = filtered.findIndex(r => r.numer === id || r.kod === id);
        if (index === -1) return null;

        filtered[index] = { ...filtered[index]!, ...data };
        await csvService.saveReservations(filtered);
        return filtered[index]!;
    },

    /**
     * Usuwa rezerwację
     */
    async delete(id: string): Promise<Reservation | null> {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations);

        const index = filtered.findIndex(r => r.numer === id || r.kod === id);
        if (index === -1) return null;

        const [deleted] = filtered.splice(index, 1);
        await csvService.saveReservations(filtered);
        return deleted || null;
    }
};



