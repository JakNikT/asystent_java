import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';
import { formatFireSnowDate } from '../utils/formatters.js';

function mapFireSnowReservation(item) {
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
        klient_id: item.klient_id
    };
}

function filterCsvReservations(reservations) {
    return reservations.filter(reservation => {
        if (!reservation.klient || !reservation.sprzet) return false;
        if (reservation.klient === '57' || reservation.sprzet === 'Suma:') return false;
        if (reservation.klient.includes && reservation.klient.includes('Suma:')) return false;
        if (reservation.sprzet.includes && reservation.sprzet.includes('Suma:')) return false;
        if (!reservation.od || !reservation.do) return false;
        return true;
    });
}

export const reservationService = {
    async getAll() {
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getActiveReservations();
                console.log(`Server: Mapped ${data.length} reservations from API`);
                return data.map(mapFireSnowReservation);
            } catch (error) {
                console.warn('Server: FireSnow API unavailable, fallback to CSV:', error.message);
            }
        }

        // Fallback or default to CSV
        const data = await csvService.getReservations();
        const filtered = filterCsvReservations(data);
        console.log(`Server: Loaded ${filtered.length} reservations from CSV`);
        return filtered;
    },

    async create(data) {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations); // Ensure we work with clean data? Or raw?
        // Original code appended to the raw parsed list (which might include garbage if not filtered, but csvService.getReservations returns raw parsed data with headers transformed)
        // Actually original code called loadReservationsFromCSV which filtered them!
        // So we should append to the filtered list? 
        // Wait, if we save filtered list back, we might lose "Suma:" rows if they were important (unlikely).
        // Original code: loadReservationsFromCSV() returns filtered list. saveReservationsToCSV() unparses that list.
        // So yes, we overwrite the file with only valid reservations.

        const newReservation = {
            ...data,
            numer: Date.now().toString()
        };

        filtered.push(newReservation);
        await csvService.saveReservations(filtered);
        return newReservation;
    },

    async update(id, data) {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations);

        const index = filtered.findIndex(r => r.numer === id || r.kod === id);
        if (index === -1) return null;

        filtered[index] = { ...filtered[index], ...data };
        await csvService.saveReservations(filtered);
        return filtered[index];
    },

    async delete(id) {
        const reservations = await csvService.getReservations();
        const filtered = filterCsvReservations(reservations);

        const index = filtered.findIndex(r => r.numer === id || r.kod === id);
        if (index === -1) return null;

        const [deleted] = filtered.splice(index, 1);
        await csvService.saveReservations(filtered);
        return deleted;
    }
};
