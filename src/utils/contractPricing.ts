/**
 * src/utils/contractPricing.ts: Podsumowanie cen umowy z historii (przed rabatem, po rabacie, rabat)
 * Tylko FireSnow: archiwum MySQL nie ma danych o rabatach
 */

import type { HistoryEquipmentData } from '../services/historyService';

export interface ContractPricing {
  /** Suma cen pozycji przed rabatem */
  priceBefore: number;
  /** Suma cen pozycji po rabacie */
  priceAfter: number;
  /** Rabat procentowy umowy (0 = brak) */
  discountPercent: number;
  /** Łączny rabat w złotych: cena przed rabatem - cena po rabacie, z rabatu procentowego i kwotowego (0 = brak) */
  discountAmount: number;
  hasDiscount: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Sumuje ceny pozycji umowy. Rabat procentowy: z umowy, a gdy go brak, największy z pozycji.
 * Pozycja bez ceny po rabacie (starszy serwer) liczona jest bez rabatu.
 */
export function summarizeContractPricing(items: HistoryEquipmentData[], contractPercent = 0): ContractPricing {
  let priceBefore = 0;
  let priceAfter = 0;
  let maxItemPercent = 0;

  for (const item of items) {
    const before = parseFloat(item.cena) || 0;
    priceBefore += before;
    priceAfter += item.cena_po_rabacie ?? before;
    maxItemPercent = Math.max(maxItemPercent, item.rabat_procent || 0);
  }

  const discountPercent = contractPercent || maxItemPercent;
  const discountAmount = round2(priceBefore - priceAfter);

  return {
    priceBefore: round2(priceBefore),
    priceAfter: round2(priceAfter),
    discountPercent,
    discountAmount,
    hasDiscount: discountPercent > 0 || discountAmount > 0
  };
}
