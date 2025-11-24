/**
 * Winston Logger Configuration
 * Centralna konfiguracja systemu logowania dla aplikacji
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './env.js';

// Format logów - czytelny format z timestampem
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Dodaj metadata jeśli istnieje
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        // Dodaj stack trace dla błędów
        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Transporty - gdzie zapisywać logi
const transports = [
    // Console - kolorowe logi w konsoli (development)
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }),

    // Plik - wszystkie logi z rotacją dzienną
    new DailyRotateFile({
        filename: `${config.logDir}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d', // Przechowuj 30 dni
        format: logFormat
    }),

    // Plik - tylko błędy z rotacją dzienną
    new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '90d', // Błędy przechowuj 90 dni
        format: logFormat
    })
];

// Tworzenie loggera
const logger = winston.createLogger({
    level: config.logLevel || 'info',
    transports
});

// Helper methods dla łatwiejszego użycia
logger.logInfo = (message, meta = {}) => logger.info(message, meta);
logger.logError = (message, error, meta = {}) => {
    logger.error(message, {
        ...meta,
        error: error?.message || error,
        stack: error?.stack
    });
};
logger.logWarn = (message, meta = {}) => logger.warn(message, meta);
logger.logDebug = (message, meta = {}) => logger.debug(message, meta);

export default logger;
