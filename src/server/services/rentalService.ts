/**
 * src/server/services/rentalService.ts: Serwis do obsługi wypożyczeń
 * Pobiera wypożyczenia z FireSnow API lub CSV fallback
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';
import logger from '../config/logger.js';
import type { FireSnowRental, Reservation } from '../types/services.types.js';

/**
 * Mapuje wypożyczenie z FireSnow API na format aplikacji (aktywne)
 */
function mapFireSnowRental(item: FireSnowRental): Reservation {
    let klient = item.klient_nazwa || (item as { imie_nazwisko?: string }).imie_nazwisko || '';
    if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
    }

    let dataOd = '';
    let dataDo = '';

    // Format 1: timestamp
    if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0]!;
        const dataDoValue = (item as { data_do?: number }).data_do;
        const pozostalyCzas = (item as { pozostaly_czas?: number }).pozostaly_czas;
        if (dataDoValue === 0 && pozostalyCzas && typeof pozostalyCzas === 'number') {
            const obliczonaDataDo = item.data_od + pozostalyCzas;
            dataDo = new Date(obliczonaDataDo).toISOString().split('T')[0]!;
        } else if (dataDoValue && typeof dataDoValue === 'number' && dataDoValue !== 0) {
            dataDo = new Date(dataDoValue).toISOString().split('T')[0]!;
        }
    }
    // Format 2: string
    else if ((item as { data_rozpoczecia?: string }).data_rozpoczecia) {
        dataOd = (item as { data_rozpoczecia: string }).data_rozpoczecia.split(' ')[0]!;
    }

    return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: (item as { zaplacono?: number }).zaplacono ? (item as { zaplacono: number }).zaplacono.toString() : '0',
        numer: (item as { numer_dokumentu?: string }).numer_dokumentu || `WYP-${(item as { session_id?: string }).session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id as number | undefined,
        klient_id: item.klient_id,
        parent_group_id: item.parent_group_id !== undefined ? item.parent_group_id : null
    };
}

/**
 * Mapuje przeszłe wypożyczenie z FireSnow API na format aplikacji
 */
function mapFireSnowPastRental(item: FireSnowRental): Reservation & { source: string } {
    let klient = item.klient_nazwa || (item as { imie_nazwisko?: string }).imie_nazwisko || '';
    if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
    }

    let dataOd = '';
    let dataDo = '';

    if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0]!;
    }
    const dataDoValue = (item as { data_do?: number }).data_do;
    if (dataDoValue && typeof dataDoValue === 'number') {
        dataDo = dataDoValue === 0 ? '' : new Date(dataDoValue).toISOString().split('T')[0]!;
    }

    return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: (item as { zaplacono?: number }).zaplacono ? (item as { zaplacono: number }).zaplacono.toString() : '0',
        numer: (item as { numer_dokumentu?: string }).numer_dokumentu || `WYP-${(item as { session_id?: string }).session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id as number | undefined,
        klient_id: item.klient_id,
        parent_group_id: item.parent_group_id !== undefined ? item.parent_group_id : null,
        source: 'rental'
    };
}

/**
 * Filtruje wypożyczenia z CSV, usuwając nieprawidłowe wpisy
 */
function filterCsvRentals(rentals: Record<string, unknown>[]): Reservation[] {
    return rentals.filter(rental => {
        const r = rental as Record<string, unknown>;
        if (!r.klient || !r.sprzet) return false;
        if (typeof r.klient === 'string' && r.klient.includes('Suma:')) return false;
        if (typeof r.sprzet === 'string' && r.sprzet.includes('Suma:')) return false;
        if (!r.od || !r.do) return false;
        return true;
    }).map(rental => ({
        ...rental,
        typumowy: 'STANDARD',
        numer: (rental.kod as string) || `WYP-${Date.now()}`
    })) as Reservation[];
}

export const rentalService = {
    /**
     * Pobiera aktywne wypożyczenia
     */
    async getActive(): Promise<Reservation[]> {
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getActiveRentals();
                logger.info(`Mapped ${data.length} rentals from API`);
                return data.map(mapFireSnowRental);
            } catch (error) {
                const err = error as Error;
                logger.warn('FireSnow API unavailable, fallback to CSV', { error: err.message });
            }
        }

        const data = await csvService.getRentals();
        const filtered = filterCsvRentals(data);
        logger.info(`Loaded ${filtered.length} rentals from CSV`);
        return filtered;
    },

    /**
     * Pobiera przeszłe wypożyczenia
     */
    async getPast(): Promise<(Reservation & { source?: string })[]> {
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getPastRentals();
                logger.info(`Mapped ${data.length} past rentals from API`);
                return data.map(mapFireSnowPastRental);
            } catch (error) {
                const err = error as Error;
                logger.warn('FireSnow API unavailable for past rentals, fallback to empty', { error: err.message });
            }
        }
        return [];
    }
};






