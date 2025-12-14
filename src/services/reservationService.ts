/**
 * Serwis obsługi rezerwacji nart
 * Zawiera funkcje do wczytywania, sprawdzania i zarządzania rezerwacjami
 */

import Papa from 'papaparse';
import { createLogger } from '../utils/logger';
import { handleApiError } from '../utils/apiErrorHandler';

export interface ReservationData {
  klient: string;       // Klient
  sprzet: string;       // Sprzęt (narty)
  kod: string;          // Kod sprzętu
  od: string;           // Data rozpoczęcia
  do: string;           // Data zakończenia
  typumowy: string;     // Typ umowy: "PROMOTOR" lub "STANDARD"
  numer: string;        // Numer rezerwacji (np. "P 71/10/2025")
  cena?: string;        // Cena (opcjonalna, domyślnie 0)
  zaplacono?: string;   // Zapłacono (opcjonalne, domyślnie 0)
  uwagi?: string;       // Uwagi (opcjonalne)
  source?: 'reservation' | 'rental'; // Źródło danych: rezerwacja lub wypożyczenie
  parent_group_id?: number | null; // ID grupy głównej sprzętu (dla kategoryzacji)
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
  // src/services/reservationService.ts: Logger dla ReservationService
  private static logger = createLogger('ReservationService');
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
    
    return hasSemicolons || hasCorruptedChars;
  }

  /**
   * ReservationService: Konwertuje plik CSV z formatu FireFnow do standardowego UTF-8
   * @param rawResponse - Obiekt Response z fetch
   * @returns Skonwertowany tekst CSV
   */
  private static async convertFromFirefnow(rawResponse: Response): Promise<string> {
    this.logger.info('Konwersja z formatu FireFnow...');
    
    try {
      // Pobierz plik jako ArrayBuffer
      const arrayBuffer = await rawResponse.arrayBuffer();
      
      // Spróbuj dekodować z Windows-1250 używając natywnego TextDecoder
      let content: string;
      try {
        const decoder = new TextDecoder('windows-1250');
        content = decoder.decode(arrayBuffer);
        this.logger.debug('Dekodowanie Windows-1250 → UTF-8 (pierwsze 200 znaków):', content.substring(0, 200));
      } catch (decodeError) {
        this.logger.warn('Błąd TextDecoder, próbuję fallback:', decodeError);
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
          this.logger.debug('Nagłówek po konwersji:', convertedLine);
        }
      });
      
      const result = convertedLines.join('\n');
      this.logger.info('Konwersja zakończona. Liczba linii:', convertedLines.length);
      
      return result;
    } catch (error) {
      this.logger.error('Błąd konwersji FireFnow:', error);
      // Fallback: zwróć oryginalny tekst
      return await rawResponse.text();
    }
  }

  /**
   * Wczytuje dane rezerwacji z pliku CSV
   */
  static async loadReservations(): Promise<ReservationData[]> {
    try {
      const response = await fetch('/data/rezerwacja.csv');
      
      if (!response.ok) {
        // For static CSV files, use status-based message (not JSON API response)
        const statusMessage = response.status === 404 
          ? 'Plik rezerwacji nie został znaleziony'
          : `Błąd wczytywania pliku rezerwacji (status: ${response.status})`;
        throw new Error(statusMessage);
      }
      
      // Pobierz plik jako tekst do wykrycia formatu
      const clonedResponse = response.clone(); // Clone aby móc użyć ponownie
      let csvText = await response.text();
      
      // Wykryj czy to format FireFnow
      const isFirefnow = this.detectFirefnowFormat(csvText);
      
      if (isFirefnow) {
        this.logger.info('Rozpoczynam konwersję FireFnow...');
        
        // Wywołaj callback toast (jeśli ustawiony)
        if (this.onConversionStart) {
          this.logger.debug('Wywołuję onConversionStart callback');
          this.onConversionStart();
        }
        
        // Konwertuj z FireFnow (Windows-1250 + średniki)
        csvText = await this.convertFromFirefnow(clonedResponse);
        
        // Wywołaj callback toast (jeśli ustawiony)
        if (this.onConversionComplete) {
          this.onConversionComplete();
        }
      }
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
        transformHeader: (header) => {
          // Mapowanie nagłówków - obsługa polskich znaków
          const headerMap: { [key: string]: string } = {
            'Klient': 'klient',
            'Sprzęt': 'sprzet',
            'Kod': 'kod',
            'Od': 'od',
            'Do': 'do',
            'TypUmowy': 'typumowy',
            'Numer': 'numer',
            'Cena': 'cena',
            'Zapłacono': 'zaplacono'
          };
          
          // Zwróć zmapowaną wartość lub lowercase jako fallback
          return headerMap[header] || header.toLowerCase();
        }
      });

      const rawData = result.data as ReservationData[];
      
      // Filtruj tylko prawdziwe rezerwacje (wyklucz nagłówki i podsumowania)
      this.reservations = rawData.filter(reservation => {
        // Wyklucz wiersze bez podstawowych danych
        if (!reservation.klient || !reservation.sprzet) {
          return false;
        }
        
        // Wyklucz wiersze podsumowujące (Suma:)
        if (reservation.sprzet === 'Suma:' || reservation.klient === 'Suma:') {
          return false;
        }
        
        if (reservation.klient.includes && reservation.klient.includes('Suma:') || 
            reservation.sprzet.includes && reservation.sprzet.includes('Suma:')) {
          return false;
        }
        
        // Wyklucz nagłówki PROMOTOR (nie mają kodu)
        // Kijki, buty itp. mogą nie mieć kodu - to OK!
        if (reservation.sprzet.trim().toUpperCase() === 'PROMOTOR' && 
            (!reservation.kod || reservation.kod.trim() === '')) {
          return false;
        }
        
        // Wyklucz wiersze bez dat
        if (!reservation.od || !reservation.do) {
          return false;
        }
        
        // Wszystko inne zachowuj (narty z kodem, kijki bez kodu, buty bez kodu)
        return true;
      });
      
      this.logger.info(`Wczytano ${this.reservations.length} rezerwacji`);
      
      return this.reservations;
    } catch (error) {
      this.logger.error('Błąd wczytywania rezerwacji:', error);
      // Note: This service doesn't use toastService, errors are handled by callers
      // But we still log the user-friendly message for debugging
      const errorMessage = handleApiError(error, 'Nie udało się wczytać rezerwacji z pliku CSV');
      this.logger.error('Szczegóły błędu:', errorMessage);
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
    
    this.logger.debug(`Sprawdzam kod ${kod} w okresie ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    const reservations: ReservationInfo[] = [];
    
    for (const reservation of this.reservations) {
      // Sprawdź czy kod się zgadza
      if (reservation.kod === kod) {
        this.logger.debug(`Znaleziono rezerwację dla kodu ${kod}:`, reservation);
        // Sprawdź czy okresy się nakładają
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          this.logger.debug(`Okresy się nakładają dla kodu ${kod}`);
          reservations.push({
            id: reservation.kod,
            clientName: reservation.klient,
            equipment: reservation.sprzet,
            startDate: new Date(reservation.od),
            endDate: new Date(reservation.do),
            notes: reservation.uwagi || '',
            price: parseFloat(String(reservation.cena)) || 0,
            paid: parseFloat(String(reservation.zaplacono)) || 0,
            status: this.getReservationStatus(reservation)
          });
        } else {
          this.logger.debug(`Okresy się NIE nakładają dla kodu ${kod}`);
        }
      }
    }
    
    this.logger.info(`Zwracam ${reservations.length} rezerwacji dla kodu ${kod}`);
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
            notes: reservation.uwagi || '',
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
    
    this.logger.debug(`Sprawdzam kod ${kod} dla okresu ${userDateFrom.toLocaleDateString()} - ${userDateTo.toLocaleDateString()}`);
    
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
          this.logger.warn(`🔴 CZERWONY: Rezerwacja ${resStart.toLocaleDateString()}-${resEnd.toLocaleDateString()} nachodzi na okres klienta`);
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
              this.logger.warn(`🟡 ŻÓŁTY: Rezerwacja kończy się ${daysBefore} dni przed okresem klienta (za mało czasu na serwis)`);
            }
            if (isAfterWarning) {
              this.logger.warn(`🟡 ŻÓŁTY: Rezerwacja zaczyna się ${daysAfter} dni po okresie klienta (za mało czasu na serwis)`);
            }
          } else {
            this.logger.debug(`🟢 ZIELONY: Rezerwacja ${resStart.toLocaleDateString()}-${resEnd.toLocaleDateString()} nie koliduje z okresem klienta`);
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
            notes: reservation.uwagi || '',
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
          notes: reservation.uwagi || '',
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
      this.logger.info('Tworzenie nowej rezerwacji:', reservationData);
      return true;
    } catch (error) {
      this.logger.error('Błąd tworzenia rezerwacji:', error);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      this.logger.info('Aktualizacja rezerwacji:', id, updates);
      return true;
    } catch (error) {
      this.logger.error('Błąd aktualizacji rezerwacji:', error);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      this.logger.info('Usuwanie rezerwacji:', id);
      return true;
    } catch (error) {
      this.logger.error('Błąd usuwania rezerwacji:', error);
      return false;
    }
  }
}
