/**
 * src/server/config/database.ts: Konfiguracja połączeń z bazą danych MySQL
 * Zarządza pulami połączeń dla głównej bazy danych i bazy historii
 */

import mysql from 'mysql2/promise';
import { config } from './env.js';
import logger from './logger.js';
import type { DBConnection } from '../types/database.types.js';

// Main Database Pool
let pool: DBConnection | null = null;

/**
 * Pobiera pulę połączeń do głównej bazy danych
 * Tworzy nową pulę jeśli jeszcze nie istnieje
 */
export async function getDBConnection(): Promise<DBConnection> {
    if (!pool) {
        pool = mysql.createPool({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            waitForConnections: config.db.waitForConnections,
            connectionLimit: config.db.connectionLimit,
            queueLimit: config.db.queueLimit
        });
        logger.info('src/server/config/database.ts: Utworzono pool połączeń MySQL');
    }
    return pool;
}

// History Database Pool
let historyPool: DBConnection | null = null;

/**
 * Pobiera pulę połączeń do bazy danych historii
 * Tworzy nową pulę jeśli jeszcze nie istnieje
 */
export async function getHistoryDBConnection(): Promise<DBConnection> {
    if (!historyPool) {
        historyPool = mysql.createPool({
            host: config.db.host,
            user: config.db.user,
            password: config.db.password,
            database: config.db.historyDatabase,
            waitForConnections: config.db.waitForConnections,
            connectionLimit: config.db.connectionLimit,
            queueLimit: config.db.queueLimit
        });
        logger.info('src/server/config/database.ts: Utworzono pool połączeń MySQL dla historii (history)');
    }
    return historyPool;
}




