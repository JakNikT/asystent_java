/**
 * src/server/config/env.ts: Konfiguracja środowiskowa aplikacji
 * Ładuje zmienne środowiskowe z pliku .env i waliduje wymagane wartości
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DatabaseConfig } from '../types/database.types.js';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

// Validate required environment variables
const requiredEnvVars = ['DB_PASSWORD'] as const;
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Błąd konfiguracji: Brakujące wymagane zmienne środowiskowe:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Wskazówka: Skopiuj plik .env.example do .env i uzupełnij wartości.');
    process.exit(1);
}

/**
 * Konfiguracja bazy danych
 */
const dbConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD!, // REQUIRED - no fallback for security
    database: process.env.DB_NAME || 'sprzet_narciarski',
    historyDatabase: process.env.DB_HISTORY_NAME || 'history',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

/**
 * Główna konfiguracja aplikacji
 */
export const config = {
    port: Number(process.env.PORT) || 5001,
    fireSnowApiUrl: process.env.FIRESNOW_API_URL || 'http://localhost:8081',
    useFireSnowApi: process.env.USE_FIRESNOW_API === 'true',

    // Logging configuration
    logLevel: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    logDir: process.env.LOG_DIR || 'logs',

    db: dbConfig,

    paths: {
        reservationsCsv: path.join(rootDir, 'public', 'data', 'rezerwacja.csv'),
        rentalsCsv: path.join(rootDir, 'public', 'data', 'wyp.csv'),
        skisCsv: path.join(rootDir, 'public', 'data', 'NOWA_BAZA_KOMPLETNA.csv')
    }
} as const;




