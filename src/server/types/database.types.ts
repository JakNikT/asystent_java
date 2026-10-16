/**
 * src/server/types/database.types.ts: Typy dla zapytań MySQL i wyników
 */

import type { Pool, RowDataPacket } from 'mysql2/promise';

/**
 * Typ dla połączenia z bazą danych
 */
export type DBConnection = Pool;

/**
 * Typ dla wyników zapytania SELECT (wiersze danych)
 */
export type QueryResult<T = RowDataPacket> = T[];

/**
 * Typ dla konfiguracji połączenia z bazą danych
 */
export interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  historyDatabase: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}






