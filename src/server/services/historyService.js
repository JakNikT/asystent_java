import { getHistoryDBConnection } from '../config/database.js';
import { convertDateToISO } from '../utils/formatters.js';

export const historyService = {
    async searchClients(nazwisko) {
        if (!nazwisko || nazwisko.trim().length < 2) return [];

        const pool = await getHistoryDBConnection();
        const [rows] = await pool.execute(
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

    async getClientDates(clientId) {
        const pool = await getHistoryDBConnection();
        const [rows] = await pool.execute(
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

    async getClientEquipment(clientId, od, doDate, sezon) {
        const pool = await getHistoryDBConnection();

        let query = `
      SELECT d.*, k.Nazwisko, k.Imie, k.Telefon, s.Symbol, s.Nazwa, s.Dlugosc, d.sezon
      FROM id_daty_old d
      LEFT JOIN id_klient_old k ON d.Klient = k.Klient
      LEFT JOIN id_sprzet_old s ON (d.umowa = s.umowa AND d.sezon = s.sezon)
      WHERE d.Klient = ? AND d.Od = ? AND d.Do = ?
    `;

        const params = [clientId, od, doDate];

        if (sezon) {
            query += ` AND d.sezon = ?`;
            params.push(sezon);
        }

        query += ` ORDER BY s.Nazwa, s.Symbol`;

        const [rows] = await pool.execute(query, params);

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
