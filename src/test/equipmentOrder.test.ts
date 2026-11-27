// @vitest-environment node
/**
 * src/test/equipmentOrder.test.ts: Kolejność pozycji umowy w historii
 * - narty-buty-kije-kask, - deski-wiązania-buty-kask, - nierozpoznane na końcu, - stabilność w obrębie typu
 */

import { describe, it, expect } from 'vitest';
import { sortByContractOrder, equipmentTypeRank } from '../server/utils/equipmentOrder';

const names = (items: { sprzet: string }[]) => items.map(i => i.sprzet);

describe('sortByContractOrder', () => {
  it('umowa nartowa: narty, buty, kije, kask', () => {
    const sorted = sortByContractOrder([
      { sprzet: 'BUTY HEAD rozm 27' },
      { sprzet: 'KASK GIRO' },
      { sprzet: 'KIJE LEKI' },
      { sprzet: 'NARTY ATOMIC 170cm' }
    ]);
    expect(names(sorted)).toEqual(['NARTY ATOMIC 170cm', 'BUTY HEAD rozm 27', 'KIJE LEKI', 'KASK GIRO']);
  });

  it('umowa snowboardowa: deski, wiązania, buty, kask (z polskimi znakami i małymi literami)', () => {
    const sorted = sortByContractOrder([
      { sprzet: 'Kask Giro' },
      { sprzet: 'BUTY SNOWBOARD K2' },
      { sprzet: 'Wiązania Union' },
      { sprzet: 'DESKA BURTON 158cm' }
    ]);
    expect(names(sorted)).toEqual(['DESKA BURTON 158cm', 'Wiązania Union', 'BUTY SNOWBOARD K2', 'Kask Giro']);
  });

  it('w obrębie typu zachowuje kolejność wejściową, nierozpoznane trafiają na koniec', () => {
    const sorted = sortByContractOrder([
      { sprzet: 'GOGLE UVEX' },
      { sprzet: 'NARTY B' },
      { sprzet: 'NARTY A' },
      { sprzet: '' }
    ]);
    expect(names(sorted)).toEqual(['NARTY B', 'NARTY A', 'GOGLE UVEX', '']);
  });
});

describe('equipmentTypeRank', () => {
  it('rozpoznaje typ po pierwszym słowie, ignorując wielkość liter i spacje na początku', () => {
    expect(equipmentTypeRank('  narty head')).toBe(0);
    expect(equipmentTypeRank('KASKI')).toBeLessThan(equipmentTypeRank('GOGLE'));
  });
});
