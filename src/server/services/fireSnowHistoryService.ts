/**
 * src/server/services/fireSnowHistoryService.ts: Historia klientów z FireSnow (wypożyczenia z bieżących sezonów)
 * Mapuje odpowiedzi bridge'a na te same kształty, które zwraca historyService (archiwum MySQL)
 */

import { config } from '../config/env.js';
import logger from '../config/logger.js';
import { fireSnowService } from './fireSnowService.js';
import type { ClientSearchResult, ClientDate, ClientEquipment } from './historyService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_LABEL = 'w trakcie';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Ułamek (0.15) → procent (15)
 */
function toPercent(fraction: number | null | undefined): number {
    return Math.round((fraction || 0) * 100);
}

/**
 * Kwota zaokrąglona do 0,01
 */
function roundMoney(value: number | null | undefined): number {
    return Math.round((value || 0) * 100) / 100;
}

/**
 * ms → DD.MM.YYYY (czas lokalny serwera)
 */
export function formatDatePl(ms: number): string {
    const d = new Date(ms);
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * ms → ISO 8601 bez strefy: YYYY-MM-DDTHH:mm:ss (czas lokalny serwera)
 */
export function formatIsoLocal(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * Sezon z daty startu: lipiec–czerwiec, np. 2024-07-01 → "2024/25", 2025-06-30 → "2024/25"
 */
export function seasonForTimestamp(ms: number): string {
    const d = new Date(ms);
    const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
    return `${startYear}/${pad2((startYear + 1) % 100)}`;
}

/**
 * Prefiks numeru dokumentu "P" = umowa promotora (jak w bridge'u); "WP ..." to zwykła umowa
 */
function contractType(documentNumber: string | null | undefined): string {
    return (documentNumber ?? '').trim().toUpperCase().startsWith('P') ? 'PROMOTOR' : 'STANDARD';
}

export const fireSnowHistoryService = {
    /**
     * Wyszukuje klientów FireSnow po nazwisku
     */
    async searchClients(nazwisko: string): Promise<ClientSearchResult[]> {
        if (!config.useFireSnowApi) {
            logger.warn('fireSnowHistoryService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }
        const query = (nazwisko || '').trim();
        if (query.length < 2) return [];

        const rows = await fireSnowService.searchHistoryClients(query);

        return rows.map(row => {
            const fullName = (row.klient_nazwa || '').trim();
            let imie = (row.imie || '').trim();
            let nazwiskoKlienta = (row.nazwisko || '').trim();

            // Nazwa w FireSnow ma postać "NAZWISKO IMIĘ" - używana, gdy RENT_CUSTOMERS nie ma imienia i nazwiska
            if (!imie && !nazwiskoKlienta && fullName) {
                const [first = '', ...rest] = fullName.split(/\s+/);
                nazwiskoKlienta = first;
                imie = rest.join(' ');
            }

            return {
                id: row.klient_id,
                nazwisko: nazwiskoKlienta,
                imie,
                telefon: (row.telefon || '').trim(),
                pelna_nazwa: fullName || `${imie} ${nazwiskoKlienta}`.trim() || 'Brak nazwy',
                source: 'firesnow' as const
            };
        });
    },

    /**
     * Pobiera umowy klienta (wypożyczenia pogrupowane po dokumencie)
     */
    async getClientDates(clientId: number): Promise<ClientDate[]> {
        if (!config.useFireSnowApi) {
            logger.warn('fireSnowHistoryService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }

        const rows = await fireSnowService.getHistoryContracts(clientId);

        return rows.map(row => {
            const active = row.min_stop === 0;
            return {
                od: formatDatePl(row.data_od),
                do: active ? ACTIVE_LABEL : formatDatePl(row.data_do),
                od_iso: formatIsoLocal(row.data_od),
                do_iso: active ? '' : formatIsoLocal(row.data_do),
                sezon: seasonForTimestamp(row.data_od),
                liczba_pozycji: row.liczba_pozycji,
                dokument_id: row.dokument_id,
                numer: row.numer_dokumentu || '',
                rabat_procent: toPercent(row.rabat_procent_umowy || row.rabat_procent_pozycji_max),
                // rabat_kwota_umowy w FireSnow powtarza sumę rabatów pozycji (np. 162 = 162), więc nie sumujemy
                rabat_kwota: roundMoney(Math.max(row.rabat_kwota_umowy || 0, row.rabat_kwota_pozycji || 0)),
                dni_gratis: Math.round((row.bonus_ms || 0) / DAY_MS),
                uwagi: (row.uwagi || '').trim()
            };
        });
    },

    /**
     * Pobiera pozycje jednej umowy klienta
     */
    async getClientEquipment(clientId: number, documentId: number, now: number = Date.now()): Promise<ClientEquipment[]> {
        if (!config.useFireSnowApi) {
            logger.warn('fireSnowHistoryService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }

        const positions = await fireSnowService.getHistoryEquipment(clientId, documentId);

        return positions.map(pos => {
            const returned = pos.data_do !== 0;
            const end = returned ? pos.data_do : now;
            return {
                klient: '',
                sprzet: pos.nazwa_sprzetu || '',
                kod: pos.kod_sprzetu || '',
                od: formatIsoLocal(pos.data_od),
                do: returned ? formatIsoLocal(pos.data_do) : '',
                cena: pos.cena ? pos.cena.toString() : '0',
                zaplacono: pos.zaplacono ? pos.zaplacono.toString() : '0',
                numer: pos.numer_dokumentu || '',
                typumowy: contractType(pos.numer_dokumentu),
                uwagi: returned ? 'Oddana' : 'Nie oddana',
                status: returned ? 'Oddane' : 'Nie oddane',
                source: 'firesnow',
                dlugosc: null,
                liczba_dni: Math.max(0, Math.ceil((end - pos.data_od) / DAY_MS)),
                rabat_procent: toPercent(pos.rabat_procent),
                rabat_kwota: roundMoney(pos.rabat_kwota)
            };
        });
    }
};
