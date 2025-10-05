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

    // Sortuj każdą kategorię według średniej kompatybilności
    const sortByCompatibility = (matches: SkiMatch[]) => {
      return matches.sort((a, b) => {
        const avgA = this.calculateAverageCompatibility(a, criteria);
        const avgB = this.calculateAverageCompatibility(b, criteria);
        return avgB - avgA;
      });
    };

    // Sortuj wszystkie kategorie
    const sortedIdealne = sortByCompatibility(idealne);
    const sortedAlternatywy = sortByCompatibility(alternatywy);
    const sortedPoziomZaNisko = sortByCompatibility(poziomZaNisko);
    const sortedInnaPlec = sortByCompatibility(innaPlec);
    const sortedNaSile = sortByCompatibility(naSile);

    // Połącz wszystkie wyniki
    const wszystkie = [...sortedIdealne, ...sortedAlternatywy, ...sortedPoziomZaNisko, ...sortedInnaPlec, ...sortedNaSile];

    console.log(`SkiMatchingService: Znaleziono: ${idealne.length} idealnych, ${alternatywy.length} alternatyw, ${poziomZaNisko.length} poziom za nisko, ${innaPlec.length} inna płeć, ${naSile.length} na siłę`);

    return {
      idealne: sortedIdealne,
      alternatywy: sortedAlternatywy,
      poziom_za_nisko: sortedPoziomZaNisko,
      inna_plec: sortedInnaPlec,
      na_sile: sortedNaSile,
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
        
        for (const [, status] of Object.entries(dopasowanie)) {
          if (!status.includes('✅ zielony')) {
            wszystkieZielone = false;
            break;
          }
        }
        
        if (wszystkieZielone) {
          match.kategoria = 'idealne';
          idealne.push(match);
          console.log(`SkiMatchingService: Znaleziono IDEALNĄ nartę: ${ski.MARKA} ${ski.MODEL}`);
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
              const problemKryterium = nieZieloneKryteria[0];
              const problemStatus = dopasowanie[problemKryterium as keyof typeof dopasowanie];
              
              // Sprawdź czy problemowe kryterium mieści się w tolerancji 5±
              let wTolerancji = false;
              
              if (problemKryterium === 'waga' && problemStatus.includes('🟡 żółty')) {
                // Sprawdź czy różnica nie przekracza 5kg
                const match = problemStatus.match(/o (\d+)/);
                if (match && parseInt(match[1]) <= 5) {
                  wTolerancji = true;
                }
              } else if (problemKryterium === 'wzrost' && problemStatus.includes('🟡 żółty')) {
                // Sprawdź czy różnica nie przekracza 5cm
                const match = problemStatus.match(/o (\d+)/);
                if (match && parseInt(match[1]) <= 5) {
                  wTolerancji = true;
                }
              } else if (problemKryterium === 'przeznaczenie' && problemStatus.includes('🟡 żółty')) {
                // Styl jazdy w tolerancji
                wTolerancji = true;
              }
              
              // Dodaj do alternatyw tylko jeśli mieści się w tolerancji
              if (wTolerancji) {
                match.kategoria = 'alternatywy';
                alternatywy.push(match);
                console.log(`SkiMatchingService: Znaleziono alternatywę: ${ski.MARKA} ${ski.MODEL} - problem z: ${problemKryterium}`);
              }
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
      if (match && match.dopasowanie.poziom.includes('🟡 żółty (poziom za nisko)')) {
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

    // Sprawdź czy to kandydat na "NA SIŁĘ" zgodnie z dokumentacją:
    // 1. Alternatywy, ale z tolerancjami 10± zamiast 5
    // 2. Poziom za nisko, ale prócz poziomu niżej jedna z kryteriów jest w tolerancji 5±
    let isNaSile = false;
    
    // PŁEĆ MUSI PASOWAĆ (być zielona) w kategorii NA SIŁĘ
    if (dopasowanie.plec.includes('✅ zielony')) {
      const poziomZaNisko = dopasowanie.poziom.includes('🟡 żółty');
      const wzrostWOkresie = dopasowanie.wzrost.includes('✅ zielony') || dopasowanie.wzrost.includes('🟡 żółty');
      const wagaWOkresie = dopasowanie.waga.includes('✅ zielony') || dopasowanie.waga.includes('🟡 żółty');
      const przeznaczenieOk = dopasowanie.przeznaczenie.includes('✅ zielony') || dopasowanie.przeznaczenie.includes('🟡 żółty');
      
      // Opcja 1: Alternatywy z tolerancjami 10± (waga lub wzrost w tolerancji 10±)
      if (!poziomZaNisko && (wagaWOkresie || wzrostWOkresie) && przeznaczenieOk) {
        isNaSile = true;
      }
      // Opcja 2: Poziom za nisko + jedna tolerancja 5± (waga lub wzrost)
      else if (poziomZaNisko && (wagaWOkresie || wzrostWOkresie) && przeznaczenieOk) {
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
      // Sprawdź czy narta nie jest za łatwa (znacznie niższy poziom)
      if (userPoziom >= skiPoziomMin + 1) {
        return { status: '🟡 żółty (poziom za nisko)', points: 0 };
      }
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
   * Sprawdza dopasowanie przeznaczenia z precyzyjnym dopasowaniem
   */
  private static checkPrzeznaczenie(userStyl: string, skiPrzeznaczenie: string): { status: string; points: number } {
    const skiTypes = skiPrzeznaczenie.split(',').map(t => t.trim());
    
    // Jeśli użytkownik wybrał "Wszystkie", wszystko pasuje
    if (userStyl === 'Wszystkie') {
      return { status: '✅ zielony', points: 1 };
    }
    
    // Sprawdź dokładne dopasowanie dla każdego stylu
    switch (userStyl) {
      case 'Slalom':
        if (skiTypes.includes('SL')) {
          return { status: '✅ zielony', points: 1 }; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return { status: '🟡 żółty', points: 0 }; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return { status: '🟡 żółty', points: 0 }; // Uniwersalne narty
        } else {
          return { status: '🔴 czerwony', points: 0 }; // Brak dopasowania
        }
        
      case 'Gigant':
        if (skiTypes.includes('G')) {
          return { status: '✅ zielony', points: 1 }; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return { status: '🟡 żółty', points: 0 }; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return { status: '🟡 żółty', points: 0 }; // Uniwersalne narty
        } else {
          return { status: '🔴 czerwony', points: 0 }; // Brak dopasowania
        }
        
      case 'Cały dzień':
        if (skiTypes.includes('C')) {
          return { status: '✅ zielony', points: 1 }; // Idealne dopasowanie
        } else if (skiTypes.includes('SL,C') || skiTypes.includes('SLG,C')) {
          return { status: '🟡 żółty', points: 0 }; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return { status: '🟡 żółty', points: 0 }; // Uniwersalne narty
        } else {
          return { status: '🔴 czerwony', points: 0 }; // Brak dopasowania
        }
        
      case 'Poza trase':
        if (skiTypes.includes('OFF')) {
          return { status: '✅ zielony', points: 1 }; // Idealne dopasowanie
        } else if (skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return { status: '🟡 żółty', points: 0 }; // Uniwersalne narty
        } else {
          return { status: '🔴 czerwony', points: 0 }; // Brak dopasowania
        }
        
      case 'Pomiędzy':
        if (skiTypes.includes('SLG')) {
          return { status: '✅ zielony', points: 1 }; // Idealne dopasowanie
        } else if (skiTypes.includes('SL') || skiTypes.includes('G')) {
          return { status: '🟡 żółty', points: 0 }; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return { status: '🟡 żółty', points: 0 }; // Uniwersalne narty
        } else {
          return { status: '🔴 czerwony', points: 0 }; // Brak dopasowania
        }
        
      default:
        return { status: '🔴 czerwony', points: 0 };
    }
  }

  /**
   * Oblicza kompatybilność (0-100) - stara metoda na podstawie zielonych punktów
   */
  private static calculateCompatibility(zielonePunkty: number): number {
    const maxPunkty = 5; // poziom, płeć, waga, wzrost, przeznaczenie
    return Math.round((zielonePunkty / maxPunkty) * 100);
  }

  /**
   * Oblicza średnią kompatybilność z wszystkich 5 parametrów dla sortowania
   * Zgodnie z dokumentacją: POZIOM 35%, WAGA 25%, WZROST 20%, PŁEĆ 15%, PRZEZNACZENIE 5%
   */
  public static calculateAverageCompatibility(match: SkiMatch, criteria: SearchCriteria): number {
    const poziomScore = this.calculateCriteriaScore('poziom', match.dopasowanie.poziom, criteria, match.ski);
    const wagaScore = this.calculateCriteriaScore('waga', match.dopasowanie.waga, criteria, match.ski);
    const wzrostScore = this.calculateCriteriaScore('wzrost', match.dopasowanie.wzrost, criteria, match.ski);
    const plecScore = this.calculateCriteriaScore('plec', match.dopasowanie.plec, criteria, match.ski);
    const przeznaczenieScore = this.calculateCriteriaScore('przeznaczenie', match.dopasowanie.przeznaczenie, criteria, match.ski);
    
    // Wagi zgodnie z dokumentacją
    const weightedAverage = (
      poziomScore * 0.35 +      // POZIOM - 35% (najważniejsze - bezpieczeństwo)
      wagaScore * 0.25 +         // WAGA - 25% (bardzo ważne - kontrola nart)
      wzrostScore * 0.20 +       // WZROST - 20% (ważne - stabilność)
      plecScore * 0.15 +         // PŁEĆ - 15% (mniej ważne - ergonomia)
      przeznaczenieScore * 0.05  // PRZEZNACZENIE - 5% (najmniej ważne - styl jazdy)
    );
    
    return Math.round(weightedAverage);
  }

  /**
   * Oblicza procent dla konkretnego kryterium (uproszczona wersja dla sortowania)
   */
  private static calculateCriteriaScore(criterion: string, status: string, criteria: SearchCriteria, ski: SkiData): number {
    if (status.includes('✅ zielony')) {
      switch (criterion) {
        case 'wzrost':
          return this.calculateRangeScore(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX);
        case 'waga':
          return this.calculateRangeScore(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX);
        case 'poziom':
          return this.calculateLevelScore(criteria.poziom, criteria.plec, ski.POZIOM);
        case 'plec':
          if (ski.POZIOM.includes('/') || ski.POZIOM.includes('U')) return 100;
          return criteria.plec === ski.PLEC ? 100 : 60; // 1.0 za idealne, 0.6 za inną płeć
        case 'przeznaczenie':
          return this.calculateStyleScore(criteria.styl_jazdy, ski.PRZEZNACZENIE);
        default:
          return 100;
      }
    } else if (status.includes('🟡 żółty')) {
      // Poza zakresem ale w tolerancji - niższe wartości
      switch (criterion) {
        case 'wzrost':
          return this.calculateToleranceScore(criteria.wzrost, ski.WZROST_MIN, ski.WZROST_MAX, WZROST_TOLERANCJA);
        case 'waga':
          return this.calculateToleranceScore(criteria.waga, ski.WAGA_MIN, ski.WAGA_MAX, WAGA_TOLERANCJA);
        case 'poziom':
          return 70; // 1 poziom różnicy = 70%
        case 'plec':
          return 60; // Inna płeć ale akceptowalna
        case 'przeznaczenie':
          return 50; // Częściowe dopasowanie stylu
        default:
          return 75;
      }
    } else if (status.includes('🔴 czerwony')) {
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
   * Zgodnie z dokumentacją: używa funkcji gaussowskich dla wagi i wzrostu
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
   * 1.0 za idealne, 0.7 za 1 poziom różnicy
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
   * Oblicza procent dopasowania stylu jazdy
   */
  private static calculateStyleScore(userStyle: string, skiStyle: string): number {
    const skiTypes = skiStyle.split(',').map(t => t.trim());
    
    // Jeśli użytkownik wybrał "Wszystkie", wszystko pasuje
    if (userStyle === 'Wszystkie') {
      return 100;
    }
    
    // Sprawdź dokładne dopasowanie dla każdego stylu
    switch (userStyle) {
      case 'Slalom':
        if (skiTypes.includes('SL')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Gigant':
        if (skiTypes.includes('G')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SLG')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Cały dzień':
        if (skiTypes.includes('C')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SL,C') || skiTypes.includes('SLG,C')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Poza trase':
        if (skiTypes.includes('OFF')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      case 'Pomiędzy':
        if (skiTypes.includes('SLG')) {
          return 100; // Idealne dopasowanie
        } else if (skiTypes.includes('SL') || skiTypes.includes('G')) {
          return 75; // Częściowe dopasowanie
        } else if (skiTypes.includes('ALL') || skiTypes.includes('ALLM') || skiTypes.includes('UNI')) {
          return 60; // Uniwersalne narty
        } else {
          return 0; // Brak dopasowania
        }
        
      default:
        return 0;
    }
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
}

