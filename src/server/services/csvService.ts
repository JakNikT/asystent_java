/**
 * src/server/services/csvService.ts: Serwis do obsługi plików CSV
 * Odczyt, parsowanie i zapis danych CSV z obsługą formatu FireFnow
 */

import fs from 'fs/promises';
import Papa from 'papaparse';
import { config } from '../config/env.js';
import { detectFirefnowFormat, convertFromFirefnow } from '../utils/csvParser.js';
import logger from '../config/logger.js';

/**
 * Opcje parsowania CSV
 */
interface ParseOptions {
    header?: boolean;
    skipEmptyLines?: boolean;
    delimiter?: string;
    transformHeader?: (header: string) => string;
    [key: string]: unknown;
}

/**
 * Opcje zapisu CSV
 */
interface UnparseOptions {
    delimiter?: string;
    header?: boolean;
    columns?: string[];
    [key: string]: unknown;
}

export const csvService = {
    /**
     * Czyta zawartość pliku CSV
     */
    async readCsv(filePath: string): Promise<string> {
        try {
            logger.info('Reading CSV:', { filePath });
            const csvContent = await fs.readFile(filePath, 'utf-8');

            // Detect and fix FireFnow format
            let processedContent = csvContent;
            if (detectFirefnowFormat(csvContent)) {
                logger.info('Detected FireFnow format - converting...');
                processedContent = convertFromFirefnow(csvContent);
            }

            return processedContent;
        } catch (error) {
            logger.error('Error reading CSV', { error });
            throw error;
        }
    },

    /**
     * Parsuje plik CSV do obiektów JavaScript
     */
    async parseCsv(filePath: string, options: ParseOptions = {}): Promise<Papa.ParseResult<Record<string, unknown>>> {
        const content = await this.readCsv(filePath);
        return Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            ...options
        });
    },

    /**
     * Zapisuje dane do pliku CSV
     */
    async writeCsv(filePath: string, data: unknown[], options: UnparseOptions = {}): Promise<boolean> {
        try {
            logger.info(`Writing ${data.length} records to CSV`, { filePath });
            const csvContent = Papa.unparse(data, {
                delimiter: ',',
                header: true,
                ...options
            });

            await fs.writeFile(filePath, csvContent, 'utf-8');
            return true;
        } catch (error) {
            logger.error('Error writing CSV', { error });
            return false;
        }
    },

    /**
     * Pobiera rezerwacje z pliku CSV
     */
    async getReservations(): Promise<Record<string, unknown>[]> {
        const result = await this.parseCsv(config.paths.reservationsCsv, {
            transformHeader: (header: string) => {
                const headerMap: Record<string, string> = {
                    'Od': 'od', 'Do': 'do', 'Klient': 'klient', 'Kod': 'kod',
                    'Cena': 'cena', 'Rabat': 'rabat', 'Użytkownik': 'uzytkownik',
                    'Sprzęt': 'sprzet', 'Zapłacono': 'zaplacono'
                };
                return headerMap[header] || header.toLowerCase();
            }
        });
        return result.data as Record<string, unknown>[];
    },

    /**
     * Pobiera wypożyczenia z pliku CSV
     */
    async getRentals(): Promise<Record<string, unknown>[]> {
        const result = await this.parseCsv(config.paths.rentalsCsv, {
            transformHeader: (header: string) => {
                const headerMap: Record<string, string> = {
                    'Klient': 'klient', 'Sprzęt': 'sprzet', 'Sprzt': 'sprzet',
                    'Kod': 'kod', 'Rozpoczęto': 'od', 'Rozpoczto': 'od',
                    'Koniec': 'do', 'Pozostało': 'pozostalo', 'Pozostao': 'pozostalo',
                    'Gratis': 'gratis', 'Cena': 'cena', 'Rabat': 'rabat',
                    'Rabat %': 'rabat_procent', 'Zapłacono': 'zaplacono', 'Zapacono': 'zaplacono',
                    'Uwagi': 'uwagi', 'Użytkownik': 'uzytkownik', 'Uytkownik': 'uzytkownik'
                };
                return headerMap[header] || header.toLowerCase();
            }
        });
        return result.data as Record<string, unknown>[];
    },

    /**
     * Pobiera sprzęt z pliku CSV
     */
    async getSkis(): Promise<Record<string, unknown>[]> {
        const result = await this.parseCsv(config.paths.skisCsv);
        return result.data as Record<string, unknown>[];
    },

    /**
     * Zapisuje rezerwacje do pliku CSV
     */
    async saveReservations(reservations: unknown[]): Promise<boolean> {
        return this.writeCsv(config.paths.reservationsCsv, reservations);
    },

    /**
     * Zapisuje sprzęt do pliku CSV
     */
    async saveSkis(skis: unknown[]): Promise<boolean> {
        return this.writeCsv(config.paths.skisCsv, skis, {
            columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'KOD']
        });
    }
};
