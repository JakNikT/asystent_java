import { describe, it, expect } from 'vitest';
import { formatFireSnowDate, extractKodFromName, convertDateToISO } from '../server/utils/formatters.js';

describe('formatters', () => {
    describe('formatFireSnowDate', () => {
        it('should format FireSnow date to ISO 8601', () => {
            const input = '2026-02-13 11:00:00.000000';
            const expected = '2026-02-13T11:00:00';
            expect(formatFireSnowDate(input)).toBe(expected);
        });

        it('should handle date without microseconds', () => {
            const input = '2026-02-13 11:00:00';
            const expected = '2026-02-13T11:00:00';
            expect(formatFireSnowDate(input)).toBe(expected);
        });

        it('should return empty string for null/undefined', () => {
            expect(formatFireSnowDate(null)).toBe('');
            expect(formatFireSnowDate(undefined)).toBe('');
            expect(formatFireSnowDate('')).toBe('');
        });

        it('should return original string for invalid date', () => {
            const invalid = 'invalid-date';
            expect(formatFireSnowDate(invalid)).toBe(invalid);
        });
    });

    describe('extractKodFromName', () => {
        it('should extract code from equipment name', () => {
            expect(extractKodFromName('NARTY ATOMIC //01')).toBe('01');
            expect(extractKodFromName('BUTY HEAD //123')).toBe('123');
            expect(extractKodFromName('DESKI BURTON //99')).toBe('99');
        });

        it('should return empty string if no code found', () => {
            expect(extractKodFromName('NARTY ATOMIC')).toBe('');
            expect(extractKodFromName('BUTY HEAD')).toBe('');
            expect(extractKodFromName('')).toBe('');
        });

        it('should handle multi-digit codes', () => {
            expect(extractKodFromName('NARTY //1234')).toBe('1234');
        });
    });

    describe('convertDateToISO', () => {
        it('should convert DD.MM.YYYY to ISO 8601', () => {
            expect(convertDateToISO('31.12.2022')).toBe('2022-12-31T00:00:00');
            expect(convertDateToISO('01.01.2023')).toBe('2023-01-01T00:00:00');
            expect(convertDateToISO('15.06.2024')).toBe('2024-06-15T00:00:00');
        });

        it('should handle single-digit days and months', () => {
            expect(convertDateToISO('1.1.2023')).toBe('2023-01-01T00:00:00');
            expect(convertDateToISO('5.9.2024')).toBe('2024-09-05T00:00:00');
        });

        it('should return empty string for null/undefined', () => {
            expect(convertDateToISO(null)).toBe('');
            expect(convertDateToISO(undefined)).toBe('');
            expect(convertDateToISO('')).toBe('');
        });

        it('should return original string for invalid format', () => {
            const invalid = '2023-12-31';
            expect(convertDateToISO(invalid)).toBe(invalid);
        });
    });
});
