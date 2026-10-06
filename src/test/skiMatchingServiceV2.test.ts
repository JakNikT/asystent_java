/**
 * src/test/skiMatchingServiceV2.test.ts: Testy jednostkowe dla głównego silnika rekomendacji i doboru nart
 */

import { describe, it, expect } from 'vitest';
import { SkiMatchingServiceV2 } from '../services/skiMatchingServiceV2';
import type { SkiData, SearchCriteria } from '../types/ski.types';

// Zestaw testowych danych nart
const sampleSkis: SkiData[] = [
  {
    ID: 'N-0001',
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: 'TOP',
    MARKA: 'Atomic',
    MODEL: 'Redster S9',
    DLUGOSC: 165,
    ILOSC: 1,
    POZIOM: '7',
    PLEC: 'M',
    WAGA_MIN: 70,
    WAGA_MAX: 90,
    WZROST_MIN: 170,
    WZROST_MAX: 185,
    PRZEZNACZENIE: 'SL',
    ATUTY: 'C,premium',
    KOD: 'AT-001'
  },
  {
    ID: 'N-0002',
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: 'DOROSLE',
    MARKA: 'Salomon',
    MODEL: 'S/Max 8',
    DLUGOSC: 160,
    ILOSC: 1,
    POZIOM: '5',
    PLEC: 'U', // Unisex
    WAGA_MIN: 60,
    WAGA_MAX: 80,
    WZROST_MIN: 165,
    WZROST_MAX: 178,
    PRZEZNACZENIE: 'SLG',
    ATUTY: 'C',
    KOD: 'SA-002'
  },
  {
    ID: 'N-0003',
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: 'TOP',
    MARKA: 'Head',
    MODEL: 'Joy Super',
    DLUGOSC: 153,
    ILOSC: 1,
    POZIOM: '4',
    PLEC: 'K', // Kobieca
    WAGA_MIN: 50,
    WAGA_MAX: 70,
    WZROST_MIN: 155,
    WZROST_MAX: 168,
    PRZEZNACZENIE: 'SLG',
    ATUTY: '',
    KOD: 'HD-003'
  },
  {
    ID: 'N-0004',
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: 'VIP',
    MARKA: 'Stoeckli',
    MODEL: 'Laser GS',
    DLUGOSC: 175,
    ILOSC: 1,
    POZIOM: '8',
    PLEC: 'M',
    WAGA_MIN: 75,
    WAGA_MAX: 95,
    WZROST_MIN: 175,
    WZROST_MAX: 190,
    PRZEZNACZENIE: 'G',
    ATUTY: 'premium',
    KOD: 'ST-004'
  },
  {
    ID: 'N-0005',
    TYP_SPRZETU: 'NARTY',
    KATEGORIA: '',
    MARKA: 'Incomplete',
    MODEL: 'NoData',
    DLUGOSC: 0,
    ILOSC: 1,
    POZIOM: '',
    PLEC: '',
    WAGA_MIN: 0,
    WAGA_MAX: 0,
    WZROST_MIN: 0,
    WZROST_MAX: 0,
    PRZEZNACZENIE: '',
    ATUTY: '',
    KOD: 'INC-005'
  }
];

describe('SkiMatchingServiceV2', () => {
  describe('findMatchingSkis - podstawowe dopasowanie', () => {
    it('powinien zwrócić nartę idealnie dopasowaną do parametrów narciarza', () => {
      const criteria: SearchCriteria = {
        wzrost: 175,
        waga: 80,
        poziom: 7,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);

      expect(results).toBeDefined();
      expect(results.idealne.length).toBeGreaterThanOrEqual(1);

      const idealnaNarta = results.idealne.find(match => match.ski.ID === 'N-0001');
      expect(idealnaNarta).toBeDefined();
      expect(idealnaNarta?.compatibility).toBeGreaterThan(70);
      expect(idealnaNarta?.dopasowanie.plec).toContain('zielony');
      expect(idealnaNarta?.dopasowanie.waga).toContain('zielony');
      expect(idealnaNarta?.dopasowanie.wzrost).toContain('zielony');
    });

    it('powinien zaakceptować nartę Unisex (U) dla mężczyzny i kobiety', () => {
      const criteriaM: SearchCriteria = {
        wzrost: 170,
        waga: 70,
        poziom: 5,
        plec: 'M'
      };

      const criteriaK: SearchCriteria = {
        wzrost: 170,
        waga: 70,
        poziom: 5,
        plec: 'K'
      };

      const resultsM = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteriaM);
      const resultsK = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteriaK);

      const nartaM = resultsM.wszystkie.find(m => m.ski.ID === 'N-0002');
      const nartaK = resultsK.wszystkie.find(m => m.ski.ID === 'N-0002');

      expect(nartaM).toBeDefined();
      expect(nartaK).toBeDefined();
      expect(nartaM?.dopasowanie.plec).toContain('zielony');
      expect(nartaK?.dopasowanie.plec).toContain('zielony');
    });

    it('powinien zaklasyfikować nartę damską dla mężczyzny do inna_plec', () => {
      const criteria: SearchCriteria = {
        wzrost: 160,
        waga: 60,
        poziom: 4,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);

      const damskaDlaMezczyzny = results.inna_plec.find(m => m.ski.ID === 'N-0003');
      expect(damskaDlaMezczyzny).toBeDefined();
      expect(damskaDlaMezczyzny?.kategoria).toBe('inna_plec');
    });
  });

  describe('Tolerancja poziomu zaawansowania', () => {
    it('powinien odrzucić nartę, gdy poziom narciarza jest zbyt niski (poza tolerancją 2 poziomów)', () => {
      // N-0004 wymaga poziomu 7-9. Dla narciarza z poziomem 3 (różnica 4 poziomy) narta nie powinna przejść.
      const criteria: SearchCriteria = {
        wzrost: 180,
        waga: 85,
        poziom: 3,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);
      const laserGS = results.wszystkie.find(m => m.ski.ID === 'N-0004');

      expect(laserGS).toBeUndefined();
    });

    it('powinien zaklasyfikować do poziom_za_nisko gdy poziom jest o 1-2 niższy', () => {
      // N-0001 wymaga 6-8. Dla narciarza z poziomem 5 (o 1 za nisko), narta powinna trafić do alternatyw lub poziom_za_nisko.
      const criteria: SearchCriteria = {
        wzrost: 175,
        waga: 80,
        poziom: 5,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);
      const match = results.wszystkie.find(m => m.ski.ID === 'N-0001');

      expect(match).toBeDefined();
      expect(['alternatywy', 'poziom_za_nisko']).toContain(match?.kategoria);
    });
  });

  describe('Filtrowanie stylów jazdy', () => {
    it('powinien przefiltrować narty po stylu jazdy SL (slalom)', () => {
      const criteria: SearchCriteria = {
        wzrost: 175,
        waga: 80,
        poziom: 7,
        plec: 'M',
        styl_jazdy: ['SL']
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);

      results.wszystkie.forEach(match => {
        expect(match.ski.PRZEZNACZENIE).toBe('SL');
      });
    });

    it('powinien przefiltrować narty po stylu jazdy G (gigant)', () => {
      const criteria: SearchCriteria = {
        wzrost: 180,
        waga: 85,
        poziom: 8,
        plec: 'M',
        styl_jazdy: ['G']
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);

      results.wszystkie.forEach(match => {
        expect(match.ski.PRZEZNACZENIE).toBe('G');
      });
    });
  });

  describe('Bezpieczeństwo i dane niekompletne', () => {
    it('powinien zignorować narty z brakującymi kluczowymi danymi bez rzucania wyjątków', () => {
      const criteria: SearchCriteria = {
        wzrost: 170,
        waga: 70,
        poziom: 5,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);
      const incomplete = results.wszystkie.find(m => m.ski.ID === 'N-0005');

      expect(incomplete).toBeUndefined();
    });

    it('powinien poprawnie zwrócić pustą strukturę gdy brak dopasowań', () => {
      const criteria: SearchCriteria = {
        wzrost: 220,
        waga: 180,
        poziom: 1,
        plec: 'M'
      };

      const results = SkiMatchingServiceV2.findMatchingSkis(sampleSkis, criteria);

      expect(results.idealne).toEqual([]);
      expect(results.wszystkie).toEqual([]);
    });
  });
});
