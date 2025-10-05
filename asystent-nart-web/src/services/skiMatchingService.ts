// Serwis dopasowywania nart - przeniesiony z Python
import type { SkiData, SearchCriteria, SkiMatch, SearchResults } from '../types/ski.types';

// Stałe tolerancji (z Python)
const POZIOM_TOLERANCJA_W_DOL = 2;
const WAGA_TOLERANCJA = 5;
const WZROST_TOLERANCJA = 5;

export class SkiMatchingService {
  /**
   * Główna funkcja wyszukiwania nart - teraz z osobnymi wyszukiwaniami dla każdej kategorii
   */
  static findMatchingSkis(skis: SkiData[], criteria: SearchCriteria): SearchResults {
    console.log(`SkiMatchingService: Wyszukiwanie nart dla kryteriów:`, criteria);
    
    // Znajdź narty w każdej kategorii osobno
    const idealne = this.findIdealneDopasowania(skis, criteria);
    const alternatywy = this.findAlternatywy(skis, criteria);
    const poziomZaNisko = this.findPoziomZaNisko(skis, criteria);
    const innaPlec = this.findInnaPlec(skis, criteria);
    
    // Zbierz narty, które już są w innych kategoriach (żeby wykluczyć je z NA SIŁĘ)
    const juzWybrane = new Set<string>();
    for (const kategoria of [idealne, alternatywy, poziomZaNisko, innaPlec]) {
      for (const narta of kategoria) {
        const nartaId = `${narta.ski.MARKA}|${narta.ski.MODEL}|${narta.ski.DLUGOSC}`;
        juzWybrane.add(nartaId);
      }
    }
    
    const naSile = this.findNaSile(skis, criteria, juzWybrane);

    // Połącz wszystkie wyniki
    const wszystkie = [...idealne, ...alternatywy, ...poziomZaNisko, ...innaPlec, ...naSile];
    
    // Sortuj według kompatybilności
    wszystkie.sort((a, b) => b.compatibility - a.compatibility);

    console.log(`SkiMatchingService: Znaleziono: ${idealne.length} idealnych, ${alternatywy.length} alternatyw, ${poziomZaNisko.length} poziom za nisko, ${innaPlec.length} inna płeć, ${naSile.length} na siłę`);

    return {
      idealne,
      alternatywy,
      poziom_za_nisko: poziomZaNisko,
      inna_plec: innaPlec,
      na_sile: naSile,
      wszystkie
    };
  }

  /**
   * Znajduje narty z idealnym dopasowaniem (wszystkie kryteria na zielono)
   */
  private static findIdealneDopasowania(skis: SkiData[], criteria: SearchCriteria): SkiMatch[] {
    const idealne: SkiMatch[] = [];
    
    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, criteria);
      if (match) {
        // Sprawdź czy WSZYSTKIE kryteria są na zielono
        const dopasowanie = match.dopasowanie;
        let wszystkieZielone = true;
        
        for (const [kryterium, status] of Object.entries(dopasowanie)) {
          if (!status.includes('✅ zielony')) {
            wszystkieZielone = false;
            break;
          }
        }
        
        if (wszystkieZielone) {
          match.kategoria = 'idealne';
          idealne.push(match);
        }
      }
    }
    
    return idealne;
  }

  /**
   * Znajduje narty alternatywne (poziom OK, płeć OK, ale tylko JEDNO kryterium nie idealne)
   */
  private static findAlternatywy(skis: SkiData[], criteria: SearchCriteria): SkiMatch[] {
    const alternatywy: SkiMatch[] = [];
    
    console.log("SkiMatchingService: Szukam alternatyw: poziom OK, płeć OK, ale tylko JEDNO kryterium nie idealne");
    
    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, criteria);
      if (match) {
        const dopasowanie = match.dopasowanie;
        
        // Sprawdź czy poziom i płeć są OK
        const poziomOk = dopasowanie.poziom.includes('✅ zielony');
        const plecOk = dopasowanie.plec.includes('✅ zielony');
        
        if (poziomOk && plecOk) {
          // Sprawdź czy nie jest idealna (wszystkie kryteria zielone)
          let wszystkieZielone = true;
          for (const status of Object.values(dopasowanie)) {
            if (!status.includes('✅ zielony')) {
              wszystkieZielone = false;
              break;
            }
          }
          
          // Jeśli nie jest idealna, sprawdź czy tylko JEDNO kryterium nie jest zielone
          if (!wszystkieZielone) {
            const nieZieloneKryteria = Object.entries(dopasowanie)
              .filter(([_, status]) => !status.includes('✅ zielony'))
              .map(([kryterium, _]) => kryterium);
            
            // Tylko narty z JEDNYM kryterium nie idealnym
            if (nieZieloneKryteria.length === 1) {
              match.kategoria = 'alternatywy';
              alternatywy.push(match);
              console.log(`SkiMatchingService: Znaleziono alternatywę: ${ski.MARKA} ${ski.MODEL} - problem z: ${nieZieloneKryteria[0]}`);
            }
          }
        }
      }
    }
    
    console.log(`SkiMatchingService: Znaleziono ${alternatywy.length} alternatyw`);
    return alternatywy;
  }

  /**
   * Znajduje narty z poziomem za niskim (wszystkie inne kryteria na zielono)
   */
  private static findPoziomZaNisko(skis: SkiData[], criteria: SearchCriteria): SkiMatch[] {
    const poziomZaNisko: SkiMatch[] = [];
    
    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, criteria);
      if (match && match.dopasowanie.poziom.includes('🟡 żółty')) {
        // Sprawdź czy WSZYSTKIE inne kryteria są na zielono
        const dopasowanie = match.dopasowanie;
        let wszystkieInneZielone = true;
        
        for (const [kryterium, status] of Object.entries(dopasowanie)) {
          if (kryterium === 'poziom') continue; // Pomiń poziom - ma być pomarańczowy
          if (!status.includes('✅ zielony')) {
            wszystkieInneZielone = false;
            break;
          }
        }
        
        if (wszystkieInneZielone) {
          match.kategoria = 'poziom_za_nisko';
          poziomZaNisko.push(match);
        }
      }
    }
    
    return poziomZaNisko;
  }

  /**
   * Znajduje narty z niepasującą płcią (wszystkie inne kryteria na zielono)
   */
  private static findInnaPlec(skis: SkiData[], criteria: SearchCriteria): SkiMatch[] {
    const innaPlec: SkiMatch[] = [];
    
    console.log(`SkiMatchingService: Szukam nart INNA PŁEĆ dla: plec=${criteria.plec}`);
    
    for (const ski of skis) {
      const match = this.checkSkiMatch(ski, criteria);
      if (match) {
        const dopasowanie = match.dopasowanie;
        
        // Sprawdź czy to problem z płcią (żółty status)
        const plecStatus = dopasowanie.plec;
        if (plecStatus.includes('🟡 żółty') && (plecStatus.includes('Narta męska') || plecStatus.includes('Narta kobieca'))) {
          // Sprawdź czy WSZYSTKIE inne kryteria są na zielono
          let wszystkieInneZielone = true;
          for (const [kryterium, status] of Object.entries(dopasowanie)) {
            if (kryterium === 'plec') continue; // Pomiń płeć - ma być żółta
            if (!status.includes('✅ zielony')) {
              wszystkieInneZielone = false;
              break;
            }
          }
          
          if (wszystkieInneZielone) {
            match.kategoria = 'inna_plec';
            innaPlec.push(match);
            console.log(`SkiMatchingService: Znaleziono nartę INNA PŁEĆ: ${ski.MARKA} ${ski.MODEL}`);
          }
        }
      }
    }
    
    console.log(`SkiMatchingService: Znaleziono ${innaPlec.length} nart INNA PŁEĆ`);
    return innaPlec;
  }

  /**
   * Znajduje narty 'NA SIŁĘ' - z większymi tolerancjami
   */
  private static findNaSile(skis: SkiData[], criteria: SearchCriteria, juzWybrane: Set<string>): SkiMatch[] {
    const naSile: SkiMatch[] = [];
    
    console.log("SkiMatchingService: Szukam nart NA SIŁĘ: z tolerancjami 10± lub poziom za nisko + tolerancja 5±");
    
    for (const ski of skis) {
      // Sprawdź czy narta już jest w innych kategoriach
      const nartaId = `${ski.MARKA}|${ski.MODEL}|${ski.DLUGOSC}`;
      if (juzWybrane.has(nartaId)) {
        continue;
      }

      const match = this.checkSkiMatchNaSile(ski, criteria);
      if (match) {
        match.kategoria = 'na_sile';
        naSile.push(match);
        console.log(`SkiMatchingService: Znaleziono nartę NA SIŁĘ: ${ski.MARKA} ${ski.MODEL}`);
      }
    }
    
    console.log(`SkiMatchingService: Znaleziono ${naSile.length} nart NA SIŁĘ`);
    return naSile;
  }

  /**
   * Sprawdza dopasowanie pojedynczej narty dla kategorii NA SIŁĘ (z większymi tolerancjami)
   */
  private static checkSkiMatchNaSile(ski: SkiData, criteria: SearchCriteria): SkiMatch | null {
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

    // Sprawdź czy poziom nie jest za niski (maksymalnie 2 poziomy różnicy)
    if (criteria.poziom < poziom_min - 2) {
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

    // 3. Sprawdź wagę z tolerancją 10±
    const wagaCheck = this.checkWagaNaSile(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
    dopasowanie.waga = wagaCheck.status;
    zielone_punkty += wagaCheck.points;

    // 4. Sprawdź wzrost z tolerancją 10±
    const wzrostCheck = this.checkWzrostNaSile(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
    dopasowanie.wzrost = wzrostCheck.status;
    zielone_punkty += wzrostCheck.points;

    // 5. Sprawdź przeznaczenie (styl jazdy)
    const przeznaczenieCheck = this.checkPrzeznaczenie(criteria.styl_jazdy, ski.PRZEZNACZENIE);
    dopasowanie.przeznaczenie = przeznaczenieCheck.status;
    zielone_punkty += przeznaczenieCheck.points;

    // Sprawdź czy to kandydat na "NA SIŁĘ" - tylko 4 opcje:
    // 1. Poziom za niski + wzrost w tolerancji 5 (TYLKO wzrost, nie waga)
    // 2. Poziom za niski + waga w tolerancji 5 (TYLKO waga, nie wzrost)
    // 3. Waga w tolerancji 10 (TYLKO waga, poziom OK)
    // 4. Wzrost w tolerancji 10 (TYLKO wzrost, poziom OK)
    let isNaSile = false;
    
    // PŁEĆ MUSI PASOWAĆ (być zielona) w kategorii NA SIŁĘ
    if (dopasowanie.plec.includes('✅ zielony')) {
      const poziomZaNisko = dopasowanie.poziom.includes('🟡 żółty');
      const wzrostWOkresie = dopasowanie.wzrost.includes('✅ zielony') || dopasowanie.wzrost.includes('🟡 żółty');
      const wagaWOkresie = dopasowanie.waga.includes('✅ zielony') || dopasowanie.waga.includes('🟡 żółty');
      
      // Opcja 1: Poziom za niski + wzrost w tolerancji 5 (TYLKO wzrost)
      if (poziomZaNisko && wzrostWOkresie && dopasowanie.waga.includes('✅ zielony')) {
        isNaSile = true;
      }
      // Opcja 2: Poziom za niski + waga w tolerancji 5 (TYLKO waga)
      else if (poziomZaNisko && wagaWOkresie && dopasowanie.wzrost.includes('✅ zielony')) {
        isNaSile = true;
      }
      // Opcja 3: Waga w tolerancji 10 (TYLKO waga, poziom OK)
      else if (!poziomZaNisko && wagaWOkresie && dopasowanie.wzrost.includes('✅ zielony')) {
        isNaSile = true;
      }
      // Opcja 4: Wzrost w tolerancji 10 (TYLKO wzrost, poziom OK)
      else if (!poziomZaNisko && wzrostWOkresie && dopasowanie.waga.includes('✅ zielony')) {
        isNaSile = true;
      }
    }

    if (!isNaSile) {
      return null;
    }

    // Oblicz kompatybilność (0-100)
    const compatibility = this.calculateCompatibility(zielone_punkty);

    return {
      ski,
      compatibility,
      dopasowanie,
      kategoria: 'na_sile' as const,
      zielone_punkty
    };
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
    if (skiPlec === 'U') {
      return { status: '✅ zielony (unisex)', points: 1 };
    } else if (userPlec === 'M' && skiPlec === 'M') {
      return { status: '✅ zielony', points: 1 };
    } else if (userPlec === 'K' && (skiPlec === 'K' || skiPlec === 'D')) {
      return { status: '✅ zielony', points: 1 };
    } else if (userPlec === 'M' && (skiPlec === 'K' || skiPlec === 'D')) {
      return { status: '🟡 żółty - Narta kobieca', points: 0 };
    } else if (userPlec === 'K' && skiPlec === 'M') {
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
    } else if (userWaga > wagaMax && userWaga <= wagaMax + WAGA_TOLERANCJA) {
      return { status: '🟡 żółty (o ' + (userWaga - wagaMax) + ' kg za duża)', points: 0 };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - WAGA_TOLERANCJA) {
      return { status: '🟡 żółty (o ' + (wagaMin - userWaga) + ' kg za mała)', points: 0 };
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
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + WZROST_TOLERANCJA) {
      return { status: '🟡 żółty (o ' + (userWzrost - wzrostMax) + ' cm za duży)', points: 0 };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - WZROST_TOLERANCJA) {
      return { status: '🟡 żółty (o ' + (wzrostMin - userWzrost) + ' cm za mały)', points: 0 };
    } else {
      return { status: '🔴 czerwony (niedopasowany)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wagi z tolerancją dla kategorii NA SIŁĘ - czerwone dla 5-10
   */
  private static checkWagaNaSile(userWaga: number, wagaMin: number, wagaMax: number): { status: string; points: number } {
    if (userWaga >= wagaMin && userWaga <= wagaMax) {
      return { status: '✅ zielony', points: 1 };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + 5) { // Tolerancja 5±
      return { status: '🟡 żółty (o ' + (userWaga - wagaMax) + ' kg za duża)', points: 0 };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - 5) { // Tolerancja 5±
      return { status: '🟡 żółty (o ' + (wagaMin - userWaga) + ' kg za mała)', points: 0 };
    } else if (userWaga > wagaMax && userWaga <= wagaMax + 10) { // Tolerancja 5-10 (czerwone)
      return { status: '🔴 czerwony (o ' + (userWaga - wagaMax) + ' kg za duża)', points: 0 };
    } else if (userWaga < wagaMin && userWaga >= wagaMin - 10) { // Tolerancja 5-10 (czerwone)
      return { status: '🔴 czerwony (o ' + (wagaMin - userWaga) + ' kg za mała)', points: 0 };
    } else {
      return { status: '🔴 czerwony (niedopasowana)', points: 0 };
    }
  }

  /**
   * Sprawdza dopasowanie wzrostu z tolerancją dla kategorii NA SIŁĘ - czerwone dla 5-10
   */
  private static checkWzrostNaSile(userWzrost: number, wzrostMin: number, wzrostMax: number): { status: string; points: number } {
    if (userWzrost >= wzrostMin && userWzrost <= wzrostMax) {
      return { status: '✅ zielony', points: 1 };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + 5) { // Tolerancja 5±
      return { status: '🟡 żółty (o ' + (userWzrost - wzrostMax) + ' cm za duży)', points: 0 };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - 5) { // Tolerancja 5±
      return { status: '🟡 żółty (o ' + (wzrostMin - userWzrost) + ' cm za mały)', points: 0 };
    } else if (userWzrost > wzrostMax && userWzrost <= wzrostMax + 10) { // Tolerancja 5-10 (czerwone)
      return { status: '🔴 czerwony (o ' + (userWzrost - wzrostMax) + ' cm za duży)', points: 0 };
    } else if (userWzrost < wzrostMin && userWzrost >= wzrostMin - 10) { // Tolerancja 5-10 (czerwone)
      return { status: '🔴 czerwony (o ' + (wzrostMin - userWzrost) + ' cm za mały)', points: 0 };
    } else {
      return { status: '🔴 czerwony (niedopasowany)', points: 0 };
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
}

