/**
 * src/server/config/env.ts: Konfiguracja środowiskowa aplikacji
 * Ładuje zmienne środowiskowe z pliku .env i waliduje wymagane wartości
 */

import dotenv from 'dotenv';
import type { DatabaseConfig } from '../types/database.types.js';

// Load .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['DB_PASSWORD', 'EMPLOYEE_PIN', 'AUTH_SECRET'] as const;
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ Błąd konfiguracji: Brakujące wymagane zmienne środowiskowe:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Wskazówka: Skopiuj plik env.example do .env i uzupełnij wartości.');
    process.exit(1);
}

const employeePin = process.env.EMPLOYEE_PIN!;
const authSecret = process.env.AUTH_SECRET!;
const configErrors: string[] = [];

if (!/^\d{4,12}$/.test(employeePin) || employeePin === '0000') {
    configErrors.push('EMPLOYEE_PIN musi składać się z 4-12 cyfr i nie może być równy 0000');
}
if (authSecret.length < 32 || authSecret === 'firesnow-asystent-jwt-secret-key-2026' || authSecret === 'change-me') {
    configErrors.push('AUTH_SECRET musi mieć co najmniej 32 znaki i nie może być wartością domyślną');
}

if (configErrors.length > 0) {
    console.error('❌ Błąd konfiguracji: Nieprawidłowe wartości zmiennych środowiskowych:');
    configErrors.forEach(message => console.error(`   - ${message}`));
    console.error('\n💡 Wskazówka: AUTH_SECRET wygenerujesz: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
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

    auth: {
        employeePin,
        secret: authSecret
    }
} as const;






