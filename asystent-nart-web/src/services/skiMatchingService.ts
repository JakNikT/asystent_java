// Serwis dopasowywania nart - przeniesiony z Python
import type { SkiData, SearchCriteria, SkiMatch, SearchResults } from '../types/ski.types';

// Stałe tolerancji (z Python)
const POZIOM_TOLERANCJA_W_DOL = 2;
const WAGA_TOLERANCJA = 5;
const WZROST_TOLERANCJA = 5;

export class SkiMatchingService {
  /**
   * Główna funkcja wyszukiwania nart
   */
  static findMatchingSkis(skis: SkiData[], criteria: SearchCriteria): SearchResults {
    const matches: SkiMatch[] = [];

    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, criteria);
      if (match) {
        matches.push(match);
      }
    }

    // Sortuj według kompatybilności
    matches.sort((a, b) => b.compatibility - a.compatibility);

    // Kategoryzuj wyniki
    return this.categorizeMatches(matches);
  }

  /**
   * Sprawdza dopasowanie pojedynczej narty
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
    if (criteria.poziom < poziom_min - POZIOM_TOLERANCJA_W_DOL) {
      return null;
    }

    // Inicjalizuj zmienne dopasowania
    const dopasowanie = {
      poziom: '',
      plec: '',
      waga: '',
      wzrost: '',
      przeznaczenie: ''
    };
    let zielone_punkty = 0;

    // 1. Sprawdź poziom
    const poziomCheck = this.checkPoziom(criteria.poziom, poziom_min);
    if (!poziomCheck) return null;
    dopasowanie.poziom = poziomCheck.status;
    zielone_punkty += poziomCheck.points;

    // 2. Sprawdź płeć
    const plecCheck = this.checkPlec(criteria.plec, ski.PLEC);
    dopasowanie.plec = plecCheck.status;
    zielone_punkty += plecCheck.points;

    // 3. Sprawdź wagę
    const wagaCheck = this.checkWaga(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
    dopasowanie.waga = wagaCheck.status;
    zielone_punkty += wagaCheck.points;

    // 4. Sprawdź wzrost
    const wzrostCheck = this.checkWzrost(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
    dopasowanie.wzrost = wzrostCheck.status;
    zielone_punkty += wzrostCheck.points;

    // 5. Sprawdź przeznaczenie (styl jazdy)
    const przeznaczenieCheck = this.checkPrzeznaczenie(criteria.styl_jazdy, ski.PRZEZNACZENIE);
    dopasowanie.przeznaczenie = przeznaczenieCheck.status;
    zielone_punkty += przeznaczenieCheck.points;

    // Oblicz kompatybilność (0-100)
    const compatibility = this.calculateCompatibility(zielone_punkty);

    // Określ kategorię
    const kategoria = this.determineCategory(zielone_punkty);

    return {
      ski,
      compatibility,
      dopasowanie,
      kategoria,
      zielone_punkty
    };
  }

  /**
   * Parsuje poziom narty (z Python)
   */
  private static parsePoziom(poziomText: string, plec: string): [number, string] | null {
    const plecText = plec === 'M' ? 'Mężczyzna' : 'Kobieta';

    // Format unisex: "5M/6D"
    if (poziomText.includes('/')) {
      try {
        const parts = poziomText.split('/');
        const pmPart = parts[0].replace('M', '').trim();
        const pdPart = parts[1].replace('D', '').trim();
        const poziomM = parseInt(pmPart);
        const poziomD = parseInt(pdPart);

        if (plecText === 'Mężczyzna') {
          return [poziomM, `PM${poziomM}/PD${poziomD}`];
        } else {
          return [poziomD, `PM${poziomM}/PD${poziomD}`];
        }
      } catch {
        return null;
      }
    }

    // Format unisex ze spacją: "5M 6D"
    if (poziomText.includes('M') && poziomText.includes('D')) {
      try {
        const parts = poziomText.split(/\s+/);
        let pmPart = '';
        let pdPart = '';

        for (const part of parts) {
          if (part.includes('M')) {
            pmPart = part.replace('M', '').trim();
          } else if (part.includes('D')) {
            pdPart = part.replace('D', '').trim();
          }
        }

        if (pmPart && pdPart) {
          const poziomM = parseInt(pmPart);
          const poziomD = parseInt(pdPart);

          if (plecText === 'Mężczyzna') {
            return [poziomM, `PM${poziomM} PD${poziomD}`];
          } else {
            return [poziomD, `PM${poziomM} PD${poziomD}`];
          }
        }
        return null;
      } catch {
        return null;
      }
    }

    // Format męski: "5M"
    if (poziomText.includes('M')) {
      try {
        const poziomMin = parseInt(poziomText.replace('M', '').trim());
        return [poziomMin, `PM${poziomMin}`];
      } catch {
        return null;
      }
    }

    // Format damski: "5D"
    if (poziomText.includes('D')) {
      try {
        const poziomMin = parseInt(poziomText.replace('D', '').trim());
        return [poziomMin, `PD${poziomMin}`];
      } catch {
        return null;
      }
    }

    // Format prosty: tylko cyfra
    if (/^\d+$/.test(poziomText.trim())) {
      try {
        const poziomMin = parseInt(poziomText.trim());
        return [poziomMin, `P${poziomMin}`];
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Sprawdza dopasowanie poziomu
   */
  private static checkPoziom(userPoziom: number, skiPoziomMin: number): { status: string; points: number } | null {
    if (userPoziom >= skiPoziomMin) {
      return { status: '✅ zielony', points: 1 };
    } else if (userPoziom >= skiPoziomMin - 1) {
      return { status: '🟡 żółty (poziom niżej)', points: 0 };
    } else if (userPoziom >= skiPoziomMin - POZIOM_TOLERANCJA_W_DOL) {
      return { status: '🔴 czerwony (2 poziomy niżej)', points: 0 };
    }
    return null;
  }

  /**
   * Sprawdza dopasowanie płci
   */
  private static checkPlec(userPlec: string, skiPlec: string): { status: string; points: number } {
    if (skiPlec === 'U' || userPlec === 'Wszyscy') {
      return { status: '✅ zielony (unisex)', points: 1 };
    } else if (userPlec === 'M' && skiPlec === 'M') {
      return { status: '✅ zielony', points: 1 };
    } else if (userPlec === 'K' && skiPlec === 'K') {
      return { status: '✅ zielony', points: 1 };
    } else {
      return { status: '🔴 czerwony (niezgodna płeć)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wagi
   */
  private static checkWaga(userWaga: number, wagaMin: number, wagaMax: number): { status: string; points: number } {
    if (userWaga >= wagaMin - WAGA_TOLERANCJA && userWaga <= wagaMax + WAGA_TOLERANCJA) {
      return { status: '✅ zielony', points: 1 };
    } else {
      return { status: '🔴 czerwony', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wzrostu
   */
  private static checkWzrost(userWzrost: number, wzrostMin: number, wzrostMax: number): { status: string; points: number } {
    if (userWzrost >= wzrostMin - WZROST_TOLERANCJA && userWzrost <= wzrostMax + WZROST_TOLERANCJA) {
      return { status: '✅ zielony', points: 1 };
    } else {
      return { status: '🔴 czerwony', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie przeznaczenia
   */
  private static checkPrzeznaczenie(userStyl: string, skiPrzeznaczenie: string): { status: string; points: number } {
    // Mapowanie stylów jazdy
    const stylMapping: { [key: string]: string[] } = {
      'Wszystkie': ['SL', 'SLG', 'G', 'C', 'SL,C', 'SLG,C', 'ALL', 'ALLM', 'UNI'],
      'Slalom': ['SL', 'SLG', 'SL,C', 'ALL', 'ALLM', 'UNI'],
      'Gigant': ['G', 'SLG', 'SLG,C', 'ALL', 'ALLM', 'UNI'],
      'Cały dzień': ['C', 'SL,C', 'SLG,C', 'ALL', 'ALLM', 'UNI'],
      'Poza trase': ['OFF', 'ALLM', 'UNI'],
      'Pomiędzy': ['SLG', 'SLG,C', 'ALL', 'ALLM', 'UNI']
    };

    const acceptedTypes = stylMapping[userStyl] || [];
    const skiTypes = skiPrzeznaczenie.split(',').map(t => t.trim());

    const matches = skiTypes.some(type => acceptedTypes.includes(type));

    if (matches) {
      return { status: '✅ zielony', points: 1 };
    } else {
      return { status: '🟡 żółty', points: 0 };
    }
  }

  /**
   * Oblicza kompatybilność (0-100)
   */
  private static calculateCompatibility(zielonePunkty: number): number {
    const maxPunkty = 5; // poziom, płeć, waga, wzrost, przeznaczenie
    return Math.round((zielonePunkty / maxPunkty) * 100);
  }

  /**
   * Określa kategorię dopasowania
   */
  private static determineCategory(zielonePunkty: number): 'idealne' | 'bardzo_dobre' | 'dobre' | 'akceptowalne' {
    if (zielonePunkty === 5) return 'idealne';
    if (zielonePunkty === 4) return 'bardzo_dobre';
    if (zielonePunkty === 3) return 'dobre';
    return 'akceptowalne';
  }

  /**
   * Kategoryzuje wyniki
   */
  private static categorizeMatches(matches: SkiMatch[]): SearchResults {
    return {
      idealne: matches.filter(m => m.kategoria === 'idealne'),
      bardzo_dobre: matches.filter(m => m.kategoria === 'bardzo_dobre'),
      dobre: matches.filter(m => m.kategoria === 'dobre'),
      akceptowalne: matches.filter(m => m.kategoria === 'akceptowalne'),
      wszystkie: matches
    };
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
}

