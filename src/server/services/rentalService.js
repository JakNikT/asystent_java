import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';

function mapFireSnowRental(item) {
    let klient = item.klient_nazwa || item.imie_nazwisko || '';
    if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
    }

    let dataOd = '';
    let dataDo = '';

    // Format 1: timestamp
    if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0];
        if (item.data_do === 0 && item.pozostaly_czas && typeof item.pozostaly_czas === 'number') {
            const obliczonaDataDo = item.data_od + item.pozostaly_czas;
            dataDo = new Date(obliczonaDataDo).toISOString().split('T')[0];
        } else if (item.data_do && typeof item.data_do === 'number' && item.data_do !== 0) {
            dataDo = new Date(item.data_do).toISOString().split('T')[0];
        }
    }
    // Format 2: string
    else if (item.data_rozpoczecia) {
        dataOd = item.data_rozpoczecia.split(' ')[0];
    }

    return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: item.zaplacono ? item.zaplacono.toString() : '0',
        numer: item.numer_dokumentu || `WYP-${item.session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id
    };
}

function mapFireSnowPastRental(item) {
    let klient = item.klient_nazwa || item.imie_nazwisko || '';
    if (!klient) {
        klient = `Klient #${item.klient_id || '?'}`;
    }

    let dataOd = '';
    let dataDo = '';

    if (item.data_od && typeof item.data_od === 'number') {
        dataOd = new Date(item.data_od).toISOString().split('T')[0];
    }
    if (item.data_do && typeof item.data_do === 'number') {
        dataDo = item.data_do === 0 ? '' : new Date(item.data_do).toISOString().split('T')[0];
    }

    return {
        klient: klient,
        sprzet: item.nazwa_sprzetu || '',
        kod: item.kod_sprzetu || '',
        od: dataOd,
        do: dataDo,
        cena: item.cena ? item.cena.toString() : '0',
        zaplacono: item.zaplacono ? item.zaplacono.toString() : '0',
        numer: item.numer_dokumentu || `WYP-${item.session_id || '?'}`,
        typumowy: 'STANDARD',
        obiekt_id: item.obiekt_id,
        klient_id: item.klient_id,
        source: 'rental'
    };
}

function filterCsvRentals(rentals) {
    return rentals.filter(rental => {
        if (!rental.klient || !rental.sprzet) return false;
        if (rental.klient.includes && rental.klient.includes('Suma:')) return false;
        if (rental.sprzet.includes && rental.sprzet.includes('Suma:')) return false;
        if (!rental.od || !rental.do) return false;
        return true;
    }).map(rental => ({
        ...rental,
        typumowy: 'STANDARD',
        numer: rental.kod || `WYP-${Date.now()}`
    }));
}

export const rentalService = {
    async getActive() {
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getActiveRentals();
                console.log(`Server: Mapped ${data.length} rentals from API`);
                return data.map(mapFireSnowRental);
            } catch (error) {
                console.warn('Server: FireSnow API unavailable, fallback to CSV:', error.message);
            }
        }

        const data = await csvService.getRentals();
        const filtered = filterCsvRentals(data);
        console.log(`Server: Loaded ${filtered.length} rentals from CSV`);
        return filtered;
    },

    async getPast() {
        if (config.useFireSnowApi) {
            try {
                const data = await fireSnowService.getPastRentals();
                console.log(`Server: Mapped ${data.length} past rentals from API`);
                return data.map(mapFireSnowPastRental);
            } catch (error) {
                console.warn('Server: FireSnow API unavailable for past rentals, fallback to empty:', error.message);
            }
        }
        return [];
    }
};
