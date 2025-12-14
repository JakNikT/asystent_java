/**
 * Klient API dla komunikacji z serwerem rezerwacji
 * Zastępuje bezpośredni odczyt CSV przez HTTP API
 */

import { createLogger } from '../utils/logger';
import { toastService } from '../hooks/useToast';
import { parseApiError, handleApiError } from '../utils/apiErrorHandler';
import type { ReservationData, ReservationInfo, AvailabilityInfo } from './reservationService';

const API_BASE_URL = '/api';
const logger = createLogger('ReservationApiClient');

/**
 * Klient API dla rezerwacji
 */
export class ReservationApiClient {
  private static cache: ReservationData[] = [];
  private static cacheRentals: ReservationData[] = []; // NOWY: cache dla wypożyczeń
  private static lastFetch: number = 0;
  private static lastFetchRentals: number = 0; // NOWY: timestamp dla wypożyczeń
  private static readonly CACHE_DURATION = 30000; // 30 sekund

  /**
   * Pobiera wszystkie rezerwacje z serwera (z cache)
   */
  static async loadReservations(): Promise<ReservationData[]> {
    const now = Date.now();
    
    // Użyj cache jeśli dane są świeże
    if (this.cache.length > 0 && (now - this.lastFetch) < this.CACHE_DURATION) {
      logger.debug('Używam danych z cache');
      return this.cache;
    }

    try {
      logger.info('Pobieram rezerwacje z serwera...');
      const response = await fetch(`${API_BASE_URL}/reservations`);
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const reservations = await response.json();
      this.cache = reservations;
      this.lastFetch = now;
      
      logger.info(`Pobrano ${reservations.length} rezerwacji`);
      return reservations;
    } catch (error) {
      logger.error('Błąd pobierania rezerwacji:', error);
      
      // Wyświetl komunikat błędu użytkownikowi (z backend message jeśli dostępne)
      const errorMessage = handleApiError(error, 'Problem z połączeniem. Używam danych z cache.');
      toastService.showError(errorMessage);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cache.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      logger.warn('Używam cache mimo błędu');
      return this.cache;
    }
  }

  /**
   * Pobiera wszystkie wypożyczenia z serwera (z cache)
   */
  static async loadRentals(): Promise<ReservationData[]> {
    const now = Date.now();
    
    // Użyj cache jeśli dane są świeże
    if (this.cacheRentals.length > 0 && (now - this.lastFetchRentals) < this.CACHE_DURATION) {
      logger.debug('Używam danych z cache (wypożyczenia)');
      return this.cacheRentals;
    }

    try {
      logger.info('Pobieram wypożyczenia z serwera...');
      const response = await fetch(`${API_BASE_URL}/wypozyczenia/aktualne`);
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const rentals = await response.json();
      this.cacheRentals = rentals.map((r: ReservationData) => ({ ...r, source: 'rental' as const }));
      this.lastFetchRentals = now;
      
      logger.info(`Pobrano ${rentals.length} wypożyczeń`);
      return this.cacheRentals;
    } catch (error) {
      logger.error('Błąd pobierania wypożyczeń:', error);
      
      // Wyświetl komunikat błędu użytkownikowi (z backend message jeśli dostępne)
      const errorMessage = handleApiError(error, 'Problem z połączeniem. Używam danych z cache.');
      toastService.showError(errorMessage);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cacheRentals.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      logger.warn('Używam cache mimo błędu (wypożyczenia)');
      return this.cacheRentals;
    }
  }

  /**
   * Pobiera wszystkie dane (rezerwacje + wypożyczenia)
   */
  static async loadAll(): Promise<ReservationData[]> {
    try {
      logger.info('Pobieram wszystkie dane (rezerwacje + wypożyczenia)...');
      
      const [reservations, rentals] = await Promise.all([
        this.loadReservations(),
        this.loadRentals()
      ]);
      
      // Dodaj pole source='reservation' do rezerwacji (jeśli jeszcze nie ma)
      const reservationsWithSource = reservations.map(r => ({ 
        ...r, 
        source: (r.source || 'reservation') as 'reservation' | 'rental'
      }));
      
      const allData = [...reservationsWithSource, ...rentals];
      logger.info(`Pobrano łącznie ${allData.length} pozycji (${reservationsWithSource.length} rezerwacji + ${rentals.length} wypożyczeń)`);
      
      return allData;
    } catch (error) {
      logger.error('Błąd pobierania wszystkich danych:', error);
      const errorMessage = handleApiError(error, 'Nie udało się załadować wszystkich danych');
      toastService.showError(errorMessage);
      return [];
    }
  }

  /**
 * Pobiera dostępność dla okresu (zoptymalizowane dla "Przeglądaj")
 * Zwraca tylko rezerwacje i wypożyczenia które mogą kolidować z okresem
 */
static async loadAvailabilityForPeriod(dateFrom: Date, dateTo: Date): Promise<ReservationData[]> {
  try {
    const fromTimestamp = dateFrom.getTime();
    const toTimestamp = dateTo.getTime();
    
    logger.debug(`Pobieram dostępność dla okresu ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`);
    
    const response = await fetch(`${API_BASE_URL}/dostepnosc/okres?from=${fromTimestamp}&to=${toTimestamp}`);
    
    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      throw new Error(errorMessage);
    }
    
    const data = await response.json() as { reservations?: Array<{ kod?: string; sprzet?: string; klient?: string; od?: string; do?: string }>; rentals?: Array<{ kod?: string; sprzet?: string; klient?: string; od?: number; do?: number }> };
    
    // Mapuj dane do formatu ReservationData
    const reservations = (data.reservations || []).map((r) => ({
      kod: r.kod || '',
      sprzet: r.sprzet || '',
      klient: r.klient || '',
      od: this.formatFireSnowDateString(r.od),
      do: this.formatFireSnowDateString(r.do),
      cena: '0',
      zaplacono: '0',
      numer: '',
      typumowy: (r as any).typumowy || 'STANDARD', // Użyj typumowy z API jeśli dostępne
      parent_group_id: (r as any).parent_group_id !== undefined ? (r as any).parent_group_id : null,
      source: 'reservation' as const
    }));
    
    const rentals = (data.rentals || []).map((r) => ({
      kod: r.kod || '',
      sprzet: r.sprzet || '',
      klient: r.klient || '',
      od: typeof r.od === 'number' ? new Date(r.od).toISOString().split('T')[0] : r.od || '',
      do: typeof r.do === 'number' && r.do > 0 ? new Date(r.do).toISOString().split('T')[0] : '',
      cena: '0',
      zaplacono: '0',
      numer: '',
      typumowy: (r as any).typumowy || 'STANDARD', // Użyj typumowy z API jeśli dostępne
      parent_group_id: (r as any).parent_group_id !== undefined ? (r as any).parent_group_id : null,
      source: 'rental' as const
    }));
    
    const allData = [...reservations, ...rentals];
    logger.info(`Pobrano ${allData.length} pozycji (${reservations.length} rezerwacji + ${rentals.length} wypożyczeń)`);
    
    return allData;
  } catch (error) {
    logger.error('Błąd pobierania dostępności dla okresu:', error);
    const errorMessage = handleApiError(error, 'Nie udało się sprawdzić dostępności sprzętu');
    toastService.showError(errorMessage);
    return [];
  }
}

// Helper function for date formatting
private static formatFireSnowDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    // Format z API: "2026-02-13 11:00:00.000000"
    const isoString = dateStr.split('.')[0].replace(' ', 'T');
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return isoString;
  } catch {
    return dateStr || '';
  }
}

  /**
   * Pobiera przeszłe wypożyczenia (zwrócone) z serwera
   */
  static async loadPastRentals(): Promise<ReservationData[]> {
    try {
      logger.info('Pobieram przeszłe wypożyczenia z serwera...');
      const response = await fetch(`${API_BASE_URL}/wypozyczenia/przeszle`);
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      const pastRentals = await response.json();
      logger.info(`Pobrano ${pastRentals.length} przeszłych wypożyczeń`);
      
      // Dodaj pole source='rental' do każdego wypożyczenia
      return pastRentals.map((r: ReservationData) => ({ ...r, source: 'rental' as const }));
    } catch (error) {
      logger.error('Błąd pobierania przeszłych wypożyczeń:', error);
      const errorMessage = handleApiError(error, 'Nie udało się załadować przeszłych wypożyczeń');
      toastService.showError(errorMessage);
      return [];
    }
  }

  /**
   * Pobiera przeszłe rezerwacje (data rozpoczęcia <= dzisiaj)
   */
  static async loadPastReservations(): Promise<ReservationData[]> {
    try {
      logger.info('Filtuję przeszłe rezerwacje...');
      const allReservations = await this.loadReservations();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset do początku dnia
      
      const pastReservations = allReservations.filter(reservation => {
        const startDate = new Date(reservation.od);
        return startDate <= today;
      });
      
      logger.info(`Znaleziono ${pastReservations.length} przeszłych rezerwacji`);
      
      // Dodaj pole source='reservation'
      return pastReservations.map(r => ({ 
        ...r, 
        source: (r.source || 'reservation') as 'reservation' | 'rental'
      }));
    } catch (error) {
      logger.error('Błąd filtrowania przeszłych rezerwacji:', error);
      const errorMessage = handleApiError(error, 'Nie udało się załadować przeszłych rezerwacji');
      toastService.showError(errorMessage);
      return [];
    }
  }

  /**
 * Sprawdza status dostępności narty z systemem 3-kolorowym
 * UWAGA: Sprawdza zarówno rezerwacje JAK I aktywne wypożyczenia!
 * OPTYMALIZACJA: Używa dedykowanego endpointu dla okresu użytkownika
 * @param cachedData - Opcjonalne dane z cache (jeśli przekazane, nie pobiera ponownie z API)
 */
static async getSkiAvailabilityStatus(
  kod: string,
  userDateFrom: Date,
  userDateTo: Date,
  cachedData?: ReservationData[]
): Promise<AvailabilityInfo> {
  // OPTYMALIZACJA: Użyj cache jeśli dostępny, w przeciwnym razie pobierz
  const allData = cachedData || await this.loadAvailabilityForPeriod(userDateFrom, userDateTo);
  
  // Loguj tylko przy pierwszym wywołaniu (gdy nie ma cache)
  if (!cachedData) {
    logger.debug('Sprawdzam rezerwacje i wypożyczenia dla okresu użytkownika (zoptymalizowane)');
    logger.debug(`Pobrano ${allData.length} pozycji (tylko istotne dla okresu)`);
  }
    
  const allReservations: ReservationInfo[] = [];
  let hasDirectConflict = false;
  let hasWarningConflict = false;
  
  for (const reservation of allData) {
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
      
      // Sprawdź CZERWONY (bezpośredni konflikt)
      const overlaps = resStart <= userDateTo && resEnd >= userDateFrom;
      
      if (overlaps) {
        hasDirectConflict = true;
        allReservations.push(reservationInfo);
      }
      // Sprawdź ŻÓŁTY (bufor 1-2 dni)
      else {
        const daysBefore = this.differenceInDays(userDateFrom, resEnd);
        const daysAfter = this.differenceInDays(resStart, userDateTo);
        
        const isBeforeWarning = daysBefore >= 1 && daysBefore <= 2;
        const isAfterWarning = daysAfter >= 1 && daysAfter <= 2;
        
        if (isBeforeWarning || isAfterWarning) {
          hasWarningConflict = true;
          allReservations.push(reservationInfo);
        }
      }
    }
  }
  
  // Określ końcowy status
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
  
  return {
    status: 'available',
    color: 'green',
    emoji: '🟢',
    message: 'Dostępne - wystarczająco czasu na serwis',
    reservations: []
  };
}

  /**
   * Tworzy nową rezerwację
   */
  static async createReservation(reservationData: Partial<ReservationData>): Promise<boolean> {
    try {
      logger.info('Tworzenie nowej rezerwacji:', reservationData);
      
      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info('Rezerwacja utworzona pomyślnie');
      toastService.showSuccess('Rezerwacja została utworzona pomyślnie');
      return true;
    } catch (error) {
      logger.error('Błąd tworzenia rezerwacji:', error);
      // Wyświetl szczegółowy komunikat błędu z backend (jeśli dostępny)
      const errorMessage = handleApiError(error, 'Nie udało się utworzyć rezerwacji');
      toastService.showError(errorMessage);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      logger.info('Aktualizacja rezerwacji:', id, updates);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info('Rezerwacja zaktualizowana pomyślnie');
      toastService.showSuccess('Rezerwacja została zaktualizowana');
      return true;
    } catch (error) {
      logger.error('Błąd aktualizacji rezerwacji:', error);
      const errorMessage = handleApiError(error, 'Nie udało się zaktualizować rezerwacji');
      toastService.showError(errorMessage);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      logger.info('Usuwanie rezerwacji:', id);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      logger.info('Rezerwacja usunięta pomyślnie');
      toastService.showSuccess('Rezerwacja została usunięta');
      return true;
    } catch (error) {
      logger.error('Błąd usuwania rezerwacji:', error);
      const errorMessage = handleApiError(error, 'Nie udało się usunąć rezerwacji');
      toastService.showError(errorMessage);
      return false;
    }
  }

  /**
   * Pobiera wszystkie aktywne rezerwacje dla konkretnej narty
   */
  static async getActiveReservationsForSki(
    marka: string, 
    model: string, 
    dlugosc: string
  ): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const activeReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        const status = this.getReservationStatus(reservation);
        if (status === 'active') {
          activeReservations.push({
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
    
    return activeReservations;
  }

  /**
   * Pobiera wszystkie rezerwacje w danym okresie
   */
  static async getReservationsInPeriod(startDate: Date, endDate: Date): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const periodReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.isDateRangeOverlapping(
        new Date(reservation.od),
        new Date(reservation.do),
        startDate,
        endDate
      )) {
        periodReservations.push({
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
    
    return periodReservations;
  }

  /**
   * Sprawdza czy konkretna narta jest zarezerwowana w danym okresie (po nazwie)
   */
  static async isSkiReserved(
    marka: string, 
    model: string, 
    dlugosc: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<ReservationInfo[]> {
    const reservations = await this.loadReservations();
    const matchingReservations: ReservationInfo[] = [];
    
    for (const reservation of reservations) {
      if (this.matchesSki(reservation.sprzet, marka, model, dlugosc)) {
        if (this.isDateRangeOverlapping(
          new Date(reservation.od),
          new Date(reservation.do),
          startDate,
          endDate
        )) {
          matchingReservations.push({
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
    
    return matchingReservations;
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
    
    return {
      isAvailable: reservations.length === 0,
      reservations: reservations
    };
  }

  // Metody pomocnicze (przeniesione z ReservationService)

  private static matchesSki(sprzet: string, marka: string, model: string, dlugosc: string): boolean {
    if (!sprzet || !marka || !model || !dlugosc) {
      return false;
    }

    const sprzetLower = sprzet.toLowerCase();
    const markaLower = marka.toLowerCase();
    const modelLower = model.toLowerCase();
    const dlugoscStr = dlugosc.toString();

    return sprzetLower.includes(markaLower) && 
           sprzetLower.includes(modelLower) && 
           sprzetLower.includes(dlugoscStr);
  }

  private static isDateRangeOverlapping(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  private static differenceInDays(date1: Date, date2: Date): number {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  private static getReservationStatus(reservation: ReservationData): 'active' | 'completed' | 'cancelled' {
    const now = new Date();
    const endDate = new Date(reservation.do);
    
    if (endDate < now) {
      return 'completed';
    }
    
    return 'active';
  }
}
