import mysql from 'mysql2/promise';
import { config } from './env.js';
import logger from './logger.js';

// Main Database Pool
let pool = null;

export async function getDBConnection() {
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
        logger.info('src/server/config/database.js: Utworzono pool połączeń MySQL');
    }
    return pool;
}

// History Database Pool
let historyPool = null;

export async function getHistoryDBConnection() {
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
        logger.info('src/server/config/database.js: Utworzono pool połączeń MySQL dla historii (history)');
    }
    return historyPool;
}
