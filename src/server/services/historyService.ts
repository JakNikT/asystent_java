/**
 * src/server/services/historyService.ts: Serwis do obsługi historii klientów
 * Pobiera dane z bazy danych historii
 */

import { getHistoryDBConnection } from '../config/database.js';
import { convertDateToISO } from '../utils/formatters.js';
import type { QueryResult } from '../types/database.types.js';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Wynik wyszukiwania klienta
 */
export interface ClientSearchResult {
    id: number;
    nazwisko: string;
    imie: string;
    telefon: string;
    pelna_nazwa: string;
}

/**
 * Data klienta z historii
 */
export interface ClientDate {
    od: string;
    do: string;
    od_iso: string;
    do_iso: string;
    sezon: string;
    liczba_pozycji: number;
}

/**
 * Sprzęt klienta z historii
 */
export interface ClientEquipment {
    klient: string;
    sprzet: string;
    kod: string;
    od: string;
    do: string;
    cena: string;
    zaplacono: string;
    numer: string;
    typumowy: string;
    uwagi: string;
    status: string;
    source: string;
    dlugosc: number | null;
    liczba_dni: number;
}

/**
 * Typ dla wierszy z bazy danych historii klientów
 */
interface ClientRow extends RowDataPacket {
    Klient: number;
    Nazwisko: string | null;
    Imie: string | null;
    Telefon: string | null;
}

/**
 * Typ dla wierszy z datami klienta
 */
interface ClientDateRow extends RowDataPacket {
    Od: string | null;
    Do: string | null;
    sezon: string | null;
    liczba_pozycji: number;
}

/**
 * Typ dla wierszy ze sprzętem klienta
 */
interface ClientEquipmentRow extends RowDataPacket {
    Imie: string | null;
    Nazwisko: string | null;
    Telefon: string | null;
    Symbol: string | null;
    Nazwa: string | null;
    Dlugosc: number | null;
    sezon: string | null;
    umowa: number | null;
    Od: string | null;
    Do: string | null;
    Kwota: number | null;
    Oddana: string | null;
    Liczba_dni: number | null;
}

export const historyService = {
    /**
     * Wyszukuje klientów po nazwisku
     */
    async searchClients(nazwisko: string): Promise<ClientSearchResult[]> {
        if (!nazwisko || nazwisko.trim().length < 2) return [];

        const pool = await getHistoryDBConnection();
        const [rows] = await pool.execute<QueryResult<ClientRow>>(
            `SELECT DISTINCT k.Klient, k.Nazwisko, k.Imie, k.Telefon 
       FROM id_klient_old k
       INNER JOIN id_daty_old d ON k.Klient = d.Klient
       WHERE k.Nazwisko LIKE ? 
       ORDER BY k.Nazwisko, k.Imie 
       LIMIT 50`,
            [`%${nazwisko}%`]
        );

        return rows.map(row => ({
            id: row.Klient,
            nazwisko: row.Nazwisko || '',
            imie: row.Imie || '',
            telefon: row.Telefon || '',
            pelna_nazwa: `${row.Imie || ''} ${row.Nazwisko || ''}`.trim() || 'Brak nazwy'
        }));
    },

    /**
     * Pobiera daty dla danego klienta
     */
    async getClientDates(clientId: number): Promise<ClientDate[]> {
        const pool = await getHistoryDBConnection();
        const [rows] = await pool.execute<QueryResult<ClientDateRow>>(
            `SELECT DISTINCT Od, Do, sezon, COUNT(*) as liczba_pozycji
       FROM id_daty_old
       WHERE Klient = ?
       GROUP BY sezon, Od, Do
       ORDER BY sezon DESC, Od DESC`,
            [clientId]
        );

        return rows.map(row => ({
            od: row.Od || '',
            do: row.Do || '',
            od_iso: convertDateToISO(row.Od),
            do_iso: convertDateToISO(row.Do),
            sezon: row.sezon || '',
            liczba_pozycji: row.liczba_pozycji || 0
        }));
    },

    /**
     * Pobiera sprzęt dla danego klienta w określonym okresie
     */
    async getClientEquipment(clientId: number, od: string, doDate: string, sezon?: string): Promise<ClientEquipment[]> {
        const pool = await getHistoryDBConnection();

        let query = `
      SELECT d.*, k.Nazwisko, k.Imie, k.Telefon, s.Symbol, s.Nazwa, s.Dlugosc, d.sezon
      FROM id_daty_old d
      LEFT JOIN id_klient_old k ON d.Klient = k.Klient
      LEFT JOIN id_sprzet_old s ON (d.umowa = s.umowa AND d.sezon = s.sezon)
      WHERE d.Klient = ? AND d.Od = ? AND d.Do = ?
    `;

        const params: (string | number)[] = [clientId, od, doDate];

        if (sezon) {
            query += ` AND d.sezon = ?`;
            params.push(sezon);
        }

        query += ` ORDER BY s.Nazwa, s.Symbol`;

        const [rows] = await pool.execute<QueryResult<ClientEquipmentRow>>(query, params);

        return rows.map(row => {
            const oddanaValue = row.Oddana ? String(row.Oddana).trim().toLowerCase() : '';
            let status = '';
            if (['prawda', 'true', '1'].includes(oddanaValue)) status = 'Oddane';
            else if (['fałsz', 'falsz', 'false', '0'].includes(oddanaValue)) status = 'Nie oddane';

            return {
                klient: `${row.Imie || ''} ${row.Nazwisko || ''}`.trim() || 'Brak nazwy',
                sprzet: row.Nazwa || '',
                kod: row.Symbol || '',
                od: convertDateToISO(row.Od),
                do: convertDateToISO(row.Do),
                cena: row.Kwota ? row.Kwota.toString() : '0',
                zaplacono: '0',
                numer: row.umowa ? row.umowa.toString() : '',
                typumowy: 'STANDARD',
                uwagi: row.Oddana === 'prawda' ? 'Oddana' : (row.Oddana === 'fałsz' ? 'Nie oddana' : ''),
                status: status,
                source: 'history',
                dlugosc: row.Dlugosc || null,
                liczba_dni: row.Liczba_dni || 0
            };
        });
    }
};






