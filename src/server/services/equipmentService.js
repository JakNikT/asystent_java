import { config } from '../config/env.js';
import { fireSnowService } from './fireSnowService.js';
import { csvService } from './csvService.js';
import { mapFireSnowToSkiData, parseEquipmentName } from '../utils/equipmentMapper.js';
import logger from '../config/logger.js';

export const equipmentService = {
    async getAll() {
        if (config.useFireSnowApi) {
            try {
                const fireSnowData = await fireSnowService.getAllEquipment();
                logger.info(`Received ${fireSnowData.length} equipment records from API`);

                // Definition of groups (same as original)
                const groups = [
                    { id: 82293, name: 'NARTY TOP', type: 'NARTY', category: 'TOP' },
                    { id: 82412, name: 'NARTY VIP', type: 'NARTY', category: 'VIP' },
                    { id: 82758, name: 'NARTY JUNIOR', type: 'NARTY', category: 'JUNIOR' },
                    { id: 82738, name: 'BUTY DOROSLE', type: 'BUTY', category: 'DOROSLE' },
                    { id: 82827, name: 'BUTY JUNIOR', type: 'BUTY', category: 'JUNIOR' },
                    { id: 83762, name: 'SNOWBOARD DESKI', type: 'DESKI', category: '' },
                    { id: 83760, name: 'SNOWBOARD BUTY S', type: 'BUTY_SNOWBOARD', category: '' }
                ];

                const allEquipment = [];

                for (const group of groups) {
                    const groupData = fireSnowData.filter(item => item.parent_group_id === group.id);

                    // Preserve detailed logging for HEAD SHAPE in TOP group
                    if (group.id === 82293) {
                        const headShapeItems = groupData.filter(item =>
                            item.nazwa_sprzetu && item.nazwa_sprzetu.toUpperCase().includes('HEAD SHAPE')
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
                logger.warn('FireSnow API unavailable, fallback to CSV', { error: error.message });
            }
        }

        logger.info('Loading equipment from CSV');
        return csvService.getSkis();
    },

    async create(data) {
        const skis = await csvService.getSkis();

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

        const newSki = {
            ID: newId,
            TYP_SPRZETU: data.TYP_SPRZETU || 'NARTY',
            KATEGORIA: data.KATEGORIA || '',
            MARKA: data.MARKA || '',
            MODEL: data.MODEL || '',
            DLUGOSC: data.DLUGOSC || 0,
            ILOSC: data.ILOSC || 1,
            POZIOM: data.POZIOM || '',
            PLEC: data.PLEC || '',
            WAGA_MIN: data.WAGA_MIN || 0,
            WAGA_MAX: data.WAGA_MAX || 0,
            WZROST_MIN: data.WZROST_MIN || 0,
            WZROST_MAX: data.WZROST_MAX || 0,
            PRZEZNACZENIE: data.PRZEZNACZENIE || '',
            ATUTY: data.ATUTY || '',
            KOD: newKod
        };

        skis.push(newSki);
        await csvService.saveSkis(skis);
        return newSki;
    },

    async update(id, data) {
        const skis = await csvService.getSkis();
        const index = skis.findIndex(ski => ski.ID === id);

        if (index === -1) return null;

        skis[index] = { ...skis[index], ...data };
        await csvService.saveSkis(skis);
        return skis[index];
    },

    async bulkUpdate(ids, updates) {
        const skis = await csvService.getSkis();
        const updatedSkis = [];

        // Protect ID and KOD
        const safeUpdates = { ...updates };
        delete safeUpdates.ID;
        delete safeUpdates.KOD;

        ids.forEach(id => {
            const index = skis.findIndex(ski => ski.ID === id);
            if (index !== -1) {
                skis[index] = { ...skis[index], ...safeUpdates };
                updatedSkis.push(skis[index]);
            }
        });

        if (updatedSkis.length > 0) {
            await csvService.saveSkis(skis);
        }

        return updatedSkis;
    }
};
