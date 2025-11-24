import fs from 'fs/promises';
import Papa from 'papaparse';
import { config } from '../config/env.js';
import { detectFirefnowFormat, convertFromFirefnow } from '../utils/csvParser.js';

export const csvService = {
    async readCsv(filePath) {
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

    async parseCsv(filePath, options = {}) {
        const content = await this.readCsv(filePath);
        return Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            ...options
        });
    },

    async writeCsv(filePath, data, options = {}) {
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

    // Specific helpers for known files
    async getReservations() {
        const result = await this.parseCsv(config.paths.reservationsCsv, {
            transformHeader: (header) => {
                const headerMap = {
                    'Od': 'od', 'Do': 'do', 'Klient': 'klient', 'Kod': 'kod',
                    'Cena': 'cena', 'Rabat': 'rabat', 'Użytkownik': 'uzytkownik',
                    'Sprzęt': 'sprzet', 'Zapłacono': 'zaplacono'
                };
                return headerMap[header] || header.toLowerCase();
            }
        });
        return result.data;
    },

    async getRentals() {
        const result = await this.parseCsv(config.paths.rentalsCsv, {
            transformHeader: (header) => {
                const headerMap = {
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
        return result.data;
    },

    async getSkis() {
        const result = await this.parseCsv(config.paths.skisCsv);
        return result.data;
    },

    async saveReservations(reservations) {
        return this.writeCsv(config.paths.reservationsCsv, reservations);
    },

    async saveSkis(skis) {
        return this.writeCsv(config.paths.skisCsv, skis, {
            columns: ['ID', 'TYP_SPRZETU', 'KATEGORIA', 'MARKA', 'MODEL', 'DLUGOSC', 'ILOSC', 'POZIOM', 'PLEC', 'WAGA_MIN', 'WAGA_MAX', 'WZROST_MIN', 'WZROST_MAX', 'PRZEZNACZENIE', 'ATUTY', 'KOD']
        });
    }
};
