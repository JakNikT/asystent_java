/**
 * src/test/contractPricing.test.ts: Podsumowanie cen umowy z historii
 * - suma przed/po rabacie, - rabat procentowy z umowy lub z pozycji, - brak rabatu, - zaokrąglanie
 */

import { describe, it, expect } from 'vitest';
import { summarizeContractPricing } from '../utils/contractPricing';
import type { HistoryEquipmentData } from '../services/historyService';

const item = (overrides: Partial<HistoryEquipmentData>): HistoryEquipmentData => ({
  klient: '', sprzet: 'NARTY', kod: 'A01', od: '', do: '', cena: '0', zaplacono: '0',
  numer: '', typumowy: '', source: 'firesnow',
  ...overrides
});

describe('summarizeContractPricing', () => {
  it('rabat procentowy: suma cen przed i po rabacie, procent z umowy i rabat w złotych', () => {
    const result = summarizeContractPricing([
      item({ cena: '300', cena_po_rabacie: 255, rabat_procent: 15 }),
      item({ cena: '100', cena_po_rabacie: 85, rabat_procent: 15 })
    ], 15);

    expect(result).toEqual({ priceBefore: 400, priceAfter: 340, discountPercent: 15, discountAmount: 60, hasDiscount: true });
  });

  it('rabat kwotowy i procentowy razem: rabat w złotych to różnica cen, procent z największej pozycji gdy umowa go nie podaje', () => {
    const result = summarizeContractPricing([
      item({ cena: '225', cena_po_rabacie: 180, rabat_kwota: 45 }),
      item({ cena: '50', cena_po_rabacie: 38.46, rabat_kwota: 11.54 }),
      item({ cena: '100', cena_po_rabacie: 90, rabat_procent: 10 })
    ]);

    expect(result.priceBefore).toBe(375);
    expect(result.priceAfter).toBe(308.46);
    expect(result.discountAmount).toBe(66.54);
    expect(result.discountPercent).toBe(10);
  });

  it('bez rabatu: ceny równe, hasDiscount = false; pozycja bez ceny po rabacie liczona bez rabatu', () => {
    const result = summarizeContractPricing([
      item({ cena: '462', cena_po_rabacie: 462 }),
      item({ cena: '50' })
    ]);

    expect(result).toEqual({ priceBefore: 512, priceAfter: 512, discountPercent: 0, discountAmount: 0, hasDiscount: false });
  });

  it('zaokrągla sumy do 0,01 (błąd zmiennoprzecinkowy)', () => {
    const result = summarizeContractPricing([
      item({ cena: '0.1', cena_po_rabacie: 0.1 }),
      item({ cena: '0.2', cena_po_rabacie: 0.2 })
    ]);

    expect(result.priceBefore).toBe(0.3);
  });
});
