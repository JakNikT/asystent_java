/**
 * src/server/types/database.types.ts: Typy dla zapytań MySQL i wyników
 */

import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

/**
 * Typ dla połączenia z bazą danych
 */
export type DBConnection = Pool;

/**
 * Typ dla pojedynczego połączenia z puli
 */
export type DBConnectionSingle = PoolConnection;

/**
 * Typ dla wyników zapytania SELECT (wiersze danych)
 */
export type QueryResult<T = RowDataPacket> = T[];

/**
 * Typ dla wyników zapytania INSERT/UPDATE/DELETE
 */
export type QueryResultHeader = ResultSetHeader;

/**
 * Typ dla wyników zapytania z informacjami o zmianach
 */
export interface QueryResultWithInfo<T = RowDataPacket> {
  rows: QueryResult<T>;
  affectedRows: number;
  insertId?: number;
}

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






