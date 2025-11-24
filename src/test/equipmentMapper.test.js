import { describe, it, expect } from 'vitest';
import {
    mapGroupToEquipmentType,
    extractPlecFromPoziom,
    parseEquipmentName,
    mapFireSnowToSkiData
} from '../server/utils/equipmentMapper.js';

describe('equipmentMapper', () => {
    describe('mapGroupToEquipmentType', () => {
        it('should map TOP skis correctly', () => {
            const result = mapGroupToEquipmentType(123, 82293);
            expect(result).toEqual({ TYP_SPRZETU: 'NARTY', KATEGORIA: 'TOP' });
        });

        it('should map VIP skis correctly', () => {
            const result = mapGroupToEquipmentType(456, 82412);
            expect(result).toEqual({ TYP_SPRZETU: 'NARTY', KATEGORIA: 'VIP' });
        });

        it('should map JUNIOR skis correctly', () => {
            const result = mapGroupToEquipmentType(789, 82758);
            expect(result).toEqual({ TYP_SPRZETU: 'NARTY', KATEGORIA: 'JUNIOR' });
        });

        it('should map adult boots correctly', () => {
            const result = mapGroupToEquipmentType(111, 82738);
            expect(result).toEqual({ TYP_SPRZETU: 'BUTY', KATEGORIA: 'DOROSLE' });
        });

        it('should map snowboards correctly', () => {
            const result = mapGroupToEquipmentType(222, 83762);
            expect(result).toEqual({ TYP_SPRZETU: 'DESKI', KATEGORIA: '' });
        });

        it('should return default for unknown group', () => {
            const result = mapGroupToEquipmentType(999, 99999);
            expect(result).toEqual({ TYP_SPRZETU: 'NARTY', KATEGORIA: '' });
        });
    });

    describe('extractPlecFromPoziom', () => {
        it('should extract male gender', () => {
            expect(extractPlecFromPoziom('4m')).toBe('M');
            expect(extractPlecFromPoziom('5M')).toBe('M');
        });

        it('should extract female gender', () => {
            expect(extractPlecFromPoziom('4k')).toBe('K');
            expect(extractPlecFromPoziom('5K')).toBe('K');
        });

        it('should extract unisex for mixed format', () => {
            expect(extractPlecFromPoziom('4k/5m')).toBe('U');
            expect(extractPlecFromPoziom('5m/4k')).toBe('U');
        });

        it('should extract unisex for range format', () => {
            expect(extractPlecFromPoziom('1-2u')).toBe('U');
            expect(extractPlecFromPoziom('3-4U')).toBe('U');
        });

        it('should return U for empty or invalid input', () => {
            expect(extractPlecFromPoziom('')).toBe('U');
            expect(extractPlecFromPoziom(null)).toBe('U');
            expect(extractPlecFromPoziom('invalid')).toBe('U');
        });
    });

    describe('parseEquipmentName', () => {
        it('should parse ski name with length', () => {
            const result = parseEquipmentName('NARTY HEAD SHAPE 3.0 156cm //01 /2025');
            expect(result.NAZWA).toBe('HEAD SHAPE 3.0');
            expect(result.DLUGOSC).toBe(156);
            expect(result.ROK).toBe(2025);
        });

        it('should parse boot name with size', () => {
            const result = parseEquipmentName('BUTY ATOMIC rozm23,5 //05');
            expect(result.NAZWA).toBe('ATOMIC');
            expect(result.DLUGOSC).toBe(23.5);
            expect(result.ROK).toBeNull();
        });

        it('should handle boot size with space', () => {
            const result = parseEquipmentName('BUTY HEAD rozm 25 //10');
            expect(result.NAZWA).toBe('HEAD');
            expect(result.DLUGOSC).toBe(25);
        });

        it('should remove equipment type prefix', () => {
            const result = parseEquipmentName('DESKI BURTON CUSTOM 158cm');
            expect(result.NAZWA).toBe('BURTON CUSTOM');
            expect(result.DLUGOSC).toBe(158);
        });

        it('should handle various ski number formats', () => {
            const result1 = parseEquipmentName('HEAD SHAPE //01');
            const result2 = parseEquipmentName('HEAD SHAPE /01');
            const result3 = parseEquipmentName('HEAD SHAPE #01');

            expect(result1.NAZWA).toBe('HEAD SHAPE');
            expect(result2.NAZWA).toBe('HEAD SHAPE');
            expect(result3.NAZWA).toBe('HEAD SHAPE');
        });

        it('should return empty result for empty input', () => {
            const result = parseEquipmentName('');
            expect(result.NAZWA).toBe('');
            expect(result.DLUGOSC).toBeNull();
            expect(result.ROK).toBeNull();
        });
    });

    describe('mapFireSnowToSkiData', () => {
        it('should map complete FireSnow item to SkiData', () => {
            const fireSnowItem = {
                obiekt_id: 1234,
                sub_group_id: 123,
                parent_group_id: 82293, // TOP
                nazwa_sprzetu: 'NARTY HEAD SHAPE 3.0 156cm //01 /2025',
                poziom: '4m',
                waga_min: 60,
                waga_max: 80,
                wzrost_min: 165,
                wzrost_max: 180,
                przeznaczenie: 'SL',
                typ: 'Race',
                kod: '01'
            };

            const result = mapFireSnowToSkiData(fireSnowItem);

            expect(result.ID).toBe('N-1234');
            expect(result.TYP_SPRZETU).toBe('NARTY');
            expect(result.KATEGORIA).toBe('TOP');
            expect(result.MARKA).toBe('HEAD');
            expect(result.MODEL).toBe('SHAPE 3.0 (2025)');
            expect(result.DLUGOSC).toBe(156);
            expect(result.POZIOM).toBe('4m');
            expect(result.PLEC).toBe('M');
            expect(result.WAGA_MIN).toBe(60);
            expect(result.WAGA_MAX).toBe(80);
            expect(result.WZROST_MIN).toBe(165);
            expect(result.WZROST_MAX).toBe(180);
            expect(result.PRZEZNACZENIE).toBe('SL');
            expect(result.ATUTY).toBe('Race');
            expect(result.KOD).toBe('01');
        });

        it('should generate correct ID prefix for boots', () => {
            const fireSnowItem = {
                obiekt_id: 5,
                sub_group_id: 111,
                parent_group_id: 82738, // BUTY DOROSLE
                nazwa_sprzetu: 'BUTY ATOMIC rozm25',
                poziom: '',
                kod: '05'
            };

            const result = mapFireSnowToSkiData(fireSnowItem);
            expect(result.ID).toBe('B-0005');
            expect(result.TYP_SPRZETU).toBe('BUTY');
        });

        it('should generate correct ID prefix for snowboards', () => {
            const fireSnowItem = {
                obiekt_id: 99,
                sub_group_id: 222,
                parent_group_id: 83762, // DESKI
                nazwa_sprzetu: 'DESKI BURTON CUSTOM 158cm',
                poziom: '',
                kod: '99'
            };

            const result = mapFireSnowToSkiData(fireSnowItem);
            expect(result.ID).toBe('D-0099');
            expect(result.TYP_SPRZETU).toBe('DESKI');
        });
    });
});
