import { describe, it, expect } from 'vitest';
import { detectFirefnowFormat, convertFromFirefnow } from '../server/utils/csvParser.js';

describe('csvParser', () => {
    describe('detectFirefnowFormat', () => {
        it('should detect FireFnow format with semicolons', () => {
            const csvText = 'Name;Age;City\nJohn;30;Warsaw\nJane;25;Krakow';
            expect(detectFirefnowFormat(csvText)).toBe(true);
        });

        it('should detect FireFnow format with corrupted characters', () => {
            const csvText = 'Sprzt,Age,City\nJohn,30,Warsaw';
            expect(detectFirefnowFormat(csvText)).toBe(true);
        });

        it('should not detect standard CSV format with more commas than semicolons', () => {
            const csvText = 'Name,Age,City,Country,ZIP\nJohn,30,Warsaw,Poland,00-001\nJane,25,Krakow,Poland,30-001';
            expect(detectFirefnowFormat(csvText)).toBe(false);
        });

        it('should handle empty string correctly after bug fix', () => {
            // After fixing the bug, empty string should return false
            expect(detectFirefnowFormat('')).toBe(false);
        });
    });

    describe('convertFromFirefnow', () => {
        it('should convert semicolon-separated values to comma-separated', () => {
            const input = 'Name;Age;City\nJohn;30;Warsaw';
            const expected = 'Name,Age,City\nJohn,30,Warsaw';
            expect(convertFromFirefnow(input)).toBe(expected);
        });

        it('should replace comma decimals with dot decimals', () => {
            const input = 'Name;Price;Quantity\nItem1;10,50;5';
            const expected = 'Name,Price,Quantity\nItem1,10.50,5';
            expect(convertFromFirefnow(input)).toBe(expected);
        });

        it('should handle empty lines', () => {
            const input = 'Name;Age\n\nJohn;30\n\nJane;25';
            const expected = 'Name,Age\nJohn,30\nJane,25';
            expect(convertFromFirefnow(input)).toBe(expected);
        });

        it('should handle mixed decimal formats', () => {
            const input = 'Product;Price;Stock\nSki;1299,99;10\nBoots;599,50;5';
            const expected = 'Product,Price,Stock\nSki,1299.99,10\nBoots,599.50,5';
            expect(convertFromFirefnow(input)).toBe(expected);
        });
    });
});
