/**
 * src/server/services/equipmentService.ts: Serwis do obsługi sprzętu narciarskiego
 * Pobiera sprzęt z FireSnow API lub CSV fallback
 */

import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';
import { mapFireSnowToSkiData } from '../utils/equipmentMapper.js';
import logger from '../config/logger.js';
import type { Equipment, CreateEquipmentData, UpdateEquipmentData } from '../types/services.types.js';

/**
 * Definicja grup sprzętu
 */
interface EquipmentGroup {
    id: number;
    name: string;
    type: 'NARTY' | 'BUTY' | 'DESKI' | 'BUTY_SNOWBOARD';
    category: 'VIP' | 'TOP' | 'JUNIOR' | 'DOROSLE' | '';
}

export const equipmentService = {
    /**
     * Pobiera wszystkie urządzenia
     */
    async getAll(): Promise<Equipment[]> {
        if (config.useFireSnowApi) {
            try {
                const fireSnowData = await fireSnowService.getAllEquipment();
                logger.info(`Received ${fireSnowData.length} equipment records from API`);

                // Definition of groups (same as original)
                const groups: EquipmentGroup[] = [
                    { id: 82293, name: 'NARTY TOP', type: 'NARTY', category: 'TOP' },
                    { id: 82412, name: 'NARTY VIP', type: 'NARTY', category: 'VIP' },
                    { id: 82758, name: 'NARTY JUNIOR', type: 'NARTY', category: 'JUNIOR' },
                    { id: 82738, name: 'BUTY DOROSLE', type: 'BUTY', category: 'DOROSLE' },
                    { id: 82827, name: 'BUTY JUNIOR', type: 'BUTY', category: 'JUNIOR' },
                    { id: 83762, name: 'SNOWBOARD DESKI', type: 'DESKI', category: '' },
                    { id: 83760, name: 'SNOWBOARD BUTY S', type: 'BUTY_SNOWBOARD', category: '' }
                ];

                const allEquipment: Equipment[] = [];

                for (const group of groups) {
                    const groupData = fireSnowData.filter(item => (item.parent_group_id as number) === group.id);

                    // Preserve detailed logging for HEAD SHAPE in TOP group
                    if (group.id === 82293) {
                        const headShapeItems = groupData.filter(item =>
                            item.nazwa_sprzetu && String(item.nazwa_sprzetu).toUpperCase().includes('HEAD SHAPE')
                        );
                        if (headShapeItems.length > 0) {
                            logger.info(`Found ${headShapeItems.length} HEAD SHAPE items in ${group.name}`);
                        }
                    }

                    const mappedGroupData = groupData.map(item => mapFireSnowToSkiData(item));
                    allEquipment.push(...mappedGroupData);
                }

                logger.info(`Total mapped equipment: ${allEquipment.length}`);
                return allEquipment;

            } catch (error) {
                const err = error as Error;
                logger.warn('FireSnow API unavailable, fallback to CSV', { error: err.message });
            }
        }

        logger.info('Loading equipment from CSV');
        const csvData = await csvService.getSkis();
        return csvData as unknown as Equipment[];
    },

    /**
     * Tworzy nowy sprzęt
     */
    async create(data: CreateEquipmentData): Promise<Equipment> {
        const csvData = await csvService.getSkis();
        const skis = csvData as unknown as Equipment[];

        // Generate ID
        const maxId = Math.max(...skis.map(ski => parseInt(ski.ID) || 0), 0);
        const newId = (maxId + 1).toString();

        // Generate Code
        let newKod = data.KOD || '';
        if (!newKod) {
            const existingCodes = skis.map(ski => ski.KOD).filter(Boolean);
            let codeNum = 1;
            do {
                newKod = `NEW_${String(codeNum).padStart(3, '0')}`;
                codeNum++;
            } while (existingCodes.includes(newKod));
        }

        const newSki: Equipment = {
            ID: newId,
            TYP_SPRZETU: data.TYP_SPRZETU || 'NARTY',
            KATEGORIA: data.KATEGORIA || '',
            MARKA: data.MARKA || '',
            MODEL: data.MODEL || '',
            DLUGOSC: data.DLUGOSC || 0,
            ILOSC: 1,
            POZIOM: data.POZIOM,
            PLEC: data.PLEC || 'U',
            WAGA_MIN: data.WAGA_MIN,
            WAGA_MAX: data.WAGA_MAX,
            WZROST_MIN: data.WZROST_MIN,
            WZROST_MAX: data.WZROST_MAX,
            PRZEZNACZENIE: data.PRZEZNACZENIE || '',
            ATUTY: data.ATUTY || '',
            KOD: newKod
        };

        skis.push(newSki);
        await csvService.saveSkis(skis);
        return newSki;
    },

    /**
     * Aktualizuje istniejący sprzęt
     */
    async update(id: string, data: UpdateEquipmentData): Promise<Equipment | null> {
        const csvData = await csvService.getSkis();
        const skis = csvData as unknown as Equipment[];
        const index = skis.findIndex(ski => ski.ID === id);

        if (index === -1) return null;

        const updated = { ...skis[index]!, ...data };
        skis[index] = updated;
        await csvService.saveSkis(skis);
        return updated;
    },

    /**
     * Masowa aktualizacja wielu sprzętów
     */
    async bulkUpdate(ids: string[], updates: Partial<UpdateEquipmentData>): Promise<Equipment[]> {
        const csvData = await csvService.getSkis();
        const skis = csvData as unknown as Equipment[];
        const updatedSkis: Equipment[] = [];

        // Protect ID and KOD
        const safeUpdates = { ...updates };
        delete safeUpdates.ID;
        delete safeUpdates.KOD;

        ids.forEach(id => {
            const index = skis.findIndex(ski => ski.ID === id);
            if (index !== -1) {
                const updated = { ...skis[index]!, ...safeUpdates };
                skis[index] = updated;
                updatedSkis.push(updated);
            }
        });

        if (updatedSkis.length > 0) {
            await csvService.saveSkis(skis);
        }

        return updatedSkis;
    }
};



