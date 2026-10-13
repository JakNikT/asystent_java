import { describe, it, expect } from 'vitest';
import {
  addDays,
  appendKey,
  daysInMonth,
  isOutOfRange,
  isValidDate,
  parseTypedDate,
  resolveYear,
  splitISO,
  toISO,
  yearRange,
} from '../utils/dateParts';

const TODAY = new Date(2026, 9, 12); // 12 października 2026

describe('daysInMonth / isValidDate', () => {
  it('zwraca poprawne długości miesięcy', () => {
    expect(daysInMonth(1)).toBe(31);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(2, 2026)).toBe(28);
    expect(daysInMonth(2, 2028)).toBe(29);
    expect(daysInMonth(2)).toBe(29);
  });

  it('rozpoznaje nieistniejące daty', () => {
    expect(isValidDate(31, 4, 2026)).toBe(false);
    expect(isValidDate(29, 2, 2026)).toBe(false);
    expect(isValidDate(29, 2, 2028)).toBe(true);
    expect(isValidDate(15, 13, 2026)).toBe(false);
  });
});

describe('yearRange', () => {
  it('zwraca bieżący rok ±3', () => {
    expect(yearRange(TODAY)).toEqual([2023, 2024, 2025, 2026, 2027, 2028, 2029]);
  });
});

describe('toISO / splitISO / addDays', () => {
  it('składa i rozbija datę', () => {
    expect(toISO(5, 1, 2027)).toBe('2027-01-05');
    expect(splitISO('2027-01-05')).toEqual({ day: 5, month: 1, year: 2027 });
    expect(splitISO('')).toEqual({});
  });

  it('dodaje dni przez granicę miesiąca i roku', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('isOutOfRange', () => {
  it('sprawdza zakres min/max', () => {
    expect(isOutOfRange('2026-10-10', '2026-10-12')).toBe(true);
    expect(isOutOfRange('2026-10-12', '2026-10-12')).toBe(false);
    expect(isOutOfRange('2026-10-20', undefined, '2026-10-15')).toBe(true);
    expect(isOutOfRange('2026-10-20')).toBe(false);
  });
});

describe('resolveYear', () => {
  it('wybiera rok najbliższy dzisiaj', () => {
    expect(resolveYear(15, 1, { today: TODAY })).toBe(2027); // styczeń -> przyszły rok
    expect(resolveYear(20, 9, { today: TODAY })).toBe(2026); // wrzesień -> ten rok
    expect(resolveYear(12, 10, { today: TODAY })).toBe(2026);
    expect(resolveYear(1, 4, { today: TODAY })).toBe(2027); // kwiecień: 2027 bliżej niż 2026
  });

  it('respektuje notBefore (przejście grudzień -> styczeń)', () => {
    expect(resolveYear(3, 1, { today: TODAY, notBefore: '2026-12-28' })).toBe(2027);
    expect(resolveYear(30, 12, { today: TODAY, notBefore: '2026-12-28' })).toBe(2026);
  });

  it('respektuje notAfter', () => {
    expect(resolveYear(15, 1, { today: TODAY, notAfter: '2026-10-31' })).toBe(2026);
  });

  it('obsługuje 29 lutego (najbliższy rok przestępny)', () => {
    expect(resolveYear(29, 2, { today: TODAY })).toBe(2028);
  });

  it('zwraca null, gdy brak kandydata', () => {
    expect(resolveYear(31, 4, { today: TODAY })).toBeNull();
    expect(resolveYear(10, 10, { today: TODAY, notBefore: '2030-01-01' })).toBeNull();
  });
});

describe('appendKey', () => {
  it('dopełnia zerem pojedyncze cyfry dnia i miesiąca', () => {
    expect(appendKey('', '5')).toBe('05');
    expect(appendKey('', '1')).toBe('1');
    expect(appendKey('15', '3')).toBe('1503');
    expect(appendKey('15', '1')).toBe('151');
  });

  it('obsługuje separatory', () => {
    expect(appendKey('1', '.')).toBe('01');
    expect(appendKey('151', ' ')).toBe('1501');
    expect(appendKey('', '.')).toBe('');
  });

  it('ignoruje inne znaki i limit 8 cyfr', () => {
    expect(appendKey('15', 'a')).toBe('15');
    expect(appendKey('15012027', '1')).toBe('15012027');
  });
});

describe('parseTypedDate', () => {
  it.each([
    ['1501', { day: 15, month: 1 }],
    ['15.01', { day: 15, month: 1 }],
    ['15 1', { day: 15, month: 1 }],
    ['5.1', { day: 5, month: 1 }],
    ['53', { day: 5, month: 3 }],
    ['150127', { day: 15, month: 1, year: 2027 }],
    ['15012027', { day: 15, month: 1, year: 2027 }],
    ['15.01.2027', { day: 15, month: 1, year: 2027 }],
    ['15', { day: 15 }],
    ['', {}],
  ])('parsuje "%s"', (input, expected) => {
    expect(parseTypedDate(input)).toEqual(expected);
  });
});
