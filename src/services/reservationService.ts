/**
 * Serwis obsługi rezerwacji nart
 * Zawiera funkcje do wczytywania, sprawdzania i zarządzania rezerwacjami
 */

import Papa from 'papaparse';

export interface ReservationData {
  od: string;           // Data rozpoczęcia
  do: string;           // Data zakończenia
  uzytkownik: string;   // Użytkownik
  klient: string;       // Klient
  sprzet: string;       // Sprzęt (narty)
  uwagi: string;        // Uwagi
  kod: string;          // Kod
  cena: number;        // Cena
  zaplacono: number;   // Zapłacono
  cennik: string;      // Cennik
  rabat: string;        // Rabat
  rabat_procent: string; // Rabat %
  czas: string;         // Czas
  do_startu: string;    // Do startu
  numer: string;        // Numer
}

export interface ReservationInfo {
  id: string;
  clientName: string;
  equipment: string;
  startDate: Date;
  endDate: Date;
  notes: string;
  price: number;
  paid: number;
  status: 'active' | 'completed' | 'cancelled';
}

// Typy dla nowego systemu 3-kolorowego
export type AvailabilityStatus = 'available' | 'warning' | 'reserved';

export interface AvailabilityInfo {
  status: AvailabilityStatus;
  color: 'green' | 'yellow' | 'red';
  emoji: '🟢' | '🟡' | '🔴';
  message: string;
  reservations: ReservationInfo[];
}

export class ReservationService {
  private static reservations: ReservationData[] = [];
  // private static isLoaded = false; // Wyłączone dla debugowania
  
  // Callback dla powiadomień toast (będzie ustawiony przez ReservationsView)
  static onConversionStart: (() => void) | null = null;
  static onConversionComplete: (() => void) | null = null;

  /**
   * ReservationService: Wykrywa czy plik CSV jest w formacie FireFnow
   * @param csvText - Tekst CSV do sprawdzenia
   * @returns true jeśli wykryto format FireFnow (średniki + zniekształcone znaki)
   */
  private static detectFirefnowFormat(csvText: string): boolean {
    console.log('ReservationService: Wykrywanie formatu FireFnow...');
    
    // Sprawdź pierwsze 500 znaków
    const sample = csvText.substring(0, 500);
    
    // 1. Sprawdź czy więcej średników niż przecinków
    const semicolonCount = (sample.match(/;/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    const hasSemicolons = semicolonCount > commaCount;
    
    // 2. Sprawdź zniekształcone polskie znaki (Windows-1250 odczytane jako UTF-8)
    const hasCorruptedChars = 
      sample.includes('�') || 
      sample.includes('Sprz�t') || 
      sample.includes('U�ytkownik') || 
      sample.includes('Zap�acono') ||
      sample.includes('SprÄt') ||
      sample.includes('UÄytkownik') ||
      sample.includes('ZapÄacono');
    
    const isFirefnow = hasSemicolons || hasCorruptedChars;
    
    console.log(`ReservationService: Średniki: ${semicolonCount}, Przecinki: ${commaCount}`);
    console.log(`ReservationService: Zniekształcone znaki: ${hasCorruptedChars}`);
    console.log(`ReservationService: Format FireFnow: ${isFirefnow}`);
    
    return isFirefnow;
  }

  /**
   * ReservationService: Konwertuje plik CSV z formatu FireFnow do standardowego UTF-8
   * @param rawResponse - Obiekt Response z fetch
   * @returns Skonwertowany tekst CSV
   */
  private static async convertFromFirefnow(rawResponse: Response): Promise<string> {
    console.log('ReservationService: Konwersja z formatu FireFnow...');
    
    try {
      // Pobierz plik jako ArrayBuffer
      const arrayBuffer = await rawResponse.arrayBuffer();
      
      // Spróbuj dekodować z Windows-1250 używając natywnego TextDecoder
      let content: string;
      try {
        const decoder = new TextDecoder('windows-1250');
        content = decoder.decode(arrayBuffer);
        console.log('ReservationService: Dekodowanie Windows-1250 → UTF-8 (pierwsze 200 znaków):', content.substring(0, 200));
      } catch (decodeError) {
        console.log('ReservationService: Błąd TextDecoder, próbuję fallback:', decodeError);
        // Fallback: użyj oryginalnego tekstu
        content = await rawResponse.text();
      }
      
      // Podziel na linie
      const lines = content.split(/\r?\n/);
      const convertedLines: string[] = [];
      
      lines.forEach((line, index) => {
        if (line.trim() === '') {
          return; // Pomiń puste linie
        }
        
        // Zamień średniki na przecinki
        const fields = line.split(';');
        
        // Napraw liczby z przecinkami (np. 180,00 → 180.00)
        const fixedFields = fields.map(field => {
          if (/^\d+,\d+$/.test(field.trim())) {
            return field.replace(',', '.');
          }
          return field;
        });
        
        // Połącz z powrotem przecinkami
        const convertedLine = fixedFields.join(',');
        convertedLines.push(convertedLine);
        
        if (index === 0) {
          console.log('ReservationService: Nagłówek po konwersji:', convertedLine);
        }
      });
      
      const result = convertedLines.join('\n');
      console.log('ReservationService: Konwersja zakończona. Liczba linii:', convertedLines.length);
      
      return result;
    } catch (error) {
      console.error('ReservationService: Błąd konwersji FireFnow:', error);
      // Fallback: zwróć oryginalny tekst
      return await rawResponse.text();
    }
  }

  /**
   * Wczytuje dane rezerwacji z pliku CSV
   */
  static async loadReservations(): Promise<ReservationData[]> {
    try {
      console.log('ReservationService: Próbuję wczytać plik /data/rezerwacja.csv');
      const response = await fetch('/data/rezerwacja.csv');
      console.log('ReservationService: Odpowiedź HTTP:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Pobierz plik jako tekst do wykrycia formatu
      const clonedResponse = response.clone(); // Clone aby móc użyć ponownie
      let csvText = await response.text();
      console.log('ReservationService: Pobrano plik jako tekst (pierwsze 200 znaków):', csvText.substring(0, 200));
      
      // Wykryj czy to format FireFnow
      const isFirefnow = this.detectFirefnowFormat(csvText);
      console.log('ReservationService: Czy wykryto FireFnow?', isFirefnow);
      
      if (isFirefnow) {
        console.log('ReservationService: Rozpoczynam konwersję FireFnow...');
        
        // Wywołaj callback toast (jeśli ustawiony)
        if (this.onConversionStart) {
          console.log('ReservationService: Wywołuję onConversionStart callback');
          this.onConversionStart();
        }
        
        // Konwertuj z FireFnow (Windows-1250 + średniki)
        csvText = await this.convertFromFirefnow(clonedResponse);
        
        // Wywołaj callback toast (jeśli ustawiony)
        if (this.onConversionComplete) {
          console.log('ReservationService: Wywołuję onConversionComplete callback');
          this.onConversionComplete();
        }
      } else {
        console.log('ReservationService: Format nie jest FireFnow - używam oryginalnego tekstu');
      }
      
      console.log('ReservationService: CSV gotowy do parsowania (pierwsze 200 znaków):', csvText.substring(0, 200));
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
        transformHeader: (header) => {
          // Mapowanie nagłówków na polskie nazwy (lowercase)
          const headerMap: { [key: string]: string } = {
            'Od': 'od',
            'Do': 'do',
            'Klient': 'klient',
            'Kod': 'kod',
            'Cena': 'cena',
            'Rabat': 'rabat',
            'Użytkownik': 'uzytkownik',
            'Sprzęt': 'sprzet',
            'Zapłacono': 'zaplacono'
          };
          
          return headerMap[header] || header.toLowerCase();
        }
      });

      console.log('ReservationService: Papa Parse zakończone:', result);
      console.log('ReservationService: Liczba rekordów:', result.data.length);
      console.log('ReservationService: Pierwszy rekord:', result.data[0]);

      // Debug: sprawdź surowe dane przed filtrowaniem
      const rawData = result.data as ReservationData[];
      console.log('ReservationService: Surowe dane przed filtrowaniem:', rawData.length, 'rekordów');
      console.log('ReservationService: Pierwsze 3 surowe rekordy:', rawData.slice(0, 3));
      
      // Filtruj tylko prawdziwe rezerwacje (wyklucz wiersze podsumowujące)
      this.reservations = rawData.filter(reservation => {
        // Debug: sprawdź każdy rekord
        console.log('ReservationService: Sprawdzam rekord:', reservation);
        console.log('ReservationService: Klient:', reservation.klient, 'Sprzęt:', reservation.sprzet, 'Od:', reservation.od, 'Do:', reservation.do);
        
        // Wyklucz wiersze podsumowujące
        if (!reservation.klient || !reservation.sprzet) {
          console.log('ReservationService: Wykluczam - brak klienta lub sprzętu');
          return false;
        }
        if (reservation.klient === '57' || reservation.sprzet === 'Suma:') {
          console.log('ReservationService: Wykluczam - wiersz podsumowujący');
          return false;
        }
        if (reservation.klient.includes && reservation.klient.includes('Suma:') || 
            reservation.sprzet.includes && reservation.sprzet.includes('Suma:')) {
          console.log('ReservationService: Wykluczam - zawiera "Suma:"');
          return false;
        }
        
        // Wyklucz puste wiersze
        if (!reservation.od || !reservation.do) {
          console.log('ReservationService: Wykluczam - brak dat');
          return false;
        }
        
        console.log('ReservationService: ZACHOWUJĘ rekord:', reservation);
        return true;
      });
      
      console.log('ReservationService: Po filtrowaniu:', this.reservations.length, 'rekordów');
      
      // this.isLoaded = true; // Commented out for debugging
      
      // Debug: sprawdź czy dane są poprawnie wczytane
      console.log('ReservationService: Po parsowaniu - liczba rekordów:', this.reservations.length);
      console.log('ReservationService: Po parsowaniu - pierwszy rekord:', this.reservations[0]);
      if (this.reservations[0]) {
        console.log('ReservationService: Po parsowaniu - sprzęt pierwszego rekordu:', this.reservations[0].sprzet);
        console.log('ReservationService: Po parsowaniu - klient pierwszego rekordu:', this.reservations[0].klient);
      }
      
      // Debug: sprawdź konkretnie pole sprzęt
      const firstReservation = this.reservations[0];
      if (firstReservation) {
        console.log('ReservationService: Pierwsza rezerwacja - wszystkie pola:', firstReservation);
        console.log('ReservationService: Pierwsza rezerwacja - sprzęt:', firstReservation.sprzet);
        console.log('ReservationService: Pierwsza rezerwacja - klient:', firstReservation.klient);
        console.log('ReservationService: Pierwsza rezerwacja - kod:', firstReservation.kod);
      }
      
      // Debug: sprawdź konkretne przykłady nart
      const nartyExamples = this.reservations.filter(r => 
        r.sprzet && (
          r.sprzet.toLowerCase().includes('narty') ||
          r.sprzet.toLowerCase().includes('volkl') ||
          r.sprzet.toLowerCase().includes('atomic')
        )
      );
      console.log('ReservationService: Przykłady nart:', nartyExamples.slice(0, 3));
      
      return this.reservations;
    } catch (error) {
      console.error('ReservationService: Błąd wczytywania rezerwacji:', error);
      console.error('ReservationService: Szczegóły błędu:', error);
      return [];
    }
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie (po kodzie)
   */
  static async isSkiReservedByCode(
    kod: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    console.log(`ReservationService.isSkiReservedByCode: Sprawdzam kod ${kod} w okresie ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      // Sprawdź czy kod się zgadza
      if (reservation.kod === kod) {
        console.log(`ReservationService: Znaleziono rezerwację dla kodu ${kod}:`, reservation);
        // Sprawdź czy okresy się nakładają
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          console.log(`ReservationService: Okresy się nakładają dla kodu ${kod}`);
          reservations.push({
            id: reservation.kod,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi,
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        } else {
          console.log(`ReservationService: Okresy się NIE nakładają dla kodu ${kod}`);
        }
      }
    }
    
    console.log(`ReservationService: Zwracam ${reservations.length} rezerwacji dla kodu ${kod}`);
    return reservations;
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie (po nazwie - stara metoda)
   */
  static async isSkiReserved(
    marka: string, 
    model: string, 
    dlugosc: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      // Sprawdź czy rezerwacja dotyczy tej narty
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        // Sprawdź czy okresy się nakładają
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          reservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi,
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        }
      }
    }
    
    return reservations;
  }

  /**
   * Sprawdza czy opis sprzętu pasuje do narty
   */
  private static matchesSki(sprzet: string, marka: string, model: string, dlugosc: string): boolean {
    if (!sprzet || !marka || !model || !dlugosc) {
      return false;
    }

    const sprzetLower = sprzet.toLowerCase();
    const markaLower = marka.toLowerCase();
    const modelLower = model.toLowerCase();
    const dlugoscStr = dlugosc.toString();

    // Sprawdź czy zawiera markę, model i długość
    return sprzetLower.includes(markaLower) && 
           sprzetLower.includes(modelLower) && 
           sprzetLower.includes(dlugoscStr);
  }

  /**
   * Sprawdza czy dwa okresy czasowe się nakładają
   */
  private static isDateRangeOverlapping(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Oblicza różnicę w dniach między dwiema datami (bez godzin)
   * Zwraca liczbę całkowitych dni między datami
   */
  private static differenceInDays(date1: Date, date2: Date): number {
    // Normalizuj daty do początku dnia (bez godzin)
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * NOWA FUNKCJA: Sprawdza status dostępności narty z systemem 3-kolorowym
   * 
   * 🔴 CZERWONY - Bezpośredni konflikt (rezerwacja nachodzi na okres klienta)
   * 🟡 ŻÓŁTY - Ostrzeżenie (rezerwacja 1-2 dni przed/po, za mało czasu na serwis)
   * 🟢 ZIELONY - Bezpieczny (min. 2 dni przerwy przed/po)
   * 
   * @param kod - Kod narty
   * @param userDateFrom - Początek okresu wypożyczenia klienta
   * @param userDateTo - Koniec okresu wypożyczenia klienta
   * @returns AvailabilityInfo z statusem, kolorem, emoji i komunikatem
   */
  static async getSkiAvailabilityStatus(
    kod: string,
    userDateFrom: Date,
    userDateTo: Date
  ): Promise<AvailabilityInfo> {
    await this.loadReservations();
    
    console.log(`ReservationService.getSkiAvailabilityStatus: Sprawdzam kod ${kod} dla okresu ${userDateFrom.toLocaleDateString()} - ${userDateTo.toLocaleDateString()}`);
    
    const allReservations: ReservationInfo[] = [];
    let hasDirectConflict = false;
    let hasWarningConflict = false;
    
    // Sprawdź wszystkie rezerwacje dla tego kodu
    for (const reservation of this.reservations) {
      if (reservation.kod === kod) {
        const resStart = new Date(reservation.od);
        const resEnd = new Date(reservation.do);
        
        const reservationInfo: ReservationInfo = {
          id: reservation.kod,
          clientName: reservation.klient,
          equipment: reservation.sprzet,
          startDate: resStart,
          endDate: resEnd,
          notes: reservation.uwagi || '',
          price: parseFloat(String(reservation.cena)) || 0,
          paid: parseFloat(String(reservation.zaplacono)) || 0,
          status: this.getReservationStatus(reservation)
        };
        
        // PRIORYTET 1: Sprawdź CZERWONY (bezpośredni konflikt)
        // Rezerwacja nachodzi na okres klienta gdy: res.start <= klient.end AND res.end >= klient.start
        if (resStart <= userDateTo && resEnd >= userDateFrom) {
          hasDirectConflict = true;
          allReservations.push(reservationInfo);
          console.log(`  🔴 CZERWONY: Rezerwacja ${resStart.toLocaleDateString()}-${resEnd.toLocaleDateString()} nachodzi na okres klienta`);
        }
        // PRIORYTET 2: Sprawdź ŻÓŁTY (bufor 1-2 dni)
        else {
          // Rezerwacja kończy się PRZED okresem klienta
          // Sprawdź ile dni przerwy jest między końcem rezerwacji a początkiem okresu klienta
          const daysBefore = this.differenceInDays(userDateFrom, resEnd);
          
          // Rezerwacja zaczyna się PO okresie klienta
          // Sprawdź ile dni przerwy jest między końcem okresu klienta a początkiem rezerwacji
          const daysAfter = this.differenceInDays(resStart, userDateTo);
          
          // ŻÓŁTY gdy: 1-2 dni przerwy (czyli daysBefore lub daysAfter = 1 lub 2)
          const isBeforeWarning = daysBefore >= 1 && daysBefore <= 2;
          const isAfterWarning = daysAfter >= 1 && daysAfter <= 2;
          
          if (isBeforeWarning || isAfterWarning) {
            hasWarningConflict = true;
            allReservations.push(reservationInfo);
            
            if (isBeforeWarning) {
              console.log(`  🟡 ŻÓŁTY: Rezerwacja kończy się ${daysBefore} dni przed okresem klienta (za mało czasu na serwis)`);
            }
            if (isAfterWarning) {
              console.log(`  🟡 ŻÓŁTY: Rezerwacja zaczyna się ${daysAfter} dni po okresie klienta (za mało czasu na serwis)`);
            }
          } else {
            console.log(`  🟢 ZIELONY: Rezerwacja ${resStart.toLocaleDateString()}-${resEnd.toLocaleDateString()} nie koliduje z okresem klienta`);
          }
        }
      }
    }
    
    // Określ końcowy status (priorytet: czerwony > żółty > zielony)
    if (hasDirectConflict) {
      return {
        status: 'reserved',
        color: 'red',
        emoji: '🔴',
        message: 'Zarezerwowane w wybranym terminie',
        reservations: allReservations
      };
    }
    
    if (hasWarningConflict) {
      return {
        status: 'warning',
        color: 'yellow',
        emoji: '🟡',
        message: 'Rezerwacja blisko terminu (za mało czasu na serwis)',
        reservations: allReservations
      };
    }
    
    // ZIELONY - brak konfliktów
    return {
      status: 'available',
      color: 'green',
      emoji: '🟢',
      message: 'Dostępne - wystarczająco czasu na serwis',
      reservations: []
    };
  }

  /**
   * Określa status rezerwacji
   */
  private static getReservationStatus(reservation: ReservationData): 'active' | 'completed' | 'cancelled' {
    const now = new Date();
    const endDate = new Date(reservation.do);
    
    if (endDate < now) {
      return 'completed';
    }
    
    // TODO: Dodać logikę dla anulowanych rezerwacji
    return 'active';
  }

  /**
   * Pobiera wszystkie aktywne rezerwacje dla konkretnej narty
   */
  static async getActiveReservationsForSki(
    marka: string, 
    model: string, 
    dlugosc: string
  ): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        const status = this.getReservationStatus(reservation);
        if (status === 'active') {
          reservations.push({
            id: reservation.numer,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi,
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: status
          });
        }
      }
    }
    
    return reservations;
  }

  /**
   * Sprawdza dostępność konkretnej sztuki nart
   */
  static async checkSkiAvailability(
    marka: string, 
    model: string, 
    dlugosc: string, 
    _sztukaNumber: number,
    startDate: Date, 
    endDate: Date
  ): Promise<{ isAvailable: boolean; reservations: ReservationInfo[] }> {
    const reservations = await this.isSkiReserved(marka, model, dlugosc, startDate, endDate);
    
    // TODO: Implementuj logikę sprawdzania konkretnej sztuki
    // Na razie sprawdzamy ogólną dostępność nart
    
    return {
      isAvailable: reservations.length === 0,
      reservations: reservations
    };
  }

  /**
   * Pobiera wszystkie rezerwacje w danym okresie
   */
  static async getReservationsInPeriod(startDate: Date, endDate: Date): Promise<ReservationInfo[]> {
    await this.loadReservations();
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      if (this.isDateRangeOverlapping(
        new Date(reservation.od),
        new Date(reservation.do),
        startDate,
        endDate
      )) {
        reservations.push({
          id: reservation.numer,
          clientName: reservation.klient,
          equipment: reservation.sprzet,
          startDate: new Date(reservation.od),
          endDate: new Date(reservation.do),
          notes: reservation.uwagi,
          price: parseFloat(String(reservation.cena)) || 0,
          paid: parseFloat(String(reservation.zaplacono)) || 0,
          status: this.getReservationStatus(reservation)
        });
      }
    }
    
    return reservations;
  }

  /**
   * Tworzy nową rezerwację
   */
  static async createReservation(reservationData: Partial<ReservationData>): Promise<boolean> {
    try {
      // TODO: Implementuj tworzenie nowej rezerwacji
      // Na razie tylko logujemy
      console.log('ReservationService: Tworzenie nowej rezerwacji:', reservationData);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd tworzenia rezerwacji:', error);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      // TODO: Implementuj aktualizację rezerwacji
      console.log('ReservationService: Aktualizacja rezerwacji:', id, updates);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd aktualizacji rezerwacji:', error);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      // TODO: Implementuj usuwanie rezerwacji
      console.log('ReservationService: Usuwanie rezerwacji:', id);
      return true;
    } catch (error) {
      console.error('ReservationService: Błąd usuwania rezerwacji:', error);
      return false;
    }
  }
}
