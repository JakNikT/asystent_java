/**
 * src/server/services/equipmentService.ts: Serwis do obsługi sprzętu narciarskiego
 * Pobiera sprzęt z FireSnow API i nakłada nadpisania z MySQL
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { getDBConnection } from '../config/database.js';
import { mapFireSnowToSkiData } from '../utils/equipmentMapper.js';
import logger from '../config/logger.js';
import type { Equipment, UpdateEquipmentData } from '../types/services.types.js';
import type { DBConnection } from '../types/database.types.js';
import type { RowDataPacket } from 'mysql2/promise';

/**
 * Definicja grup sprzętu aktualnego sezonu (SPRZĘT27)
 */
interface EquipmentGroup {
    id: number;
    name: string;
    type: 'NARTY' | 'BUTY' | 'DESKI' | 'BUTY_SNOWBOARD';
    category: 'VIP' | 'TOP' | 'JUNIOR' | 'DOROSLE' | '';
}

const GROUPS: EquipmentGroup[] = [
    { id: 130615, name: 'NARTY TOP', type: 'NARTY', category: 'TOP' },
    { id: 130679, name: 'NARTY VIP', type: 'NARTY', category: 'VIP' },
    { id: 131174, name: 'NARTY JUNIOR', type: 'NARTY', category: 'JUNIOR' },
    { id: 131361, name: 'BUTY DOROSLE', type: 'BUTY', category: 'DOROSLE' },
    { id: 131364, name: 'BUTY JUNIOR', type: 'BUTY', category: 'JUNIOR' },
    { id: 131534, name: 'SNOWBOARD DESKI', type: 'DESKI', category: '' },
    { id: 131533, name: 'SNOWBOARD BUTY S', type: 'BUTY_SNOWBOARD', category: '' }
];

interface OverrideRow extends RowDataPacket {
    id: string;
    kod: string | null;
    wzrost_min: number | null;
    wzrost_max: number | null;
    waga_min: number | null;
    waga_max: number | null;
    poziom: string | null;
    plec: string | null;
    przeznaczenie: string | null;
    atuty: string | null;
    kategoria: string | null;
    typ_sprzetu: string | null;
    marka: string | null;
    model: string | null;
    dlugosc: number | null;
}

let tableInitialized = false;
let lastInitAttempt = 0;
let lastOverridesWarning = 0;
const RETRY_INTERVAL_MS = 60_000;

/**
 * Pola nadpisywalne: pole API -> kolumna equipment_overrides (jawna biała lista).
 * Nazwy kolumn do SQL pochodzą wyłącznie stąd, nigdy z kluczy żądania.
 */
const OVERRIDE_FIELDS = [
    ['WZROST_MIN', 'wzrost_min'],
    ['WZROST_MAX', 'wzrost_max'],
    ['WAGA_MIN', 'waga_min'],
    ['WAGA_MAX', 'waga_max'],
    ['POZIOM', 'poziom'],
    ['PLEC', 'plec'],
    ['PRZEZNACZENIE', 'przeznaczenie'],
    ['ATUTY', 'atuty'],
    ['KATEGORIA', 'kategoria'],
    ['TYP_SPRZETU', 'typ_sprzetu'],
    ['MARKA', 'marka'],
    ['MODEL', 'model'],
    ['DLUGOSC', 'dlugosc']
] as const satisfies ReadonlyArray<readonly [keyof UpdateEquipmentData, string]>;

async function ensureTableExists(pool: DBConnection): Promise<void> {
    if (tableInitialized) return;
    // Po niepowodzeniu nie próbuj ponownie częściej niż co RETRY_INTERVAL_MS
    const now = Date.now();
    if (now - lastInitAttempt < RETRY_INTERVAL_MS) return;
    lastInitAttempt = now;
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS equipment_overrides (
                id VARCHAR(50) NOT NULL,
                kod VARCHAR(50) DEFAULT NULL,
                wzrost_min INT DEFAULT NULL,
                wzrost_max INT DEFAULT NULL,
                waga_min INT DEFAULT NULL,
                waga_max INT DEFAULT NULL,
                poziom VARCHAR(20) DEFAULT NULL,
                plec VARCHAR(10) DEFAULT NULL,
                przeznaczenie VARCHAR(50) DEFAULT NULL,
                atuty VARCHAR(255) DEFAULT NULL,
                kategoria VARCHAR(50) DEFAULT NULL,
                typ_sprzetu VARCHAR(50) DEFAULT NULL,
                marka VARCHAR(100) DEFAULT NULL,
                model VARCHAR(200) DEFAULT NULL,
                dlugosc DECIMAL(5,1) DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_kod (kod)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(sql);
        tableInitialized = true;
    } catch (e) {
        logger.warn('equipmentService: Nie udało się automatycznie zainicjalizować tabeli equipment_overrides', { error: (e as Error).message });
    }
}

/**
 * Pobiera mapę nadpisań parametrów z bazy MySQL
 */
async function getOverridesMap(): Promise<{ byId: Map<string, OverrideRow>; byCode: Map<string, OverrideRow> }> {
    const byId = new Map<string, OverrideRow>();
    const byCode = new Map<string, OverrideRow>();

    try {
        const pool = await getDBConnection();
        await ensureTableExists(pool);
        const [rows] = await pool.query<OverrideRow[]>(
            'SELECT id, kod, wzrost_min, wzrost_max, waga_min, waga_max, poziom, plec, przeznaczenie, atuty, kategoria, typ_sprzetu, marka, model, dlugosc FROM equipment_overrides'
        );

        for (const row of rows) {
            if (row.id) byId.set(row.id, row);
            if (row.kod) byCode.set(row.kod, row);
        }
    } catch (error) {
        const err = error as Error;
        // Nie loguj ostrzeżenia przy każdym GET /skis
        const now = Date.now();
        if (now - lastOverridesWarning >= RETRY_INTERVAL_MS) {
            lastOverridesWarning = now;
            logger.warn('equipmentService: Nie udało się pobrać nadpisań z MySQL', { error: err.message });
        }
    }

    return { byId, byCode };
}

/**
 * Aplikuje nadpisanie z bazy MySQL na sprzęt z FireSnow
 */
function applyOverride(item: Equipment, override: OverrideRow): Equipment {
    return {
        ...item,
        WZROST_MIN: override.wzrost_min !== null && override.wzrost_min !== undefined ? override.wzrost_min : item.WZROST_MIN,
        WZROST_MAX: override.wzrost_max !== null && override.wzrost_max !== undefined ? override.wzrost_max : item.WZROST_MAX,
        WAGA_MIN: override.waga_min !== null && override.waga_min !== undefined ? override.waga_min : item.WAGA_MIN,
        WAGA_MAX: override.waga_max !== null && override.waga_max !== undefined ? override.waga_max : item.WAGA_MAX,
        POZIOM: override.poziom !== null && override.poziom !== undefined && override.poziom !== '' ? override.poziom : item.POZIOM,
        PLEC: (override.plec as 'M' | 'K' | 'U') || item.PLEC,
        PRZEZNACZENIE: override.przeznaczenie !== null && override.przeznaczenie !== undefined && override.przeznaczenie !== '' ? override.przeznaczenie : item.PRZEZNACZENIE,
        ATUTY: override.atuty !== null && override.atuty !== undefined && override.atuty !== '' ? override.atuty : item.ATUTY,
        KATEGORIA: override.kategoria || item.KATEGORIA,
        TYP_SPRZETU: override.typ_sprzetu || item.TYP_SPRZETU,
        MARKA: override.marka || item.MARKA,
        MODEL: override.model || item.MODEL,
        DLUGOSC: override.dlugosc !== null && override.dlugosc !== undefined ? Number(override.dlugosc) : item.DLUGOSC
    };
}

/**
 * Pobiera sprzęt z FireSnow i nakłada nadpisania z MySQL. Przy błędzie FireSnow rzuca wyjątek.
 */
async function fetchMergedEquipment(): Promise<Equipment[]> {
    if (!config.useFireSnowApi) {
        logger.warn('equipmentService: Tryb FireSnow API wyłączony w konfiguracji');
        return [];
    }

    const fireSnowData = await fireSnowService.getAllEquipment();
    logger.info(`equipmentService: Pobrano ${fireSnowData.length} rekordów sprzętu z FireSnow API`);

    const allEquipment: Equipment[] = [];

    for (const group of GROUPS) {
        const groupData = fireSnowData.filter(item => (item.parent_group_id as number) === group.id);

        if (groupData.length > 0) {
            const mappedGroupData = groupData.map(item => mapFireSnowToSkiData(item));
            allEquipment.push(...mappedGroupData);
        }
    }

    // Pobierz nadpisania z MySQL i wzbogać sprzęt
    const { byId, byCode } = await getOverridesMap();

    const enrichedEquipment = allEquipment.map(item => {
        const override = byId.get(item.ID) || (item.KOD ? byCode.get(item.KOD) : undefined);
        if (override) {
            return applyOverride(item, override);
        }
        return item;
    });

    logger.info(`equipmentService: Łącznie zmapowano ${enrichedEquipment.length} sztuk sprzętu (nadpisano z MySQL: ${byId.size} ID)`);
    return enrichedEquipment;
}

/**
 * Zapisuje w MySQL wyłącznie pola przekazane w `data` (!== undefined), nie przypinając reszty
 */
async function applyUpdate(current: Equipment, data: UpdateEquipmentData): Promise<Equipment> {
    const kod = data.KOD ?? current.KOD ?? null;

    const columns: string[] = ['id', 'kod'];
    const values: Array<string | number | null> = [current.ID, kod];
    const changes: Partial<Equipment> = {};

    for (const [field, column] of OVERRIDE_FIELDS) {
        const value = data[field];
        if (value === undefined) continue;
        columns.push(column);
        values.push(value);
        // null czyści nadpisanie (wartość wraca do FireSnow przy następnym odczycie)
        if (value !== null) Object.assign(changes, { [field]: value });
    }

    const placeholders = columns.map(() => '?').join(', ');
    const updateClause = columns.filter(column => column !== 'id').map(column => `${column} = VALUES(${column})`).join(', ');

    const pool = await getDBConnection();
    await ensureTableExists(pool);
    await pool.query(
        `INSERT INTO equipment_overrides (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`,
        values
    );

    logger.info('equipmentService: Zapisano parametry sprzętu w MySQL', { id: current.ID, kod, fields: columns.length - 2 });

    return { ...current, ...changes, ID: current.ID, KOD: kod || current.KOD };
}

export const equipmentService = {
    /**
     * Pobiera wszystkie pozycje sprzętu (z FireSnow API) wzbogacone o parametry z MySQL
     */
    async getAll(): Promise<Equipment[]> {
        try {
            return await fetchMergedEquipment();
        } catch (error) {
            const err = error as Error;
            logger.error('equipmentService: Błąd pobierania sprzętu z FireSnow API', { error: err.message });
            return [];
        }
    },

    /**
     * Aktualizuje parametry sprzętu i zapisuje je w MySQL (equipment_overrides)
     */
    async update(id: string, data: UpdateEquipmentData): Promise<Equipment | null> {
        const all = await fetchMergedEquipment();
        const current = all.find(s => s.ID === id);
        if (!current) {
            logger.warn('equipmentService: Nie znaleziono sprzętu do edycji', { id });
            return null;
        }

        return applyUpdate(current, data);
    },

    /**
     * Masowa aktualizacja wielu pozycji sprzętu w MySQL
     */
    async bulkUpdate(ids: string[], updates: Partial<UpdateEquipmentData>): Promise<Equipment[]> {
        // Chroń ID i KOD przed masowym nadpisaniem
        const safeUpdates = { ...updates };
        delete safeUpdates.ID;
        delete safeUpdates.KOD;

        const all = await fetchMergedEquipment();
        const updatedSkis: Equipment[] = [];

        for (const id of ids) {
            const current = all.find(s => s.ID === id);
            if (!current) {
                logger.warn('equipmentService: Nie znaleziono sprzętu do edycji', { id });
                continue;
            }
            updatedSkis.push(await applyUpdate(current, safeUpdates));
        }

        logger.info(`equipmentService: Zaktualizowano masowo ${updatedSkis.length} pozycji sprzętu w MySQL`);
        return updatedSkis;
    }
};






