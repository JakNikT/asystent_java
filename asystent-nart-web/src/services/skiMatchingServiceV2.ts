// Serwis dopasowywania nart - UPROSZCZONA WERSJA
import type { SkiData, SearchCriteria, SkiMatch, SearchResults, AvailabilityInfo, DetailedCompatibilityInfo, CriteriaDetails } from '../types/ski.types';
import { ReservationService } from './reservationService';

// Konfiguracja tolerancji - wszystko w jednym miejscu
interface ToleranceConfig {
  poziom: {
    maxDifference: number; // Maksymalna różnica poziomów
    yellowThreshold: number; // Próg dla żółtego (1 poziom różnicy)
  };
  waga: {
    yellowTolerance: number; // Tolerancja żółta (±5kg)
    redTolerance: number; // Tolerancja czerwona (±10kg)
  };
  wzrost: {
    yellowTolerance: number; // Tolerancja żółta (±5cm)
    redTolerance: number; // Tolerancja czerwona (±10cm)
  };
}

const TOLERANCE_CONFIG: ToleranceConfig = {
  poziom: {
    maxDifference: 2,
    yellowThreshold: 1
  },
  waga: {
    yellowTolerance: 5,
    redTolerance: 10
  },
  wzrost: {
    yellowTolerance: 5,
    redTolerance: 10
  }
};

// Domyślne wagi kryteriów zgodnie z dokumentacją
const DEFAULT_CRITERIA_WEIGHTS = {
  poziom: 0.40,      // 40% - najważniejsze (bezpieczeństwo) - ZWIĘKSZONE z 35%
  waga: 0.25,        // 25% - bardzo ważne (kontrola nart)
  wzrost: 0.20,      // 20% - ważne (stabilność)
  plec: 0.10,        // 10% - mniej ważne (ergonomia) - ZMNIEJSZONE z 15%
  przeznaczenie: 0.05 // 5% - najmniej ważne (styl jazdy)
};

// Adaptacyjne wagi na podstawie stylu jazdy użytkownika
// USUNIĘTO: ADAPTIVE_WEIGHTS - nie używane w nowym systemie

export class SkiMatchingServiceV2 {
  /**
   * Główna funkcja wyszukiwania nart - DWUETAPOWY SYSTEM
   * Etap 1: Wyszukiwanie podstawowe (bez filtrów stylu)
   * Etap 2: Opcjonalne filtrowanie po stylu
   */
  static findMatchingSkis(skis: SkiData[], criteria: SearchCriteria): SearchResults {
    console.log(`SkiMatchingServiceV2: Wyszukiwanie nart dla kryteriów:`, criteria);
    
    // ETAP 1: Wyszukiwanie podstawowe (ignoruj styl_jazdy)
    const basicCriteria = {
      ...criteria,
      styl_jazdy: undefined // Usuń filtry stylu na tym etapie
    };
    
    const results: SkiMatch[] = [];
    
    // Sprawdź każdą nartę jedną funkcją (bez stylu jazdy)
    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, basicCriteria);
      if (match) {
        results.push(match);
      }
    }
    
    // ETAP 2: Opcjonalne filtrowanie po stylu (jeśli wybrano)
    let filteredResults = results;
    if (criteria.styl_jazdy && criteria.styl_jazdy.length > 0) {
      filteredResults = this.filterByStyles(results, criteria.styl_jazdy);
    }
    
    // Kategoryzuj wyniki
    const categorized = this.categorizeResults(filteredResults);
    
    // Sortuj każdą kategorię według średniej kompatybilności
    const sortedResults = this.sortResults(categorized, criteria);
    
    console.log(`SkiMatchingServiceV2: Znaleziono: ${sortedResults.idealne.length} idealnych, ${sortedResults.alternatywy.length} alternatyw, ${sortedResults.poziom_za_nisko.length} poziom za nisko, ${sortedResults.inna_plec.length} inna płeć, ${sortedResults.na_sile.length} na siłę`);
    
    return sortedResults;
  }

  /**
   * ETAP 2: Filtrowanie po stylach jazdy (OPCJONALNE)
   * Multi-select: pokazuje narty pasujące do KTÓREGOKOLWIEK wybranego stylu
   */
  private static filterByStyles(matches: SkiMatch[], selectedStyles: string[]): SkiMatch[] {
    if (!selectedStyles || selectedStyles.length === 0) {
      return matches; // Brak filtrów - zwróć wszystkie style
    }

    return matches.filter(match => {
      const skiPrzeznaczenie = match.ski.PRZEZNACZENIE;
      
      // Sprawdź czy narta pasuje do KTÓREGOKOLWIEK wybranego stylu
      return selectedStyles.some(style => {
        switch (style) {
          case 'SL':
            return skiPrzeznaczenie === 'SL';
          case 'G':
            return skiPrzeznaczenie === 'G';
          case 'SLG':
            return skiPrzeznaczenie === 'SLG';
          case 'OFF':
            return skiPrzeznaczenie === 'OFF';
          default:
            return false;
        }
      });
    });
  }

  /**
   * UPROSZCZONA FUNKCJA - sprawdza dopasowanie pojedynczej narty
   * Zastępuje 5 osobnych funkcji jedną uniwersalną
   */
  private static checkSkiMatch(ski: SkiData, criteria: SearchCriteria): SkiMatch | null {
    // Sprawdź czy narta ma wszystkie dane
    if (!this.hasAllRequiredData(ski)) {
      return null;
    }

    // Parsuj poziom narty
    const poziomResult = this.parsePoziom(ski.POZIOM, criteria.plec);
    if (!poziomResult) {
      return null;
    }

    const [poziom_min] = poziomResult;

    // Sprawdź czy poziom nie jest za niski
    if (criteria.poziom < poziom_min - TOLERANCE_CONFIG.poziom.maxDifference) {
      return null;
    }

    // Sprawdź wszystkie kryteria jedną funkcją
    const criteriaResults = this.checkAllCriteria(ski, criteria, poziom_min);
    
    if (!criteriaResults) {
      return null;
    }
    
    // Oblicz kompatybilność
    const compatibility = this.calculateCompatibility(criteriaResults);
    
    // Określ kategorię na podstawie wyników
    const kategoria = this.determineCategory(criteriaResults.zielonePunkty);

    return {
      ski,
      compatibility,
      dopasowanie: criteriaResults.dopasowanie,
      kategoria,
      zielone_punkty: criteriaResults.zielonePunkty
    };
  }

  /**
   * Sprawdza wszystkie kryteria jedną funkcją
   */
  private static checkAllCriteria(ski: SkiData, criteria: SearchCriteria, poziomMin: number) {
    const dopasowanie = {
      poziom: '',
      plec: '',
      waga: '',
      wzrost: '',
      przeznaczenie: ''
    };
    
    let zielonePunkty = 0;

    // 1. Sprawdź poziom
    const poziomCheck = this.checkPoziom(criteria.poziom, poziomMin);
    if (!poziomCheck) return null;
    dopasowanie.poziom = poziomCheck.status;
    zielonePunkty += poziomCheck.points;

    // 2. Sprawdź płeć
    const plecCheck = this.checkPlec(criteria.plec, ski.PLEC);
    dopasowanie.plec = plecCheck.status;
    zielonePunkty += plecCheck.points;

    // 3. Sprawdź wagę
    const wagaCheck = this.checkWaga(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
    dopasowanie.waga = wagaCheck.status;
    zielonePunkty += wagaCheck.points;

    // 4. Sprawdź wzrost
    const wzrostCheck = this.checkWzrost(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
    dopasowanie.wzrost = wzrostCheck.status;
    zielonePunkty += wzrostCheck.points;

    // 5. Sprawdź przeznaczenie (tylko jeśli styl_jazdy jest określony)
    if (criteria.styl_jazdy && criteria.styl_jazdy.length > 0) {
      const przeznaczenieCheck = this.checkPrzeznaczenie(criteria.styl_jazdy, ski.PRZEZNACZENIE);
      dopasowanie.przeznaczenie = przeznaczenieCheck.status;
      zielonePunkty += przeznaczenieCheck.points;
    } else {
      // W podstawowym wyszukiwaniu - zawsze zielone (ignorujemy styl)
      dopasowanie.przeznaczenie = '✅ zielony (wszystkie style)';
      zielonePunkty += 1;
    }

    return { dopasowanie, zielonePunkty };
  }

  /**
   * Kategoryzuje wyniki na podstawie kryteriów
   */
  private static categorizeResults(results: SkiMatch[]): SearchResults {
    const idealne: SkiMatch[] = [];
    const alternatywy: SkiMatch[] = [];
    const poziomZaNisko: SkiMatch[] = [];
    const innaPlec: SkiMatch[] = [];
    const naSile: SkiMatch[] = [];

    for (const match of results) {
      const { dopasowanie } = match;
      
      // Sprawdź kategorię na podstawie kryteriów
      if (this.isIdealne(dopasowanie)) {
        match.kategoria = 'idealne';
        idealne.push(match);
      } else if (this.isAlternatywy(dopasowanie)) {
        match.kategoria = 'alternatywy';
        alternatywy.push(match);
      } else if (this.isPoziomZaNisko(dopasowanie)) {
        match.kategoria = 'poziom_za_nisko';
        poziomZaNisko.push(match);
      } else if (this.isInnaPlec(dopasowanie)) {
        match.kategoria = 'inna_plec';
        innaPlec.push(match);
      } else if (this.isNaSile(dopasowanie)) {
        match.kategoria = 'na_sile';
        naSile.push(match);
      }
    }

    return {
      idealne,
      alternatywy,
      poziom_za_nisko: poziomZaNisko,
      inna_plec: innaPlec,
      na_sile: naSile,
      wszystkie: results
    };
  }

  /**
   * Sprawdza czy narta jest idealna (wszystkie kryteria na zielono)
   */
  private static isIdealne(dopasowanie: any): boolean {
    return Object.values(dopasowanie).every(status => 
      typeof status === 'string' && status.includes('✅ zielony')
    );
  }

  /**
   * Sprawdza czy narta to alternatywa (poziom OK, płeć OK, tylko JEDNO kryterium nie idealne)
   * ZMIANA: Akceptuje też czerwone przeznaczenie - ważniejsze jest dopasowanie fizyczne
   */
  private static isAlternatywy(dopasowanie: any): boolean {
    const poziomOk = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('✅ zielony');
    const plecOk = typeof dopasowanie.plec === 'string' && dopasowanie.plec.includes('✅ zielony');
    
    if (!poziomOk || !plecOk) return false;
    
    const nieZieloneKryteria = Object.entries(dopasowanie)
      .filter(([_, status]) => typeof status === 'string' && !status.includes('✅ zielony'))
      .map(([kryterium, _]) => kryterium);
    
    // Tylko narty z JEDNYM kryterium nie idealnym
    if (nieZieloneKryteria.length !== 1) return false;
    
    const problemKryterium = nieZieloneKryteria[0];
    const problemStatus = dopasowanie[problemKryterium];
    
    // ZMIANA: Jeśli problem to przeznaczenie, akceptuj też czerwone
    if (problemKryterium === 'przeznaczenie') {
      return true; // Akceptuj zarówno żółte jak i czerwone przeznaczenie
    }
    
    // Dla innych kryteriów sprawdź tolerancję
    return this.isInTolerance(problemKryterium, problemStatus);
  }

  /**
   * Sprawdza czy problemowe kryterium mieści się w tolerancji 5±
   */
  private static isInTolerance(kryterium: string, status: string): boolean {
    if (kryterium === 'waga' && status.includes('🟡 żółty')) {
      // Sprawdź czy różnica nie przekracza 5kg (nowy format z strzałkami)
      const match = status.match(/(\d+)[↑↓]/);
      if (match) {
        return parseInt(match[1]) <= TOLERANCE_CONFIG.waga.yellowTolerance;
      }
      // Fallback dla starych komunikatów
      const oldMatch = status.match(/o (\d+)/);
      return oldMatch ? parseInt(oldMatch[1]) <= TOLERANCE_CONFIG.waga.yellowTolerance : false;
    } else if (kryterium === 'wzrost' && status.includes('🟡 żółty')) {
      // Sprawdź czy różnica nie przekracza 5cm (nowy format z strzałkami)
      const match = status.match(/(\d+)[↑↓]/);
      if (match) {
        return parseInt(match[1]) <= TOLERANCE_CONFIG.wzrost.yellowTolerance;
      }
      // Fallback dla starych komunikatów
      const oldMatch = status.match(/o (\d+)/);
      return oldMatch ? parseInt(oldMatch[1]) <= TOLERANCE_CONFIG.wzrost.yellowTolerance : false;
    } else if (kryterium === 'przeznaczenie' && status.includes('🟡 żółty')) {
      // Styl jazdy w tolerancji
      return true;
    }
    
    return false;
  }

  /**
   * Sprawdza czy narta ma niższy poziom (wszystkie inne kryteria na zielono)
   * ZMIANA: Nazwa "poziom za nisko" → "niższy poziom narty"
   * ZMIANA: Akceptuje też czerwone przeznaczenie - to może być dobra opcja dla bezpieczeństwa
   */
  private static isPoziomZaNisko(dopasowanie: any): boolean {
    const poziomZaNisko = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('niższy poziom narty');
    if (!poziomZaNisko) return false;
    
    // Sprawdź czy WSZYSTKIE inne kryteria są na zielono (poza przeznaczeniem)
    return Object.entries(dopasowanie)
      .filter(([kryterium, _]) => kryterium !== 'poziom' && kryterium !== 'przeznaczenie')
      .every(([_, status]) => typeof status === 'string' && status.includes('✅ zielony'));
  }

  /**
   * Sprawdza czy narta ma niepasującą płeć (wszystkie inne kryteria na zielono)
   * ZMIANA: Akceptuje też czerwone przeznaczenie - różnica w płci jest mniejszym problemem
   */
  private static isInnaPlec(dopasowanie: any): boolean {
    const plecStatus = dopasowanie.plec;
    const plecZaNisko = typeof plecStatus === 'string' && plecStatus.includes('🟡 żółty') && 
      (plecStatus.includes('Narta męska') || plecStatus.includes('Narta kobieca'));
    
    if (!plecZaNisko) return false;
    
    // Sprawdź czy WSZYSTKIE inne kryteria są na zielono (poza przeznaczeniem)
    return Object.entries(dopasowanie)
      .filter(([kryterium, _]) => kryterium !== 'plec' && kryterium !== 'przeznaczenie')
      .every(([_, status]) => typeof status === 'string' && status.includes('✅ zielony'));
  }

  /**
   * Sprawdza czy narta to "na siłę" (z większymi tolerancjami)
   * ZMIANA: Zawsze akceptuj przeznaczenie - to najmniej ważny parametr
   */
  private static isNaSile(dopasowanie: any): boolean {
    // PŁEĆ MUSI PASOWAĆ (być zielona) w kategorii NA SIŁĘ
    if (typeof dopasowanie.plec !== 'string' || !dopasowanie.plec.includes('✅ zielony')) return false;
    
    const poziomZaNisko = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('🟡 żółty');
    const wzrostWOkresie = typeof dopasowanie.wzrost === 'string' && (dopasowanie.wzrost.includes('✅ zielony') || 
                          dopasowanie.wzrost.includes('🟡 żółty') || 
                          dopasowanie.wzrost.includes('🔴 czerwony'));
    const wagaWOkresie = typeof dopasowanie.waga === 'string' && (dopasowanie.waga.includes('✅ zielony') || 
                        dopasowanie.waga.includes('🟡 żółty') || 
                        dopasowanie.waga.includes('🔴 czerwony'));
    // ZMIANA: Zawsze akceptuj przeznaczenie w kategorii NA SIŁĘ
    const przeznaczenieOk = true;
    
    // Opcja 1: Alternatywy z tolerancjami 10± (waga lub wzrost w tolerancji 10±)
    if (!poziomZaNisko && (wagaWOkresie || wzrostWOkresie) && przeznaczenieOk) {
      return true;
    }
    // Opcja 2: Poziom za nisko + jedna tolerancja 5± (waga lub wzrost)
    else if (poziomZaNisko && (wagaWOkresie || wzrostWOkresie) && przeznaczenieOk) {
      return true;
    }
    
    return false;
  }

  /**
   * Sortuje wyniki według średniej kompatybilności
   */
  private static sortResults(results: SearchResults, criteria: SearchCriteria): SearchResults {
    const sortByCompatibility = (matches: SkiMatch[]) => {
      return matches.sort((a, b) => {
        const avgA = this.calculateAverageCompatibility(a, criteria);
        const avgB = this.calculateAverageCompatibility(b, criteria);
        return avgB - avgA;
      });
    };

    return {
      idealne: sortByCompatibility(results.idealne),
      alternatywy: sortByCompatibility(results.alternatywy),
      poziom_za_nisko: sortByCompatibility(results.poziom_za_nisko),
      inna_plec: sortByCompatibility(results.inna_plec),
      na_sile: sortByCompatibility(results.na_sile),
      wszystkie: sortByCompatibility(results.wszystkie)
    };
  }

  // ===== POMOCNICZE FUNKCJE (przeniesione z oryginalnego kodu) =====

  /**
   * UPROSZCZONA FUNKCJA - parsuje poziom narty
   * Zastępuje skomplikowaną logikę prostszą i bardziej czytelną
   * OBSŁUGUJE: D (damski - stary format) i K (kobiecy - nowy format)
   */
  private static parsePoziom(poziomText: string, plec: string): [number, string] | null {
    if (!poziomText || !plec) return null;
    
    const cleanText = poziomText.trim().toUpperCase();
    const isMale = plec.toUpperCase() === 'M';
    
    // Mapowanie formatów do regex patterns
    const patterns = [
      // Format unisex: "5M/6K" lub "5M/6D" (stary format)
      { 
        regex: /^(\d+)M\/(\d+)[KD]$/i, 
        handler: (match: RegExpMatchArray) => {
          const maleLevel = parseInt(match[1]);
          const femaleLevel = parseInt(match[2]);
          return isMale ? [maleLevel, `PM${maleLevel}/PK${femaleLevel}`] : [femaleLevel, `PM${maleLevel}/PK${femaleLevel}`];
        }
      },
      // Format unisex ze spacją: "5M 6K" lub "5M 6D"
      { 
        regex: /^(\d+)M\s+(\d+)[KD]$/i, 
        handler: (match: RegExpMatchArray) => {
          const maleLevel = parseInt(match[1]);
          const femaleLevel = parseInt(match[2]);
          return isMale ? [maleLevel, `PM${maleLevel} PK${femaleLevel}`] : [femaleLevel, `PM${maleLevel} PK${femaleLevel}`];
        }
      },
      // Format męski: "5M"
      { 
        regex: /^(\d+)M$/i, 
        handler: (match: RegExpMatchArray) => {
          const level = parseInt(match[1]);
          return [level, `PM${level}`];
        }
      },
      // Format kobiecy: "5K" lub "5D" (stary format)
      { 
        regex: /^(\d+)[KD]$/i, 
        handler: (match: RegExpMatchArray) => {
          const level = parseInt(match[1]);
          return [level, `PK${level}`];
        }
      },
      // Format prosty: tylko cyfra
      { 
        regex: /^(\d+)$/, 
        handler: (match: RegExpMatchArray) => {
          const level = parseInt(match[1]);
          return [level, `P${level}`];
        }
      }
    ];
    
    // Próbuj każdy pattern
    for (const pattern of patterns) {
      const match = cleanText.match(pattern.regex);
      if (match) {
        try {
          return pattern.handler(match) as [number, string];
        } catch (error) {
          console.warn(`SkiMatchingServiceV2: Błąd parsowania poziomu "${poziomText}":`, error);
          continue;
        }
      }
    }
    
    console.warn(`SkiMatchingServiceV2: Nieznany format poziomu: "${poziomText}"`);
    return null;
  }

  /**
   * Sprawdza dopasowanie poziomu
   * Klient poziom 4, narta poziom 3 = narta trudniejsza (poziom narty niżej) ↑
   * Klient poziom 4, narta poziom 4 = idealne
   * Klient poziom 4, narta poziom 5 = narta łatwiejsza (niższy poziom narty) ↓
   */
  private static checkPoziom(userPoziom: number, skiPoziomMin: number): { status: string; points: number } | null {
    if (userPoziom >= skiPoziomMin) {
      // Narta jest łatwiejsza (poziom narty jest niżej)
      if (userPoziom >= skiPoziomMin + TOLERANCE_CONFIG.poziom.yellowThreshold) {
        const diff = userPoziom - skiPoziomMin;
        return { status: `🟡 żółty (niższy poziom narty ${diff}↓)`, points: 0 };
      }
      return { status: '✅ zielony', points: 1 };
    } else if (userPoziom >= skiPoziomMin - TOLERANCE_CONFIG.poziom.yellowThreshold) {
      // Narta jest trudniejsza (poziom narty wyżej)
      const diff = skiPoziomMin - userPoziom;
      return { status: `🟡 żółty (poziom za wysoki ${diff}↑)`, points: 0 };
    } else if (userPoziom >= skiPoziomMin - TOLERANCE_CONFIG.poziom.maxDifference) {
      const diff = skiPoziomMin - userPoziom;
      return { status: `🔴 czerwony (poziom za wysoki ${diff}↑)`, points: 0 };
    }
    return null;
  }

  /**
   * Sprawdza dopasowanie płci
   * Obsługuje: M (męski), K (kobiecy), D (damski - stary format), U (unisex), W (wszyscy)
   */
  private static checkPlec(userPlec: string, skiPlec: string): { status: string; points: number } {
    // Normalizuj stary format D → K
    const normalizedSkiPlec = skiPlec === 'D' ? 'K' : skiPlec;
    const normalizedUserPlec = userPlec === 'D' ? 'K' : userPlec;
    
    // Jeśli użytkownik wybrał 'W' (wszyscy) - wszystko pasuje
    if (normalizedUserPlec === 'W') {
      return { status: '✅ zielony (wszyscy)', points: 1 };
    }
    
    if (normalizedSkiPlec === 'U' || normalizedSkiPlec === 'W') {
      return { status: '✅ zielony (unisex)', points: 1 };
    } else if (normalizedUserPlec === 'M' && normalizedSkiPlec === 'M') {
      return { status: '✅ zielony', points: 1 };
    } else if (normalizedUserPlec === 'K' && normalizedSkiPlec === 'K') {
      return { status: '✅ zielony', points: 1 };
    } else if (normalizedUserPlec === 'M' && normalizedSkiPlec === 'K') {
      return { status: '🟡 żółty - Narta kobieca', points: 0 };
    } else if (normalizedUserPlec === 'K' && normalizedSkiPlec === 'M') {
      return { status: '🟡 żółty - Narta męska', points: 0 };
    } else {
      return { status: '🔴 czerwony (niezgodna płeć)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wagi
   */
  private static checkWaga(userWaga: number, wagaMin: number, wagaMax: number): { status: string; points: number } {
    if (userWaga >= wagaMin && userWaga <= wagaMax) {
      return { status: '✅ zielony', points: 1 };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + TOLERANCE_CONFIG.waga.yellowTolerance) {
      const diff = userWaga - wagaMax;
      return { status: `🟡 żółty (${diff}↑ kg za duża)`, points: 0 };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - TOLERANCE_CONFIG.waga.yellowTolerance) {
      const diff = wagaMin - userWaga;
      return { status: `🟡 żółty (${diff}↓ kg za mała)`, points: 0 };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + TOLERANCE_CONFIG.waga.redTolerance) {
      const diff = userWaga - wagaMax;
      return { status: `🔴 czerwony (${diff}↑ kg za duża)`, points: 0 };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - TOLERANCE_CONFIG.waga.redTolerance) {
      const diff = wagaMin - userWaga;
      return { status: `🔴 czerwony (${diff}↓ kg za mała)`, points: 0 };
    } else {
      return { status: '🔴 czerwony (niedopasowana)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wzrostu
   */
  private static checkWzrost(userWzrost: number, wzrostMin: number, wzrostMax: number): { status: string; points: number } {
    if (userWzrost >= wzrostMin && userWzrost <= wzrostMax) {
      return { status: '✅ zielony', points: 1 };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + TOLERANCE_CONFIG.wzrost.yellowTolerance) {
      const diff = userWzrost - wzrostMax;
      return { status: `🟡 żółty (${diff}↑ cm za duży)`, points: 0 };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - TOLERANCE_CONFIG.wzrost.yellowTolerance) {
      const diff = wzrostMin - userWzrost;
      return { status: `🟡 żółty (${diff}↓ cm za mały)`, points: 0 };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + TOLERANCE_CONFIG.wzrost.redTolerance) {
      const diff = userWzrost - wzrostMax;
      return { status: `🔴 czerwony (${diff}↑ cm za duży)`, points: 0 };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - TOLERANCE_CONFIG.wzrost.redTolerance) {
      const diff = wzrostMin - userWzrost;
      return { status: `🔴 czerwony (${diff}↓ cm za mały)`, points: 0 };
    } else {
      return { status: '🔴 czerwony (niedopasowany)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie przeznaczenia (NOWY FORMAT - tablica stylów)
   */
  private static checkPrzeznaczenie(userStyles: string[], skiPrzeznaczenie: string): { status: string; points: number } {
    // Jeśli brak stylów - wszystko pasuje
    if (!userStyles || userStyles.length === 0) {
      return { status: '✅ zielony', points: 1 };
    }
    
    // Sprawdź czy narta pasuje do KTÓREGOKOLWIEK wybranego stylu
    const matches = userStyles.some(style => {
      switch (style) {
        case 'SL':
          return skiPrzeznaczenie === 'SL';
        case 'G':
          return skiPrzeznaczenie === 'G';
        case 'SLG':
          return skiPrzeznaczenie === 'SLG';
        case 'OFF':
          return skiPrzeznaczenie === 'OFF';
        default:
          return false;
      }
    });
    
    if (matches) {
      return { status: '✅ zielony', points: 1 };
    } else {
      return { status: '🔴 czerwony', points: 0 };
    }
  }

  /**
   * INTELIGENTNY SYSTEM PUNKTACJI - bardziej intuicyjne procenty dopasowania
   * Zastępuje prosty system zielonych punktów bardziej zaawansowanym algorytmem
   */
  private static calculateCompatibility(criteriaResults: any): number {
    const { dopasowanie, zielonePunkty } = criteriaResults;
    
    // Podstawowa punktacja na podstawie zielonych punktów (0-5)
    const baseScore = (zielonePunkty / 5) * 100;
    
    // Bonusy za szczególnie dobre dopasowania
    let bonus = 0;
    
    // Bonus za idealne dopasowanie wagi/wzrostu (w środku zakresu)
    if (typeof dopasowanie.waga === 'string' && dopasowanie.waga.includes('✅ zielony')) {
      bonus += 5; // Bonus za idealną wagę
    }
    if (typeof dopasowanie.wzrost === 'string' && dopasowanie.wzrost.includes('✅ zielony')) {
      bonus += 5; // Bonus za idealny wzrost
    }
    
    // Bonus za idealne dopasowanie poziomu
    if (typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('✅ zielony')) {
      bonus += 10; // Bonus za idealny poziom
    }
    
    // Bonus za idealne dopasowanie płci
    if (typeof dopasowanie.plec === 'string' && dopasowanie.plec.includes('✅ zielony')) {
      bonus += 3; // Bonus za idealną płeć
    }
    
    // Bonus za idealne dopasowanie przeznaczenia
    if (typeof dopasowanie.przeznaczenie === 'string' && dopasowanie.przeznaczenie.includes('✅ zielony')) {
      bonus += 2; // Bonus za idealne przeznaczenie
    }
    
    // Kara za problemy z krytycznymi kryteriami
    let penalty = 0;
    
    // Kara za problemy z poziomem (bezpieczeństwo)
    if (typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('🔴 czerwony')) {
      penalty += 20; // Duża kara za niebezpieczny poziom
    } else if (typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('🟡 żółty')) {
      penalty += 10; // Średnia kara za problemy z poziomem
    }
    
    // Kara za problemy z wagą (kontrola nart)
    if (typeof dopasowanie.waga === 'string' && dopasowanie.waga.includes('🔴 czerwony')) {
      penalty += 15; // Kara za problemy z wagą
    }
    
    // Kara za problemy ze wzrostem (stabilność)
    if (typeof dopasowanie.wzrost === 'string' && dopasowanie.wzrost.includes('🔴 czerwony')) {
      penalty += 10; // Kara za problemy ze wzrostem
    }
    
    // Oblicz końcowy wynik (0-100)
    const finalScore = Math.max(0, Math.min(100, baseScore + bonus - penalty));
    
    return Math.round(finalScore);
  }

  /**
   * Oblicza średnią kompatybilność z adaptacyjnymi wagami na podstawie stylu jazdy
   * Zgodnie z dokumentacją: POZIOM 35%, WAGA 25%, WZROST 20%, PŁEĆ 15%, PRZEZNACZENIE 5%
   * Ale dostosowane do stylu jazdy użytkownika
   */
  public static calculateAverageCompatibility(match: SkiMatch, criteria: SearchCriteria): number {
    const poziomScore = this.calculateCriteriaScore('poziom', match.dopasowanie.poziom, criteria, match.ski);
    const wagaScore = this.calculateCriteriaScore('waga', match.dopasowanie.waga, criteria, match.ski);
    const wzrostScore = this.calculateCriteriaScore('wzrost', match.dopasowanie.wzrost, criteria, match.ski);
    const plecScore = this.calculateCriteriaScore('plec', match.dopasowanie.plec, criteria, match.ski);
    const przeznaczenieScore = this.calculateCriteriaScore('przeznaczenie', match.dopasowanie.przeznaczenie, criteria, match.ski);
    
    // Pobierz adaptacyjne wagi na podstawie stylu jazdy
    const adaptiveWeights = this.getAdaptiveWeights(criteria.styl_jazdy);
    
    // Oblicz ważoną średnią z adaptacyjnymi wagami
    const weightedAverage = (
      poziomScore * adaptiveWeights.poziom +
      wagaScore * adaptiveWeights.waga +
      wzrostScore * adaptiveWeights.wzrost +
      plecScore * adaptiveWeights.plec +
      przeznaczenieScore * adaptiveWeights.przeznaczenie
    );
    
    return Math.round(weightedAverage);
  }

  /**
   * Pobiera adaptacyjne wagi na podstawie stylu jazdy użytkownika (NOWY FORMAT)
   */
  private static getAdaptiveWeights(stylJazdy: string[] | undefined): typeof DEFAULT_CRITERIA_WEIGHTS {
    // Jeśli brak stylów lub puste, użyj domyślnych wag
    if (!stylJazdy || stylJazdy.length === 0) {
      return DEFAULT_CRITERIA_WEIGHTS;
    }
    
    // Użyj domyślnych wag dla nowego systemu
    // (można dodać logikę adaptacyjną w przyszłości)
    return DEFAULT_CRITERIA_WEIGHTS;
  }

  /**
   * Oblicza procent dla konkretnego kryterium (uproszczona wersja dla sortowania)
   */
  private static calculateCriteriaScore(criterion: string, status: string, criteria: SearchCriteria, ski: SkiData): number {
    if (typeof status === 'string' && status.includes('✅ zielony')) {
      switch (criterion) {
        case 'wzrost':
          return this.calculateRangeScore(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
        case 'waga':
          return this.calculateRangeScore(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
        case 'poziom':
          return this.calculateLevelScore(criteria.poziom, criteria.plec, ski.POZIOM);
        case 'plec':
          if (ski.POZIOM.includes('/') || ski.POZIOM.includes('U')) return 100;
          return criteria.plec === ski.PLEC ? 100 : 60;
        case 'przeznaczenie':
          return this.calculateStyleScore(criteria.styl_jazdy || [], ski.PRZEZNACZENIE);
        default:
          return 100;
      }
    } else if (typeof status === 'string' && status.includes('🟡 żółty')) {
      // Poza zakresem ale w tolerancji - niższe wartości
      switch (criterion) {
        case 'wzrost':
          return this.calculateToleranceScore(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX, TOLERANCE_CONFIG.wzrost.yellowTolerance);
        case 'waga':
          return this.calculateToleranceScore(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX, TOLERANCE_CONFIG.waga.yellowTolerance);
        case 'poziom':
          return 70; // 1 poziom różnicy = 70%
        case 'plec':
          return 60; // Inna płeć ale akceptowalna
        case 'przeznaczenie':
          return 50; // Częściowe dopasowanie stylu
        default:
          return 75;
      }
    } else if (typeof status === 'string' && status.includes('🔴 czerwony')) {
      // Znacznie poza zakresem - bardzo niskie wartości
      return 25;
    }
    return 0;
  }

  /**
   * Oblicza procent na podstawie tolerancji (im dalej od zakresu, tym niższy procent)
   */
  private static calculateToleranceScore(userValue: number, min: number, max: number, tolerance: number): number {
    // Oblicz odległość od zakresu (nie od środka!)
    let distanceFromRange = 0;
    
    if (userValue < min) {
      distanceFromRange = min - userValue; // Za mały
    } else if (userValue > max) {
      distanceFromRange = userValue - max; // Za duży
    } else {
      // W zakresie - użyj funkcji gaussowskiej
      return this.calculateRangeScore(userValue, min, max);
    }
    
    // Im dalej od zakresu, tym niższy procent
    const score = Math.max(0, 100 - (distanceFromRange / tolerance) * 50);
    return Math.round(Math.max(25, score));
  }

  /**
   * Oblicza procent na podstawie funkcji gaussowskiej - im bliżej środka zakresu, tym lepszy wynik
   */
  private static calculateRangeScore(userValue: number, min: number, max: number): number {
    const center = (min + max) / 2;
    const range = max - min;
    const sigma = range / 6; // 99.7% wartości w zakresie 3*sigma
    
    // Funkcja gaussowska: e^(-0.5 * ((x - center) / sigma)^2)
    const distanceFromCenter = Math.abs(userValue - center);
    const gaussianScore = Math.exp(-0.5 * Math.pow(distanceFromCenter / sigma, 2));
    
    // Konwertuj na procent (0-100%)
    return Math.round(gaussianScore * 100);
  }

  /**
   * Oblicza procent dla poziomu zgodnie z dokumentacją
   */
  private static calculateLevelScore(userLevel: number, userGender: string, skiLevel: string): number {
    const skiLevelForUser = this.parseSkiLevelForUser(skiLevel, userGender);
    if (skiLevelForUser === null) return 100;
    
    const diff = Math.abs(userLevel - skiLevelForUser);
    if (diff === 0) return 100; // Idealne dopasowanie
    if (diff === 1) return 70;   // 1 poziom różnicy = 70%
    if (diff === 2) return 40;   // 2 poziomy różnicy = 40%
    return Math.max(10, 100 - diff * 30); // Więcej niż 2 poziomy
  }

  /**
   * Oblicza procent dopasowania stylu jazdy (NOWY FORMAT - tablica stylów)
   */
  private static calculateStyleScore(userStyles: string[], skiStyle: string): number {
    // Jeśli brak stylów - wszystko pasuje
    if (!userStyles || userStyles.length === 0) {
      return 100;
    }
    
    // Sprawdź czy narta pasuje do KTÓREGOKOLWIEK wybranego stylu
    const matches = userStyles.some(style => {
      switch (style) {
        case 'SL':
          return skiStyle === 'SL';
        case 'G':
          return skiStyle === 'G';
        case 'SLG':
          return skiStyle === 'SLG';
        case 'OFF':
          return skiStyle === 'OFF';
        default:
          return false;
      }
    });
    
    return matches ? 100 : 0;
  }

  /**
   * Parsuje poziom narty dla konkretnego użytkownika
   */
  private static parseSkiLevelForUser(skiLevel: string, userGender: string): number | null {
    const cleanLevel = skiLevel.replace(/\s+/g, '').toUpperCase();
    
    if (cleanLevel.includes('/')) {
      const parts = cleanLevel.split('/');
      for (const part of parts) {
        if (part.includes(userGender.toUpperCase())) {
          const level = parseInt(part.replace(/[^\d]/g, ''));
          if (!isNaN(level)) return level;
        }
      }
      const firstLevel = parseInt(parts[0].replace(/[^\d]/g, ''));
      return isNaN(firstLevel) ? null : firstLevel;
    }
    
    if (cleanLevel.includes(userGender.toUpperCase())) {
      const level = parseInt(cleanLevel.replace(/[^\d]/g, ''));
      return isNaN(level) ? null : level;
    }
    
    if (cleanLevel.includes('U') || !/[MD]/.test(cleanLevel)) {
      const level = parseInt(cleanLevel.replace(/[^\d]/g, ''));
      return isNaN(level) ? null : level;
    }
    
    return null;
  }

  /**
   * Określa kategorię dopasowania (używane tylko w checkSkiMatch)
   */
  private static determineCategory(zielonePunkty: number): 'idealne' | 'alternatywy' | 'poziom_za_nisko' | 'inna_plec' | 'na_sile' {
    if (zielonePunkty === 5) return 'idealne';
    if (zielonePunkty === 4) return 'alternatywy';
    if (zielonePunkty === 3) return 'alternatywy';
    return 'na_sile';
  }

  /**
   * INTELIGENTNY SYSTEM SUGESTII - sugeruje jak zmienić kryteria aby znaleźć więcej nart
   */
  static generateSuggestions(skis: SkiData[], criteria: SearchCriteria, results: SearchResults): string[] {
    const suggestions: string[] = [];
    
    // Jeśli brak wyników, sugeruj zmiany
    if (results.wszystkie.length === 0) {
      suggestions.push(...this.generateNoResultsSuggestions(skis, criteria));
    }
    
    // Jeśli mało wyników, sugeruj rozszerzenie kryteriów
    if (results.wszystkie.length < 5) {
      suggestions.push(...this.generateExpandCriteriaSuggestions(skis, criteria));
    }
    
    // Jeśli dużo wyników "na siłę", sugeruj zawężenie kryteriów
    if (results.na_sile.length > results.idealne.length + results.alternatywy.length) {
      suggestions.push(...this.generateNarrowCriteriaSuggestions(criteria));
    }
    
    return suggestions;
  }

  /**
   * Generuje sugestie gdy brak wyników
   */
  private static generateNoResultsSuggestions(skis: SkiData[], criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Sprawdź czy można obniżyć poziom
    const lowerLevelSuggestions = this.checkLowerLevelPossibility(skis, criteria);
    if (lowerLevelSuggestions.length > 0) {
      suggestions.push(...lowerLevelSuggestions);
    }
    
    // Sprawdź czy można zmienić styl jazdy
    const styleSuggestions = this.checkStyleChangePossibility(skis, criteria);
    if (styleSuggestions.length > 0) {
      suggestions.push(...styleSuggestions);
    }
    
    // Sprawdź czy można rozszerzyć tolerancje wagi/wzrostu
    const toleranceSuggestions = this.checkToleranceExpansionPossibility(skis, criteria);
    if (toleranceSuggestions.length > 0) {
      suggestions.push(...toleranceSuggestions);
    }
    
    return suggestions;
  }

  /**
   * Sprawdza możliwość obniżenia poziomu
   */
  private static checkLowerLevelPossibility(skis: SkiData[], criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Sprawdź czy obniżenie poziomu o 1 da więcej wyników
    if (criteria.poziom > 1) {
      const lowerCriteria = { ...criteria, poziom: criteria.poziom - 1 };
      const lowerResults = this.findMatchingSkis(skis, lowerCriteria);
      
      if (lowerResults.wszystkie.length > 0) {
        suggestions.push(`💡 Zmień poziom z ${criteria.poziom} na ${criteria.poziom - 1} aby znaleźć ${lowerResults.wszystkie.length} nart`);
      }
    }
    
    return suggestions;
  }

  /**
   * Sprawdza możliwość zmiany stylu jazdy
   */
  private static checkStyleChangePossibility(skis: SkiData[], criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Jeśli styl to nie "Wszystkie", sprawdź czy zmiana na "Wszystkie" da więcej wyników
    if (criteria.styl_jazdy && criteria.styl_jazdy.length > 0) {
      const allStyleCriteria = { ...criteria, styl_jazdy: undefined };
      const allStyleResults = this.findMatchingSkis(skis, allStyleCriteria);
      
      if (allStyleResults.wszystkie.length > 0) {
        suggestions.push(`💡 Zmień styl jazdy na "Wszystkie" aby znaleźć ${allStyleResults.wszystkie.length} nart`);
      }
    }
    
    return suggestions;
  }

  /**
   * Sprawdza możliwość rozszerzenia tolerancji
   */
  private static checkToleranceExpansionPossibility(skis: SkiData[], criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Sprawdź narty które są poza tolerancją ale blisko
    for (const ski of skis) {
      if (!this.hasAllRequiredData(ski)) continue;
      
      const poziomResult = this.parsePoziom(ski.POZIOM, criteria.plec);
      if (!poziomResult) continue;
      
      const [poziom_min] = poziomResult;
      
      // Sprawdź czy poziom pasuje
      if (criteria.poziom < poziom_min - TOLERANCE_CONFIG.poziom.maxDifference) continue;
      
      // Sprawdź płeć
      const plecCheck = this.checkPlec(criteria.plec, ski.PLEC);
      if (!plecCheck.status.includes('✅ zielony') && !plecCheck.status.includes('🟡 żółty')) continue;
      
      // Sprawdź wagę - czy jest blisko tolerancji
      const wagaCheck = this.checkWaga(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
      if (wagaCheck.status.includes('🔴 czerwony')) {
        const diff = Math.abs(criteria.waga - (criteria.waga > ski.WAGA_MAX ? ski.WAGA_MAX : ski.WAGA_MIN));
        if (diff <= 15) { // W granicach 15kg
          suggestions.push(`💡 Rozważ wagę ${criteria.waga + (criteria.waga > ski.WAGA_MAX ? -5 : 5)}kg aby znaleźć więcej nart`);
          break;
        }
      }
      
      // Sprawdź wzrost - czy jest blisko tolerancji
      const wzrostCheck = this.checkWzrost(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
      if (wzrostCheck.status.includes('🔴 czerwony')) {
        const diff = Math.abs(criteria.wzrost - (criteria.wzrost > ski.WZROST_MAX ? ski.WZROST_MAX : ski.WZROST_MIN));
        if (diff <= 15) { // W granicach 15cm
          suggestions.push(`💡 Rozważ wzrost ${criteria.wzrost + (criteria.wzrost > ski.WZROST_MAX ? -5 : 5)}cm aby znaleźć więcej nart`);
          break;
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Generuje sugestie gdy mało wyników
   */
  private static generateExpandCriteriaSuggestions(skis: SkiData[], criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Sprawdź czy można rozszerzyć styl jazdy
    if (criteria.styl_jazdy && criteria.styl_jazdy.length > 0) {
      suggestions.push(`💡 Zmień styl jazdy na "Wszystkie" aby znaleźć więcej opcji`);
    }
    
    // Sprawdź czy można obniżyć poziom
    if (criteria.poziom > 1) {
      suggestions.push(`💡 Rozważ obniżenie poziomu o 1 aby znaleźć więcej nart`);
    }
    
    return suggestions;
  }

  /**
   * Generuje sugestie gdy dużo wyników "na siłę"
   */
  private static generateNarrowCriteriaSuggestions(criteria: SearchCriteria): string[] {
    const suggestions: string[] = [];
    
    // Sugeruj podwyższenie poziomu
    if (criteria.poziom < 6) {
      suggestions.push(`💡 Podnieś poziom o 1 aby znaleźć bardziej odpowiednie narty`);
    }
    
    // Sugeruj zawężenie stylu jazdy
    if (!criteria.styl_jazdy || criteria.styl_jazdy.length === 0) {
      suggestions.push(`💡 Wybierz konkretny styl jazdy aby znaleźć bardziej dopasowane narty`);
    }
    
    return suggestions;
  }

  /**
   * Sprawdza czy narta ma wszystkie wymagane dane
   */
  private static hasAllRequiredData(ski: SkiData): boolean {
    return !!(
      ski.POZIOM &&
      ski.PLEC &&
      ski.WAGA_MIN &&
      ski.WAGA_MAX &&
      ski.WZROST_MIN &&
      ski.WZROST_MAX &&
      ski.PRZEZNACZENIE
    );
  }

  /**
   * Proste sprawdzenie dostępności (synchroniczne) - dla sortowania
   */
  private static getSimpleAvailabilityScore(ski: SkiData): number {
    const ilosc = parseInt(String(ski.ILOSC) || '2');
    // Na razie zwracamy 1 (dostępne) - później można dodać cache
    return 1;
  }

  /**
   * SYSTEM INFORMACJI O DOSTĘPNOŚCI - sprawdza dostępność nart
   */
  static async checkAvailability(ski: SkiData, reservationCache?: any, dateFrom?: Date, dateTo?: Date): Promise<AvailabilityInfo> {
    try {
      const ilosc = parseInt(String(ski.ILOSC) || '2');
      const availability: AvailabilityInfo = {
        total: ilosc,
        available: [],
        reserved: [],
        availabilityStatus: 'unknown'
      };

      // Jeśli brak cache rezerwacji, zakładamy że wszystkie są dostępne
      if (!reservationCache) {
        for (let i = 1; i <= ilosc; i++) {
          availability.available.push({
            number: i,
            status: 'available',
            reservationInfo: null
          });
        }
        availability.availabilityStatus = 'all_available';
        return availability;
      }

      // Sprawdź każdą sztukę
      for (let i = 1; i <= ilosc; i++) {
        const isReserved = await this.isSkiReserved(ski, i, reservationCache, dateFrom, dateTo);
        
        if (isReserved) {
          availability.reserved.push({
            number: i,
            status: 'reserved',
            reservationInfo: await this.getReservationInfo(ski, i, reservationCache, dateFrom, dateTo)
          });
        } else {
          availability.available.push({
            number: i,
            status: 'available',
            reservationInfo: null
          });
        }
      }

      // Określ status dostępności
      if (availability.available.length === ilosc) {
        availability.availabilityStatus = 'all_available';
      } else if (availability.available.length > 0) {
        availability.availabilityStatus = 'partially_available';
      } else {
        availability.availabilityStatus = 'all_reserved';
      }

      return availability;
    } catch (error) {
      console.error('SkiMatchingServiceV2: Błąd sprawdzania dostępności:', error);
      return {
        total: parseInt(String(ski.ILOSC) || '2'),
        available: [],
        reserved: [],
        availabilityStatus: 'unknown'
      };
    }
  }

  /**
   * Sprawdza czy konkretna sztuka nart jest zarezerwowana
   */
  private static async isSkiReserved(ski: SkiData, sztukaNumber: number, reservationCache?: any, dateFrom?: Date, dateTo?: Date): Promise<boolean> {
    try {
      // Jeśli brak cache rezerwacji, sprawdź bezpośrednio
      if (!reservationCache) {
        return false;
      }

      // Użyj dat z kryteriów wyszukiwania lub domyślnych
      const startDate = dateFrom || new Date();
      const endDate = dateTo || new Date();

      // Sprawdź czy narta jest zarezerwowana w danym okresie
      const reservations = await ReservationService.isSkiReserved(
        ski.MARKA,
        ski.MODEL,
        ski.DLUGOSC.toString(),
        startDate,
        endDate
      );

      return reservations.length > 0;
    } catch (error) {
      console.error('SkiMatchingServiceV2: Błąd sprawdzania rezerwacji:', error);
      return false;
    }
  }

  /**
   * Pobiera informacje o rezerwacji dla konkretnej sztuki
   */
  private static async getReservationInfo(ski: SkiData, sztukaNumber: number, reservationCache?: any, dateFrom?: Date, dateTo?: Date): Promise<string | null> {
    try {
      if (!reservationCache) {
        return null;
      }

      // Użyj dat z kryteriów wyszukiwania lub domyślnych
      const startDate = dateFrom || new Date();
      const endDate = dateTo || new Date();

      const reservations = await ReservationService.isSkiReserved(
        ski.MARKA,
        ski.MODEL,
        ski.DLUGOSC.toString(),
        startDate,
        endDate
      );

      if (reservations.length > 0) {
        const reservation = reservations[0];
        return `${reservation.clientName} (${reservation.startDate.toLocaleDateString()} - ${reservation.endDate.toLocaleDateString()})`;
      }

      return null;
    } catch (error) {
      console.error('SkiMatchingServiceV2: Błąd pobierania informacji o rezerwacji:', error);
      return null;
    }
  }

  /**
   * Generuje komunikat o dostępności w formacie zgodnym z wersją beta
   */
  static generateAvailabilityMessage(availability: AvailabilityInfo): string {
    const availableCount = availability.available.length;
    const reservedCount = availability.reserved.length;
    
    if (availability.availabilityStatus === 'all_available') {
      return `🟩${availableCount} 🟩${availableCount}`;
    } else if (availability.availabilityStatus === 'all_reserved') {
      return `🔴${reservedCount} 🔴${reservedCount}`;
    } else {
      return `🟩${availableCount} 🔴${reservedCount}`;
    }
  }

  /**
   * INTELIGENTNE KOMUNIKATY O KATEGORYZACJI - wyjaśnia dlaczego narta jest w danej kategorii
   */
  static generateCategorizationExplanation(match: SkiMatch, criteria: SearchCriteria): string {
    const { dopasowanie, kategoria } = match;
    
    switch (kategoria) {
      case 'idealne':
        return this.generateIdealneExplanation(dopasowanie, criteria);
      
      case 'alternatywy':
        return this.generateAlternatywyExplanation(dopasowanie, criteria);
      
      case 'poziom_za_nisko':
        return this.generatePoziomZaNiskoExplanation(dopasowanie, criteria);
      
      case 'inna_plec':
        return this.generateInnaPlecExplanation(dopasowanie, criteria);
      
      case 'na_sile':
        return this.generateNaSileExplanation(dopasowanie, criteria);
      
      default:
        return 'Nieznana kategoria';
    }
  }

  /**
   * Generuje wyjaśnienie dla kategorii IDEALNE
   */
  private static generateIdealneExplanation(dopasowanie: any, criteria: SearchCriteria): string {
    return `✅ **IDEALNE DOPASOWANIE** - wszystkie kryteria spełnione idealnie:
• Poziom: ${criteria.poziom} (idealny)
• Waga: ${criteria.waga}kg (w zakresie)
• Wzrost: ${criteria.wzrost}cm (w zakresie)
• Płeć: ${criteria.plec} (pasuje)
• Styl jazdy: ${criteria.styl_jazdy} (pasuje)`;
  }

  /**
   * Generuje wyjaśnienie dla kategorii ALTERNATYWY
   */
  private static generateAlternatywyExplanation(dopasowanie: any, criteria: SearchCriteria): string {
    const problemKryterium = this.findProblemCriteria(dopasowanie);
    
    if (!problemKryterium) {
      return '⚠️ **ALTERNATYWA** - tylko jedno kryterium nie idealne';
    }

    const { kryterium, status } = problemKryterium;
    let explanation = `⚠️ **ALTERNATYWA** - tylko jedno kryterium nie idealne:\n`;
    
    switch (kryterium) {
      case 'waga':
        explanation += `• Waga: ${criteria.waga}kg (${status.includes('za duża') ? 'za duża' : 'za mała'} w tolerancji 5±)`;
        break;
      case 'wzrost':
        explanation += `• Wzrost: ${criteria.wzrost}cm (${status.includes('za duży') ? 'za duży' : 'za mały'} w tolerancji 5±)`;
        break;
      case 'przeznaczenie':
        explanation += `• Styl jazdy: ${criteria.styl_jazdy} (inne przeznaczenie, ale w tolerancji)`;
        break;
      default:
        explanation += `• ${kryterium}: ${status}`;
    }
    
    explanation += `\n• Pozostałe kryteria: idealne`;
    return explanation;
  }

  /**
   * Generuje wyjaśnienie dla kategorii POZIOM ZA NISKO
   */
  private static generatePoziomZaNiskoExplanation(dopasowanie: any, criteria: SearchCriteria): string {
    return `🟡 **POZIOM ZA NISKO** - narta o jeden poziom za niska, ale wszystkie inne kryteria idealne:
• Poziom: ${criteria.poziom} (narta o poziom niżej - bezpieczniejsza)
• Waga: ${criteria.waga}kg (idealna)
• Wzrost: ${criteria.wzrost}cm (idealny)
• Płeć: ${criteria.plec} (pasuje)
• Styl jazdy: ${criteria.styl_jazdy} (pasuje)

💡 **Zalecenie**: Dobra opcja dla bezpieczniejszej jazdy`;
  }

  /**
   * Generuje wyjaśnienie dla kategorii INNA PŁEĆ
   */
  private static generateInnaPlecExplanation(dopasowanie: any, criteria: SearchCriteria): string {
    const plecStatus = dopasowanie.plec;
    const plecNarty = plecStatus.includes('męska') ? 'męska' : 'kobieca';
    
    return `👥 **INNA PŁEĆ** - narta ${plecNarty}, ale wszystkie inne kryteria idealne:
• Poziom: ${criteria.poziom} (idealny)
• Waga: ${criteria.waga}kg (idealna)
• Wzrost: ${criteria.wzrost}cm (idealny)
• Płeć: ${criteria.plec} (narta ${plecNarty} - może być używana)
• Styl jazdy: ${criteria.styl_jazdy} (pasuje)

💡 **Zalecenie**: Można używać, różnice w ergonomii są minimalne`;
  }

  /**
   * Generuje wyjaśnienie dla kategorii NA SIŁĘ
   */
  private static generateNaSileExplanation(dopasowanie: any, criteria: SearchCriteria): string {
    const problemy = this.findAllProblemCriteria(dopasowanie);
    
    let explanation = `🔴 **NA SIŁĘ** - większe tolerancje, ale nadal użyteczne:\n`;
    
    problemy.forEach(({ kryterium, status }) => {
      switch (kryterium) {
        case 'poziom':
          explanation += `• Poziom: ${criteria.poziom} (narta o poziom niżej)\n`;
          break;
        case 'waga':
          explanation += `• Waga: ${criteria.waga}kg (${status.includes('za duża') ? 'za duża' : 'za mała'} w tolerancji 10±)\n`;
          break;
        case 'wzrost':
          explanation += `• Wzrost: ${criteria.wzrost}cm (${status.includes('za duży') ? 'za duży' : 'za mały'} w tolerancji 10±)\n`;
          break;
        case 'przeznaczenie':
          explanation += `• Styl jazdy: ${criteria.styl_jazdy} (inne przeznaczenie)\n`;
          break;
      }
    });
    
    explanation += `\n💡 **Zalecenie**: Ostatnia opcja, ale nadal funkcjonalna`;
    return explanation;
  }

  /**
   * Znajduje problemowe kryterium (dla alternatyw)
   */
  private static findProblemCriteria(dopasowanie: any): { kryterium: string; status: string } | null {
    for (const [kryterium, status] of Object.entries(dopasowanie)) {
      if (typeof status === 'string' && !status.includes('✅ zielony')) {
        return { kryterium, status };
      }
    }
    return null;
  }

  /**
   * Znajduje wszystkie problemowe kryteria (dla NA SIŁĘ)
   */
  private static findAllProblemCriteria(dopasowanie: any): { kryterium: string; status: string }[] {
    const problemy: { kryterium: string; status: string }[] = [];
    
    for (const [kryterium, status] of Object.entries(dopasowanie)) {
      if (typeof status === 'string' && !status.includes('✅ zielony')) {
        problemy.push({ kryterium, status });
      }
    }
    
    return problemy;
  }

  /**
   * Generuje krótki komunikat o kategorii (dla UI)
   */
  static generateCategorySummary(match: SkiMatch): string {
    const { kategoria, dopasowanie } = match;
    
    switch (kategoria) {
      case 'idealne':
        return '✅ Idealne dopasowanie';
      
      case 'alternatywy':
        const problem = this.findProblemCriteria(dopasowanie);
        return problem ? `⚠️ Alternatywa (${problem.kryterium})` : '⚠️ Alternatywa';
      
      case 'poziom_za_nisko':
        return '🟡 Poziom za niski';
      
      case 'inna_plec':
        return '👥 Inna płeć';
      
      case 'na_sile':
        return '🔴 Na siłę';
      
      default:
        return '❓ Nieznana kategoria';
    }
  }

  /**
   * LEPsze SORTOWANIE WYNIKÓW - najpierw dostępne, potem według dopasowania
   */
  static sortResultsByAvailabilityAndCompatibility(matches: SkiMatch[], reservationCache?: any): SkiMatch[] {
    return matches.sort((a, b) => {
      // 1. Najpierw sortuj według dostępności (bez async - użyj prostego sprawdzenia)
      const availabilityScoreA = this.getSimpleAvailabilityScore(a.ski);
      const availabilityScoreB = this.getSimpleAvailabilityScore(b.ski);
      
      if (availabilityScoreA !== availabilityScoreB) {
        return availabilityScoreB - availabilityScoreA; // Wyższy score = lepszy
      }
      
      // 2. Jeśli dostępność taka sama, sortuj według dopasowania
      const compatibilityA = a.sredniaKompatybilnosc || 0;
      const compatibilityB = b.sredniaKompatybilnosc || 0;
      
      return compatibilityB - compatibilityA; // Wyższe dopasowanie = lepsze
    });
  }

  /**
   * Oblicza score dostępności (wyższy = lepszy)
   */
  private static getAvailabilityScore(availability: AvailabilityInfo): number {
    switch (availability.availabilityStatus) {
      case 'all_available':
        return 100; // Najlepsze - wszystkie dostępne
      case 'partially_available':
        return 50; // Średnie - część dostępna
      case 'all_reserved':
        return 0; // Najgorsze - wszystkie zarezerwowane
      case 'unknown':
        return 25; // Nieznane - zakładamy że może być dostępne
      default:
        return 0;
    }
  }

  /**
   * Sortuje wszystkie kategorie wyników według dostępności i dopasowania
   */
  static sortAllResultsByAvailabilityAndCompatibility(results: SearchResults, reservationCache?: any): SearchResults {
    return {
      idealne: this.sortResultsByAvailabilityAndCompatibility(results.idealne, reservationCache),
      alternatywy: this.sortResultsByAvailabilityAndCompatibility(results.alternatywy, reservationCache),
      poziom_za_nisko: this.sortResultsByAvailabilityAndCompatibility(results.poziom_za_nisko, reservationCache),
      inna_plec: this.sortResultsByAvailabilityAndCompatibility(results.inna_plec, reservationCache),
      na_sile: this.sortResultsByAvailabilityAndCompatibility(results.na_sile, reservationCache),
      wszystkie: this.sortResultsByAvailabilityAndCompatibility(results.wszystkie, reservationCache)
    };
  }

  /**
   * Generuje podsumowanie dostępności dla kategorii
   */
  static generateCategoryAvailabilitySummary(matches: SkiMatch[], reservationCache?: any): string {
    if (matches.length === 0) {
      return 'Brak nart w tej kategorii';
    }

    let allAvailable = 0;
    let partiallyAvailable = 0;
    let allReserved = 0;
    let unknown = 0;

    for (const match of matches) {
      // Użyj prostego sprawdzenia zamiast async
      const ilosc = parseInt(String(match.ski.ILOSC) || '2');
      // Na razie zakładamy że wszystkie są dostępne
      allAvailable++;
    }

    const parts: string[] = [];
    if (allAvailable > 0) parts.push(`🟩${allAvailable} wszystkie dostępne`);
    if (partiallyAvailable > 0) parts.push(`🟨${partiallyAvailable} częściowo dostępne`);
    if (allReserved > 0) parts.push(`🔴${allReserved} wszystkie zarezerwowane`);
    if (unknown > 0) parts.push(`❓${unknown} nieznany status`);

    return parts.join(', ');
  }

  /**
   * SZCZEGÓŁOWE INFORMACJE O DOPASOWANIU - pokazuje szczegóły każdego kryterium
   */
  static generateDetailedCompatibilityInfo(match: SkiMatch, criteria: SearchCriteria): DetailedCompatibilityInfo {
    const { dopasowanie, ski } = match;
    
    return {
      poziom: this.generatePoziomDetails(dopasowanie.poziom, criteria.poziom, ski),
      waga: this.generateWagaDetails(dopasowanie.waga, criteria.waga, ski),
      wzrost: this.generateWzrostDetails(dopasowanie.wzrost, criteria.wzrost, ski),
      plec: this.generatePlecDetails(dopasowanie.plec, criteria.plec, ski),
      przeznaczenie: this.generatePrzeznaczenieDetails(dopasowanie.przeznaczenie, criteria.styl_jazdy || [], ski),
      ogolne: this.generateOgolneDetails(match, criteria)
    };
  }

  /**
   * Generuje szczegóły dopasowania poziomu
   */
  private static generatePoziomDetails(poziomStatus: string, userPoziom: number, ski: SkiData): CriteriaDetails {
    const isGreen = poziomStatus.includes('✅ zielony');
    const isYellow = poziomStatus.includes('🟡 żółty');
    const isRed = poziomStatus.includes('🔴 czerwony');
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (isGreen) {
      status = 'perfect';
      message = `Poziom ${userPoziom} idealnie pasuje do nart`;
      recommendation = 'Idealne dopasowanie poziomu';
    } else if (isYellow) {
      status = 'warning';
      message = `Poziom ${userPoziom} - narta o poziom niżej`;
      recommendation = 'Bezpieczniejsza opcja, dobra dla nauki';
    } else if (isRed) {
      status = 'error';
      message = `Poziom ${userPoziom} - narta za niska`;
      recommendation = 'Może być za łatwa, rozważ wyższy poziom';
    } else {
      status = 'error';
      message = 'Nieznany status poziomu';
      recommendation = 'Sprawdź parametry nart';
    }
    
    return {
      status,
      message,
      recommendation,
      details: poziomStatus,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Generuje szczegóły dopasowania wagi
   */
  private static generateWagaDetails(wagaStatus: string, userWaga: number, ski: SkiData): CriteriaDetails {
    const isGreen = wagaStatus.includes('✅ zielony');
    const isYellow = wagaStatus.includes('🟡 żółty');
    const isRed = wagaStatus.includes('🔴 czerwony');
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (isGreen) {
      status = 'perfect';
      message = `Waga ${userWaga}kg idealnie w zakresie ${ski.WAGA_MIN}-${ski.WAGA_MAX}kg`;
      recommendation = 'Idealne dopasowanie wagi';
    } else if (isYellow) {
      status = 'warning';
      const diff = wagaStatus.includes('za duża') ? 'za duża' : 'za mała';
      message = `Waga ${userWaga}kg ${diff} w tolerancji 5±`;
      recommendation = diff === 'za duża' ? 'Narty będą miększe' : 'Narty będą sztywniejsze';
    } else if (isRed) {
      status = 'error';
      const diff = wagaStatus.includes('za duża') ? 'za duża' : 'za mała';
      message = `Waga ${userWaga}kg ${diff} poza tolerancją`;
      recommendation = 'Może wpływać na kontrolę nart';
    } else {
      status = 'error';
      message = 'Nieznany status wagi';
      recommendation = 'Sprawdź parametry nart';
    }
    
    return {
      status,
      message,
      recommendation,
      details: wagaStatus,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Generuje szczegóły dopasowania wzrostu
   */
  private static generateWzrostDetails(wzrostStatus: string, userWzrost: number, ski: SkiData): CriteriaDetails {
    const isGreen = wzrostStatus.includes('✅ zielony');
    const isYellow = wzrostStatus.includes('🟡 żółty');
    const isRed = wzrostStatus.includes('🔴 czerwony');
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (isGreen) {
      status = 'perfect';
      message = `Wzrost ${userWzrost}cm idealnie w zakresie ${ski.WZROST_MIN}-${ski.WZROST_MAX}cm`;
      recommendation = 'Idealne dopasowanie wzrostu';
    } else if (isYellow) {
      status = 'warning';
      const diff = wzrostStatus.includes('za duży') ? 'za duży' : 'za mały';
      message = `Wzrost ${userWzrost}cm ${diff} w tolerancji 5±`;
      recommendation = diff === 'za duży' ? 'Narty będą zwrotniejsze' : 'Narty będą stabilniejsze';
    } else if (isRed) {
      status = 'error';
      const diff = wzrostStatus.includes('za duży') ? 'za duży' : 'za mały';
      message = `Wzrost ${userWzrost}cm ${diff} poza tolerancją`;
      recommendation = 'Może wpływać na stabilność';
    } else {
      status = 'error';
      message = 'Nieznany status wzrostu';
      recommendation = 'Sprawdź parametry nart';
    }
    
    return {
      status,
      message,
      recommendation,
      details: wzrostStatus,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Generuje szczegóły dopasowania płci
   */
  private static generatePlecDetails(plecStatus: string, userPlec: string, ski: SkiData): CriteriaDetails {
    const isGreen = plecStatus.includes('✅ zielony');
    const isYellow = plecStatus.includes('🟡 żółty');
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (isGreen) {
      status = 'perfect';
      message = `Płeć ${userPlec} idealnie pasuje do nart`;
      recommendation = 'Idealne dopasowanie płci';
    } else if (isYellow) {
      status = 'warning';
      message = `Płeć ${userPlec} - narta ${plecStatus.includes('męska') ? 'męska' : 'kobieca'}`;
      recommendation = 'Można używać, różnice w ergonomii są minimalne';
    } else {
      status = 'error';
      message = 'Nieznany status płci';
      recommendation = 'Sprawdź parametry nart';
    }
    
    return {
      status,
      message,
      recommendation,
      details: plecStatus,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Generuje szczegóły dopasowania przeznaczenia
   */
  private static generatePrzeznaczenieDetails(przeznaczenieStatus: string, userStyles: string[], ski: SkiData): CriteriaDetails {
    const isGreen = przeznaczenieStatus.includes('✅ zielony');
    const isYellow = przeznaczenieStatus.includes('🟡 żółty');
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (isGreen) {
      status = 'perfect';
      message = `Styl jazdy ${userStyles.join(', ')} idealnie pasuje do nart`;
      recommendation = 'Idealne dopasowanie stylu jazdy';
    } else if (isYellow) {
      status = 'warning';
      message = `Styl jazdy ${userStyles.join(', ')} - inne przeznaczenie nart`;
      recommendation = 'Można używać, ale narty mogą być mniej optymalne';
    } else {
      status = 'error';
      message = 'Nieznany status przeznaczenia';
      recommendation = 'Sprawdź parametry nart';
    }
    
    return {
      status,
      message,
      recommendation,
      details: przeznaczenieStatus,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Generuje ogólne szczegóły dopasowania
   */
  private static generateOgolneDetails(match: SkiMatch, criteria: SearchCriteria): CriteriaDetails {
    const compatibility = match.sredniaKompatybilnosc || 0;
    
    let status: 'perfect' | 'good' | 'warning' | 'error';
    let message: string;
    let recommendation: string;
    
    if (compatibility >= 90) {
      status = 'perfect';
      message = `Dopasowanie ${compatibility}% - idealne`;
      recommendation = 'Najlepsza opcja dla Ciebie';
    } else if (compatibility >= 70) {
      status = 'good';
      message = `Dopasowanie ${compatibility}% - bardzo dobre`;
      recommendation = 'Dobra opcja, niewielkie kompromisy';
    } else if (compatibility >= 50) {
      status = 'warning';
      message = `Dopasowanie ${compatibility}% - akceptowalne`;
      recommendation = 'Można używać, ale z kompromisami';
    } else {
      status = 'error';
      message = `Dopasowanie ${compatibility}% - słabe`;
      recommendation = 'Rozważ inne opcje';
    }
    
    return {
      status,
      message,
      recommendation,
      details: `Współczynnik dopasowania: ${compatibility}%`,
      icon: this.getStatusIcon(status)
    };
  }

  /**
   * Zwraca ikonę na podstawie statusu
   */
  private static getStatusIcon(status: 'perfect' | 'good' | 'warning' | 'error'): string {
    switch (status) {
      case 'perfect':
        return '✅';
      case 'good':
        return '👍';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }
}
