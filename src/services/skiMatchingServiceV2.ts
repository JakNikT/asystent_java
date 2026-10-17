// Serwis dopasowywania nart - UPROSZCZONA WERSJA
import type { SkiData, SearchCriteria, SkiMatch, SearchResults, MatchDetails } from '../types/ski.types';
import { createLogger } from '../utils/logger';

// Konfiguracja tolerancji - uproszczona logika
interface ToleranceConfig {
  poziom: {
    maxDifference: number; // Maksymalna różnica poziomów
    yellowThreshold: number; // Próg dla żółtego (1 poziom różnicy)
  };
  waga: {
    yellowTolerance: number; // Żółta tolerancja (1-5 różnicy)
    redTolerance: number; // Czerwona tolerancja (6-10 różnicy)
  };
  wzrost: {
    yellowTolerance: number; // Żółta tolerancja (1-5 różnicy)
    redTolerance: number; // Czerwona tolerancja (6-10 różnicy)
  };
}

const TOLERANCE_CONFIG: ToleranceConfig = {
  poziom: {
    maxDifference: 2,
    yellowThreshold: 1
  },
  waga: {
    yellowTolerance: 5, // 1-5 różnicy = żółty
    redTolerance: 10    // 6-10 różnicy = czerwony
  },
  wzrost: {
    yellowTolerance: 5, // 1-5 różnicy = żółty
    redTolerance: 10    // 6-10 różnicy = czerwony
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
  // src/services/skiMatchingServiceV2.ts: Logger dla SkiMatchingServiceV2
  private static logger = createLogger('SkiMatchingServiceV2');

  /**
   * Główna funkcja wyszukiwania nart - DWUETAPOWY SYSTEM
   * Etap 1: Wyszukiwanie podstawowe (bez filtrów stylu)
   * Etap 2: Opcjonalne filtrowanie po stylu
   */
  public static findMatchingSkis(skis: SkiData[], criteria: SearchCriteria): SearchResults {
    this.logger.info('Wyszukiwanie nart dla kryteriów:', criteria);
    
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
    
    this.logger.info(`Znaleziono: ${sortedResults.idealne.length} idealnych, ${sortedResults.alternatywy.length} alternatyw, ${sortedResults.poziom_za_nisko.length} poziom za nisko, ${sortedResults.inna_plec.length} inna płeć, ${sortedResults.na_sile.length} na siłę`);
    
    return sortedResults;
  }

  /**
   * ETAP 2: Filtrowanie po stylach jazdy (OPCJONALNE)
   * Multi-select: pokazuje narty pasujące do KTÓREGOKOLWIEK wybranego stylu
   */
  private static filterByStyles(matches: SkiMatch[], selectedStyles: string[]): SkiMatch[] {
    if (!selectedStyles || selectedStyles.length === 0) {
      return matches; // Brak filtrów - zwróć wszystkie narty
    }

    // SINGLE SELECT: Weź tylko pierwszy wybrany styl (ignoruj resztę)
    const selectedStyle = selectedStyles[0];
    this.logger.info(`filterByStyles: Filtrowanie ${matches.length} nart po stylu: ${selectedStyle}`);

    return matches.filter(match => {
      const skiPrzeznaczenie = match.ski.PRZEZNACZENIE;
      
      // Proste dopasowanie: sprawdź czy narta pasuje do wybranego stylu
      switch (selectedStyle) {
        case 'SL':
          return skiPrzeznaczenie === 'SL';
        case 'G':
          return skiPrzeznaczenie === 'G';
        case 'SLG':
          return skiPrzeznaczenie === 'SLG';
        case 'OFF':
          return skiPrzeznaczenie === 'OFF';
        default:
          return true; // Jeśli nieznany styl, pokaż wszystkie
      }
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
    
    
    // Oblicz kompatybilność z precyzyjnymi wartościami
    const compatibility = this.calculateCompatibility(criteriaResults, ski, criteria);
    
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
   * Stosuje mapowanie do przedziału kategorii (modyfikuje obiekt)
   * Mapuje bazowy wynik 0-100 na przedział odpowiedni dla kategorii
   */
  private static applyCategoryMapping(match: SkiMatch): void {
    if (match.kategoria) {
      // match.compatibility zawiera bazowy wynik 0-100
      // Mapujemy go na przedział kategorii
      const mappedScore = this.mapToCategory(match.compatibility, match.kategoria);
      match.compatibility = Math.max(0, Math.min(100, mappedScore));
    }
  }

  /**
   * Kategoryzuje wyniki na podstawie kryteriów
   * NOWY SYSTEM: Mapuje bazowy wynik na przedziały kategorii
   */
  private static categorizeResults(results: SkiMatch[]): SearchResults {
    const idealne: SkiMatch[] = [];
    const alternatywy: SkiMatch[] = [];
    const poziomZaNisko: SkiMatch[] = [];
    const innaPlec: SkiMatch[] = [];
    const naSile: SkiMatch[] = [];

    for (const match of results) {
      const { dopasowanie } = match;
      
      // Określ kategorię na podstawie kryteriów
      if (this.isIdealne(dopasowanie)) {
        match.kategoria = 'idealne';
        this.applyCategoryMapping(match); // Mapuj na 90-100%
        idealne.push(match);
      } else if (this.isAlternatywy(dopasowanie)) {
        match.kategoria = 'alternatywy';
        this.applyCategoryMapping(match); // Mapuj na 70-89%
        alternatywy.push(match);
      } else if (this.isPoziomZaNisko(dopasowanie)) {
        match.kategoria = 'poziom_za_nisko';
        this.applyCategoryMapping(match); // Mapuj na 50-69%
        poziomZaNisko.push(match);
      } else if (this.isInnaPlec(dopasowanie)) {
        match.kategoria = 'inna_plec';
        this.applyCategoryMapping(match); // Mapuj na 70-89%
        innaPlec.push(match);
      } else if (this.isNaSile(dopasowanie)) {
        match.kategoria = 'na_sile';
        this.applyCategoryMapping(match); // Mapuj na 30-49%
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
  private static isIdealne(dopasowanie: Record<string, string>): boolean {
    return Object.values(dopasowanie).every(status => 
      typeof status === 'string' && status.includes('✅ zielony')
    );
  }

  /**
   * Sprawdza czy narta to alternatywa (poziom OK, płeć OK, tylko JEDNO kryterium nie idealne)
   * ZMIANA: Akceptuje też czerwone przeznaczenie - ważniejsze jest dopasowanie fizyczne
   */
  private static isAlternatywy(dopasowanie: Record<string, string>): boolean {
    const poziomOk = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('✅ zielony');
    const plecOk = typeof dopasowanie.plec === 'string' && dopasowanie.plec.includes('✅ zielony');
    
    if (!poziomOk || !plecOk) return false;
    
    const nieZieloneKryteria = Object.entries(dopasowanie)
      .filter(([, status]) => typeof status === 'string' && !status.includes('✅ zielony'))
      .map(([kryterium]) => kryterium);
    
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
  private static isPoziomZaNisko(dopasowanie: Record<string, string>): boolean {
    const poziomZaNisko = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('niższy poziom narty');
    if (!poziomZaNisko) return false;
    
    // Sprawdź czy WSZYSTKIE inne kryteria są na zielono (poza przeznaczeniem)
    return Object.entries(dopasowanie)
      .filter(([kryterium]) => kryterium !== 'poziom' && kryterium !== 'przeznaczenie')
      .every(([, status]) => typeof status === 'string' && status.includes('✅ zielony'));
  }

  /**
   * Sprawdza czy narta ma niepasującą płeć (wszystkie inne kryteria na zielono)
   * ZMIANA: Akceptuje też czerwone przeznaczenie - różnica w płci jest mniejszym problemem
   */
  private static isInnaPlec(dopasowanie: Record<string, string>): boolean {
    const plecStatus = dopasowanie.plec;
    const plecZaNisko = typeof plecStatus === 'string' && plecStatus.includes('🟡 żółty') && 
      (plecStatus.includes('Narta męska') || plecStatus.includes('Narta kobieca'));
    
    if (!plecZaNisko) return false;
    
    // Sprawdź czy WSZYSTKIE inne kryteria są na zielono (poza przeznaczeniem)
    return Object.entries(dopasowanie)
      .filter(([kryterium]) => kryterium !== 'plec' && kryterium !== 'przeznaczenie')
      .every(([, status]) => typeof status === 'string' && status.includes('✅ zielony'));
  }

  /**
   * Sprawdza czy narta to "na siłę" (z tolerancjami)
   * NOWE REGUŁY (zaktualizowane 2025-10-08) - WYŁĄCZAJĄCE:
   * REGUŁA 1: poziom za niski + waga ALBO wzrost na żółto (wykracza o 5 cm/kg poza tolerancję zieloną)
   * REGUŁA 2: USUNIĘTA - narty z poziomem wyższym nie są wyświetlane w "NA SIŁĘ"
   * REGUŁA 3: waga+wzrost w tolerancji żółtej (wykracza o 5 cm/kg poza tolerancję zieloną) + poziom zielony
   * REGUŁA 4: waga ALBO wzrost w czerwonej tolerancji (więcej niż 5 poza zieloną tolerancją)
   * 
   * WAŻNE: Reguły są WYŁĄCZAJĄCE - jeśli jedna reguła pasuje, inne nie mogą się zastosować!
   */
  private static isNaSile(dopasowanie: Record<string, string>): boolean {
    this.logger.debug('Sprawdzanie kategorii NA SIŁĘ dla:', dopasowanie);
    
    // Sprawdź statusy poziomu
    const poziomZaWysoki = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('poziom za wysoki');
    const poziomZaNiski = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('niższy poziom narty');
    const poziomZielony = typeof dopasowanie.poziom === 'string' && dopasowanie.poziom.includes('✅ zielony');
    
    // Sprawdź tolerancje wagi i wzrostu (żółte = 1-5 różnicy)
    const wagaNaZolto = typeof dopasowanie.waga === 'string' && dopasowanie.waga.includes('🟡 żółty');
    const wzrostNaZolto = typeof dopasowanie.wzrost === 'string' && dopasowanie.wzrost.includes('🟡 żółty');
    
    // Sprawdź czerwone tolerancje (czerwone = 6-10 różnicy)
    const wagaNaCzerwono = typeof dopasowanie.waga === 'string' && dopasowanie.waga.includes('🔴 czerwony');
    const wzrostNaCzerwono = typeof dopasowanie.wzrost === 'string' && dopasowanie.wzrost.includes('🔴 czerwony');
    
    // Sprawdź czy waga i wzrost są zielone (idealne)
    const wagaZielona = typeof dopasowanie.waga === 'string' && dopasowanie.waga.includes('✅ zielony');
    const wzrostZielony = typeof dopasowanie.wzrost === 'string' && dopasowanie.wzrost.includes('✅ zielony');
    
    this.logger.debug('Analiza statusów:', {
      poziomZaWysoki,
      poziomZaNiski,
      poziomZielony,
      wagaNaZolto,
      wzrostNaZolto,
      wagaNaCzerwono,
      wzrostNaCzerwono,
      wagaZielona,
      wzrostZielony,
      plecZielona: typeof dopasowanie.plec === 'string' && dopasowanie.plec.includes('✅ zielony')
    });
    
    // REGUŁA 1: poziom za niski + waga ALBO wzrost na żółto (WYŁĄCZAJĄCA)
    if (poziomZaNiski && (wagaNaZolto || wzrostNaZolto)) {
      this.logger.debug('✅ REGUŁA 1 zastosowana (poziom za niski + waga/wzrost żółte)');
      return true;
    }
    
    // REGUŁA 2: USUNIĘTA - narty z poziomem wyższym nie są wyświetlane w "NA SIŁĘ"
    
    // REGUŁA 3: waga+wzrost w tolerancji żółtej + poziom zielony (WYŁĄCZAJĄCA - tylko gdy poziom zielony)
    if (poziomZielony && wagaNaZolto && wzrostNaZolto) {
      this.logger.debug('✅ REGUŁA 3 zastosowana (waga+wzrost żółte + poziom zielony)');
      return true;
    }
    
    // REGUŁA 4: waga ALBO wzrost w czerwonej tolerancji (WYŁĄCZAJĄCA - tylko czerwone tolerancje)
    // UWAGA: Czerwone tolerancje (6-10 różnicy) są za duże dla kategorii NA SIŁĘ!
    // Ta reguła może być zbyt liberalna - sprawdź czy nie powinna być usunięta
    if (wagaNaCzerwono || wzrostNaCzerwono) {
      this.logger.warn('⚠️ REGUŁA 4 zastosowana (waga/wzrost czerwone) - SPRAWDŹ CZY TO PRAWIDŁOWE!');
      this.logger.debug('Statusy:', { wagaNaCzerwono, wzrostNaCzerwono, waga: dopasowanie.waga, wzrost: dopasowanie.wzrost });
      return true;
    }
    
    this.logger.debug('❌ Żadna reguła nie pasuje - nie jest NA SIŁĘ');
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
          this.logger.warn(`Błąd parsowania poziomu "${poziomText}":`, error);
          continue;
        }
      }
    }
    
    this.logger.warn(`Nieznany format poziomu: "${poziomText}"`);
    return null;
  }

  /**
   * Sprawdza dopasowanie poziomu
   * Klient poziom 4, narta poziom 3 = narta trudniejsza (poziom narty niżej) ↑
   * Klient poziom 4, narta poziom 4 = idealne
   * Klient poziom 4, narta poziom 5 = narta łatwiejsza (niższy poziom narty) ↓
   * ZWRACA: { status, points, color, diff }
   */
  private static checkPoziom(userPoziom: number, skiPoziomMin: number): { status: string; points: number; color: 'green' | 'yellow' | 'red'; diff: number } | null {
    const diff = userPoziom - skiPoziomMin;

    if (userPoziom >= skiPoziomMin) {
      // Narta jest łatwiejsza (poziom narty jest niżej)
      if (userPoziom >= skiPoziomMin + TOLERANCE_CONFIG.poziom.yellowThreshold) {
        return { status: `🟡 żółty (niższy poziom narty ${Math.abs(diff)}↓)`, points: 0, color: 'yellow', diff };
      }
      return { status: '✅ zielony', points: 1, color: 'green', diff: 0 };
    } else if (userPoziom >= skiPoziomMin - TOLERANCE_CONFIG.poziom.yellowThreshold) {
      // Narta jest trudniejsza (poziom narty wyżej)
      return { status: `🟡 żółty (poziom za wysoki ${Math.abs(diff)}↑)`, points: 0, color: 'yellow', diff };
    } else if (userPoziom >= skiPoziomMin - TOLERANCE_CONFIG.poziom.maxDifference) {
      return { status: `🔴 czerwony (poziom za wysoki ${Math.abs(diff)}↑)`, points: 0, color: 'red', diff };
    }
    return null;
  }

  /**
   * Sprawdza dopasowanie płci
   * ZWRACA: { status, points, color }
   */
  private static checkPlec(userPlec: string, skiPlec: string): { status: string; points: number; color: 'green' | 'yellow' | 'red' } {
    // Normalizuj stary format D → K
    const normalizedSkiPlec = skiPlec === 'D' ? 'K' : skiPlec;
    const normalizedUserPlec = userPlec === 'D' ? 'K' : userPlec;
    
    // Jeśli użytkownik wybrał 'W' (wszyscy) - wszystko pasuje
    if (normalizedUserPlec === 'W') {
      return { status: '✅ zielony (wszyscy)', points: 1, color: 'green' };
    }
    
    if (normalizedSkiPlec === 'U' || normalizedSkiPlec === 'W') {
      return { status: '✅ zielony (unisex)', points: 1, color: 'green' };
    } else if (normalizedUserPlec === 'M' && normalizedSkiPlec === 'M') {
      return { status: '✅ zielony', points: 1, color: 'green' };
    } else if (normalizedUserPlec === 'K' && normalizedSkiPlec === 'K') {
      return { status: '✅ zielony', points: 1, color: 'green' };
    } else if (normalizedUserPlec === 'M' && normalizedSkiPlec === 'K') {
      return { status: '🟡 żółty - Narta kobieca', points: 0, color: 'yellow' };
    } else if (normalizedUserPlec === 'K' && normalizedSkiPlec === 'M') {
      return { status: '🟡 żółty - Narta męska', points: 0, color: 'yellow' };
    } else {
      return { status: '🔴 czerwony (niezgodna płeć)', points: 0, color: 'red' };
    }
  }

  /**
   * Sprawdza dopasowanie wagi
   * ZWRACA: { status, points, color, diff }
   */
  private static checkWaga(userWaga: number, wagaMin: number, wagaMax: number): { status: string; points: number; color: 'green' | 'yellow' | 'red'; diff: number } {
    let diff = 0;
    if (userWaga >= wagaMin && userWaga <= wagaMax) {
      return { status: '✅ zielony', points: 1, color: 'green', diff: 0 };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + TOLERANCE_CONFIG.waga.yellowTolerance) {
      diff = userWaga - wagaMax;
      return { status: `🟡 żółty (${diff}↑ kg za duża)`, points: 0, color: 'yellow', diff };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - TOLERANCE_CONFIG.waga.yellowTolerance) {
      diff = wagaMin - userWaga;
      return { status: `🟡 żółty (${diff}↓ kg za mała)`, points: 0, color: 'yellow', diff };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + TOLERANCE_CONFIG.waga.redTolerance) {
      diff = userWaga - wagaMax;
      return { status: `🔴 czerwony (${diff}↑ kg za duża)`, points: 0, color: 'red', diff };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - TOLERANCE_CONFIG.waga.redTolerance) {
      diff = wagaMin - userWaga;
      return { status: `🔴 czerwony (${diff}↓ kg za mała)`, points: 0, color: 'red', diff };
    } else {
      diff = userWaga > wagaMax ? userWaga - wagaMax : wagaMin - userWaga;
      return { status: '🔴 czerwony (niedopasowana)', points: 0, color: 'red', diff };
    }
  }

  /**
   * Sprawdza dopasowanie wzrostu
   * ZWRACA: { status, points, color, diff }
   */
  private static checkWzrost(userWzrost: number, wzrostMin: number, wzrostMax: number): { status: string; points: number; color: 'green' | 'yellow' | 'red'; diff: number } {
    let diff = 0;
    if (userWzrost >= wzrostMin && userWzrost <= wzrostMax) {
      return { status: '✅ zielony', points: 1, color: 'green', diff: 0 };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + TOLERANCE_CONFIG.wzrost.yellowTolerance) {
      diff = userWzrost - wzrostMax;
      return { status: `🟡 żółty (${diff}↑ cm za duży)`, points: 0, color: 'yellow', diff };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - TOLERANCE_CONFIG.wzrost.yellowTolerance) {
      diff = wzrostMin - userWzrost;
      return { status: `🟡 żółty (${diff}↓ cm za mały)`, points: 0, color: 'yellow', diff };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + TOLERANCE_CONFIG.wzrost.redTolerance) {
      diff = userWzrost - wzrostMax;
      return { status: `🔴 czerwony (${diff}↑ cm za duży)`, points: 0, color: 'red', diff };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - TOLERANCE_CONFIG.wzrost.redTolerance) {
      diff = wzrostMin - userWzrost;
      return { status: `🔴 czerwony (${diff}↓ cm za mały)`, points: 0, color: 'red', diff };
    } else {
      diff = userWzrost > wzrostMax ? userWzrost - wzrostMax : wzrostMin - userWzrost;
      return { status: '🔴 czerwony (niedopasowany)', points: 0, color: 'red', diff };
    }
  }

  /**
   * Sprawdza dopasowanie przeznaczenia (NOWY FORMAT - tablica stylów)
   * ZWRACA: { status, points, color }
   */
  private static checkPrzeznaczenie(userStyles: string[], skiPrzeznaczenie: string): { status: string; points: number; color: 'green' | 'yellow' | 'red' } {
    // Jeśli brak stylów - wszystko pasuje
    if (!userStyles || userStyles.length === 0) {
      return { status: '✅ zielony', points: 1, color: 'green' };
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
      return { status: '✅ zielony', points: 1, color: 'green' };
    } else {
      return { status: '🔴 czerwony', points: 0, color: 'red' };
    }
  }

  /**
   * NOWY SYSTEM PROCENTOWY - mapuje bazowy wynik (0-100) na przedziały kategorii
   * Przedziały:
   * - Idealne: 90-100% (baseScore już jest w tym przedziale - bez transformacji!)
   * - Alternatywy/Inna płeć: 70-89%
   * - Poziom za nisko: 50-69%
   * - Na siłę: 30-49%
   */
  private static mapToCategory(baseScore: number, kategoria: string): number {
    // baseScore to wynik 0-100 na podstawie kryteriów
    
    switch (kategoria) {
      case 'idealne':
        // Dla idealnych: bazowy wynik już jest 90-100%, NIE TRANSFORMUJ!
        // 100 bazowy → 100% (idealnie w środku)
        // 96 bazowy → 96% (lekko obok środka)
        // 90 bazowy → 90% (na brzegu zakresu)
        return Math.round(Math.max(90, Math.min(100, baseScore)));
        
      case 'alternatywy':
      case 'inna_plec':
        // Mapuj 0-100 → 70-89 (liniowo)
        return Math.round(70 + (baseScore * 0.19));
        
      case 'poziom_za_nisko':
        // Mapuj 0-100 → 50-69 (liniowo)
        return Math.round(50 + (baseScore * 0.19));
        
      case 'na_sile':
        // Mapuj 0-100 → 30-49 (liniowo)
        return Math.round(30 + (baseScore * 0.19));
        
      default:
        return baseScore;
    }
  }

  /**
   * NOWY UPROSZCZONY SYSTEM PUNKTACJI
   * Oblicza bazowy wynik 0-100 na podstawie jakości dopasowania kryteriów
   * Kategoria zostanie zmapowana później w mapToCategory()
   */
  private static calculateCompatibility(criteriaResults: { dopasowanie: Record<string, string>; zielonePunkty: number }, ski: SkiData, criteria: SearchCriteria): number {
    const { dopasowanie } = criteriaResults;
    
    // Oblicz wynik dla każdego kryterium z wagami
    const weights = {
      poziom: 0.40,      // 40% - najważniejsze
      waga: 0.25,        // 25%
      wzrost: 0.20,      // 20%
      plec: 0.10,        // 10%
      przeznaczenie: 0.05 // 5%
    };
    
    let totalScore = 0;
    
    // Oblicz wynik dla każdego kryterium
    for (const [criterion, status] of Object.entries(dopasowanie)) {
      const weight = weights[criterion as keyof typeof weights] || 0;
      let criterionScore = 0;
      
      if (typeof status === 'string') {
        if (status.includes('✅ zielony')) {
          // Zielony = pełny wynik + bonus za precyzję
          criterionScore = 100;
          
          // Dodaj bonus za precyzję dla wagi i wzrostu
          if (criterion === 'waga') {
            const precision = this.calculateRangePrecisionPercent(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
            criterionScore = precision;
          } else if (criterion === 'wzrost') {
            const precision = this.calculateRangePrecisionPercent(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
            criterionScore = precision;
          }
        } else if (status.includes('🟡 żółty')) {
          // Żółty = częściowy wynik (60-80% w zależności od kryterium)
          criterionScore = this.getYellowScore(criterion, status);
        } else if (status.includes('🔴 czerwony')) {
          // Czerwony = niski wynik (20-40%)
          criterionScore = this.getRedScore(criterion, status);
        }
      }
      
      totalScore += criterionScore * weight;
    }
    
    return Math.round(totalScore);
  }
  
  /**
   * Oblicza precyzję dla zakresów jako procent (90-100%)
   */
  private static calculateRangePrecisionPercent(userValue: number, min: number, max: number): number {
    const center = (min + max) / 2;
    const range = max - min;
    
    // Jeśli zakres jest bardzo mały (≤2), zawsze 100%
    if (range <= 2) {
      return 100;
    }
    
    // Oblicz odległość od środka jako procent zakresu
    const distanceFromCenter = Math.abs(userValue - center);
    const distancePercent = (distanceFromCenter / (range / 2)) * 100;
    
    // Mapuj odległość na procenty: 0% = 100%, 100% = 90%
    const score = 100 - (distancePercent * 0.1);
    
    return Math.round(Math.max(90, Math.min(100, score)));
  }
  
  /**
   * Zwraca wynik dla żółtych statusów
   */
  private static getYellowScore(criterion: string, status: string): number {
    switch (criterion) {
      case 'poziom':
        return 70; // 1 poziom różnicy
      case 'waga':
      case 'wzrost': {
        // Ekstrahuj różnicę i oblicz wynik
        const match = status.match(/(\d+)[↑↓]/);
        if (match) {
          const diff = parseInt(match[1]);
          // 1-5: 80-60%
          return Math.max(60, 80 - (diff * 4));
        }
        return 70;
      }
      case 'plec':
        return 60; // Inna płeć
      case 'przeznaczenie':
        return 50; // Inne przeznaczenie
      default:
        return 70;
    }
  }
  
  /**
   * Zwraca wynik dla czerwonych statusów
   */
  private static getRedScore(criterion: string, status: string): number {
    switch (criterion) {
      case 'poziom':
        return 40; // 2 poziomy różnicy
      case 'waga':
      case 'wzrost': {
        // Ekstrahuj różnicę i oblicz wynik
        const match = status.match(/(\d+)[↑↓]/);
        if (match) {
          const diff = parseInt(match[1]);
          // 6-10: 40-20%
          return Math.max(20, 40 - ((diff - 5) * 4));
        }
        return 30;
      }
      case 'plec':
        return 20; // Bardzo niezgodna płeć
      case 'przeznaczenie':
        return 30; // Bardzo inne przeznaczenie
      default:
        return 30;
    }
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
  private static getSimpleAvailabilityScore(_ski: SkiData): number {
    // Na razie zwracamy 1 (dostępne) - później można dodać cache
    return 1;
  }

  /**
   * LEPsze SORTOWANIE WYNIKÓW - najpierw dostępne, potem według dopasowania
   */
  static sortResultsByAvailabilityAndCompatibility(matches: SkiMatch[], _reservationCache?: unknown): SkiMatch[] {
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
   * Sortuje wszystkie kategorie wyników według dostępności i dopasowania
   */
  static sortAllResultsByAvailabilityAndCompatibility(results: SearchResults, reservationCache?: unknown): SearchResults {
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
   * NOWA FUNKCJA: Zwraca szczegóły dopasowania dla pojedynczej narty.
   * Używana w widoku "Przeglądaj" do kolorowania komórek.
   * @param ski - Obiekt narty do sprawdzenia.
   * @param criteria - Kryteria wprowadzone przez użytkownika.
   * @returns Obiekt MatchDetails z kolorami i różnicami dla każdego kryterium.
   */
  public static getMatchDetails(ski: SkiData, criteria: Partial<SearchCriteria>): MatchDetails {
    const details: MatchDetails = {};

    // 1. Sprawdź POZIOM
    if (criteria.poziom && criteria.plec && ski.POZIOM) {
      const poziomResult = this.parsePoziom(ski.POZIOM, criteria.plec);
      if (poziomResult) {
        const [poziom_min] = poziomResult;
        const poziomCheck = this.checkPoziom(criteria.poziom, poziom_min);
        if (poziomCheck) {
          details.poziom = {
            color: poziomCheck.color,
            diff: poziomCheck.diff,
          };
        }
      }
    }

    // 2. Sprawdź WAGĘ
    if (criteria.waga && ski.WAGA_MIN && ski.WAGA_MAX) {
      const wagaCheck = this.checkWaga(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
      details.waga = {
        color: wagaCheck.color,
        diff: wagaCheck.diff,
      };
    }

    // 3. Sprawdź WZROST
    if (criteria.wzrost && ski.WZROST_MIN && ski.WZROST_MAX) {
      const wzrostCheck = this.checkWzrost(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
      details.wzrost = {
        color: wzrostCheck.color,
        diff: wzrostCheck.diff,
      };
    }

    // 4. Sprawdź PŁEĆ
    if (criteria.plec && ski.PLEC) {
      const plecCheck = this.checkPlec(criteria.plec, ski.PLEC);
      details.plec = {
        color: plecCheck.color,
        diff: plecCheck.color === 'green' ? 0 : 1, // 0 dla dopasowania, 1 dla niedopasowania
      };
    }

    this.logger.debug(`getMatchDetails dla ${ski.MARKA} ${ski.MODEL}:`, details);
    return details;
  }
}
