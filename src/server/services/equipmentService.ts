/**
 * src/server/services/equipmentService.ts: Serwis do obsługi sprzętu narciarskiego
 * Pobiera sprzęt z FireSnow API lub CSV fallback
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { getDBConnection } from '../config/database.js';
import { mapFireSnowToSkiData } from '../utils/equipmentMapper.js';
import logger from '../config/logger.js';
import type { Equipment, UpdateEquipmentData } from '../types/services.types.js';
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

/**
 * Pobiera mapę nadpisań parametrów z bazy MySQL
 */
async function getOverridesMap(): Promise<{ byId: Map<string, OverrideRow>; byCode: Map<string, OverrideRow> }> {
    const byId = new Map<string, OverrideRow>();
    const byCode = new Map<string, OverrideRow>();

    try {
        const pool = await getDBConnection();
        const [rows] = await pool.query<OverrideRow[]>(
            'SELECT id, kod, wzrost_min, wzrost_max, waga_min, waga_max, poziom, plec, przeznaczenie, atuty, kategoria, typ_sprzetu, marka, model, dlugosc FROM equipment_overrides'
        );

        for (const row of rows) {
            if (row.id) byId.set(row.id, row);
            if (row.kod) byCode.set(row.kod, row);
        }
    } catch (error) {
        const err = error as Error;
        logger.warn('equipmentService: Nie udało się pobrać nadpisań z MySQL', { error: err.message });
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

export const equipmentService = {
    /**
     * Pobiera wszystkie pozycje sprzętu (z FireSnow API) wzbogacone o parametry z MySQL
     */
    async getAll(): Promise<Equipment[]> {
        if (!config.useFireSnowApi) {
            logger.warn('equipmentService: Tryb FireSnow API wyłączony w konfiguracji');
            return [];
        }

        try {
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
        // Znajdź bieżący sprzęt w FireSnow
        const all = await this.getAll();
        const current = all.find(s => s.ID === id || (data.KOD && s.KOD === data.KOD));
        if (!current) {
            logger.warn('equipmentService: Nie znaleziono sprzętu do edycji', { id, kod: data.KOD });
            return null;
        }

        const kod = data.KOD || current.KOD || null;
        const wzrost_min = data.WZROST_MIN !== undefined ? data.WZROST_MIN : (current.WZROST_MIN ?? null);
        const wzrost_max = data.WZROST_MAX !== undefined ? data.WZROST_MAX : (current.WZROST_MAX ?? null);
        const waga_min = data.WAGA_MIN !== undefined ? data.WAGA_MIN : (current.WAGA_MIN ?? null);
        const waga_max = data.WAGA_MAX !== undefined ? data.WAGA_MAX : (current.WAGA_MAX ?? null);
        const poziom = data.POZIOM !== undefined ? data.POZIOM : (current.POZIOM ?? null);
        const plec = data.PLEC !== undefined ? data.PLEC : (current.PLEC ?? null);
        const przeznaczenie = data.PRZEZNACZENIE !== undefined ? data.PRZEZNACZENIE : (current.PRZEZNACZENIE ?? null);
        const atuty = data.ATUTY !== undefined ? data.ATUTY : (current.ATUTY ?? null);
        const kategoria = data.KATEGORIA !== undefined ? data.KATEGORIA : (current.KATEGORIA ?? null);
        const typ_sprzetu = data.TYP_SPRZETU !== undefined ? data.TYP_SPRZETU : (current.TYP_SPRZETU ?? null);
        const marka = data.MARKA !== undefined ? data.MARKA : (current.MARKA ?? null);
        const model = data.MODEL !== undefined ? data.MODEL : (current.MODEL ?? null);
        const dlugosc = data.DLUGOSC !== undefined ? data.DLUGOSC : (current.DLUGOSC ?? null);

        const pool = await getDBConnection();
        const sql = `
            INSERT INTO equipment_overrides
                (id, kod, wzrost_min, wzrost_max, waga_min, waga_max, poziom, plec, przeznaczenie, atuty, kategoria, typ_sprzetu, marka, model, dlugosc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                kod = VALUES(kod),
                wzrost_min = VALUES(wzrost_min),
                wzrost_max = VALUES(wzrost_max),
                waga_min = VALUES(waga_min),
                waga_max = VALUES(waga_max),
                poziom = VALUES(poziom),
                plec = VALUES(plec),
                przeznaczenie = VALUES(przeznaczenie),
                atuty = VALUES(atuty),
                kategoria = VALUES(kategoria),
                typ_sprzetu = VALUES(typ_sprzetu),
                marka = VALUES(marka),
                model = VALUES(model),
                dlugosc = VALUES(dlugosc)
        `;

        await pool.query(sql, [
            current.ID,
            kod,
            wzrost_min,
            wzrost_max,
            waga_min,
            waga_max,
            poziom,
            plec,
            przeznaczenie,
            atuty,
            kategoria,
            typ_sprzetu,
            marka,
            model,
            dlugosc
        ]);

        logger.info('equipmentService: Zapisano parametry sprzętu w MySQL', { id: current.ID, kod });

        return {
            ...current,
            ...data,
            ID: current.ID,
            KOD: kod || current.KOD
        };
    },

    /**
     * Masowa aktualizacja wielu pozycji sprzętu w MySQL
     */
    async bulkUpdate(ids: string[], updates: Partial<UpdateEquipmentData>): Promise<Equipment[]> {
        const updatedSkis: Equipment[] = [];

        // Chroń ID i KOD przed masowym nadpisaniem
        const safeUpdates = { ...updates };
        delete safeUpdates.ID;
        delete safeUpdates.KOD;

        for (const id of ids) {
            const updated = await this.update(id, safeUpdates);
            if (updated) {
                updatedSkis.push(updated);
            }
        }

        logger.info(`equipmentService: Zaktualizowano masowo ${updatedSkis.length} pozycji sprzętu w MySQL`);
        return updatedSkis;
    }
};






