/**
 * Klient API dla komunikacji z serwerem rezerwacji
 * Zastępuje bezpośredni odczyt CSV przez HTTP API
 */

import { createLogger } from '../utils/logger';
import { toastService } from '../hooks/useToast';
import { parseApiError, handleApiError } from '../utils/apiErrorHandler';
import type { ReservationData, ReservationInfo, AvailabilityInfo } from '../types/reservation.types';
import { AuthService } from './authService';
import { DEFAULT_RENTAL_DAYS, SERVICE_BUFFER_DAYS, calendarDayNumber, dayGap } from '../utils/availability';
import { dateToISO } from '../utils/dateParts';

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
   * Czyści cache, wymuszając pobranie świeżych danych przy następnym zapytaniu
   */
  static clearCache(): void {
    this.cache = [];
    this.cacheRentals = [];
    this.lastFetch = 0;
    this.lastFetchRentals = 0;
    logger.info('Cache wyczyszczony');
  }

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
      const response = await AuthService.fetch(`${API_BASE_URL}/reservations`);
      
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
      const response = await AuthService.fetch(`${API_BASE_URL}/wypozyczenia/aktualne`);
      
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
  const fromTimestamp = dateFrom.getTime();
  const toTimestamp = dateTo.getTime();

  logger.debug(`Pobieram dostępność dla okresu ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`);

  // Błędy (HTTP i sieciowe) są rzucane do wywołującego - UI musi odróżnić awarię od braku rezerwacji
  const response = await AuthService.fetch(`${API_BASE_URL}/dostepnosc/okres?from=${fromTimestamp}&to=${toTimestamp}`);

  if (!response.ok) {
    const errorMessage = await parseApiError(response);
    throw new Error(errorMessage);
  }

  interface PeriodResponseItem {
    kod?: string;
    sprzet?: string;
    klient?: string;
    typumowy?: string;
    parent_group_id?: number | null;
  }

  const data = await response.json() as {
    reservations?: Array<PeriodResponseItem & { od?: string; do?: string }>;
    rentals?: Array<PeriodResponseItem & { od?: number | string; do?: number | string }>;
  };

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
    typumowy: r.typumowy || 'STANDARD',
    parent_group_id: r.parent_group_id !== undefined ? r.parent_group_id : null,
    source: 'reservation' as const
  }));

  const rentals = (data.rentals || []).map((r) => ({
    kod: r.kod || '',
    sprzet: r.sprzet || '',
    klient: r.klient || '',
    // Daty wypożyczeń jako lokalne dni kalendarzowe (toISOString dawało datę UTC, czasem o dzień wcześniejszą)
    od: typeof r.od === 'number' ? dateToISO(new Date(r.od)) : r.od || '',
    // Jeśli wypożyczenie jest aktywne (do = 0), ustaw domyślną datę końcową
    // Zapobiega to tworzeniu Invalid Date i błędnym kolorom dostępności
    do: typeof r.do === 'number' && r.do > 0
      ? dateToISO(new Date(r.do))
      : dateToISO(new Date(Date.now() + DEFAULT_RENTAL_DAYS * 86400000)),
    cena: '0',
    zaplacono: '0',
    numer: '',
    typumowy: r.typumowy || 'STANDARD',
    parent_group_id: r.parent_group_id !== undefined ? r.parent_group_id : null,
    source: 'rental' as const
  }));

  const allData = [...reservations, ...rentals];
  logger.info(`Pobrano ${allData.length} pozycji (${reservations.length} rezerwacji + ${rentals.length} wypożyczeń)`);

  return allData;
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
      const response = await AuthService.fetch(`${API_BASE_URL}/wypozyczenia/przeszle`);
      
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

      // Walidacja dat - pomiń rezerwacje z niepoprawnymi datami
      if (isNaN(resStart.getTime()) || isNaN(resEnd.getTime())) {
        logger.warn(`Niepoprawne daty dla rezerwacji ${reservation.kod}: od="${reservation.od}", do="${reservation.do}"`);
        continue;
      }

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
      
      // Porównanie na dniach kalendarzowych, nie na timestampach (rezerwacja od 11:00 w ostatnim dniu
      // użytkownika też jest konfliktem, mimo że userDateTo to północ)
      const overlaps = calendarDayNumber(resStart) <= calendarDayNumber(userDateTo) &&
        calendarDayNumber(resEnd) >= calendarDayNumber(userDateFrom);

      if (overlaps) {
        hasDirectConflict = true;
        allReservations.push(reservationInfo);
      }
      // Sprawdź ŻÓŁTY (bufor serwisowy - za mało dni na przygotowanie sprzętu)
      else {
        const gapBefore = dayGap(resEnd, userDateFrom);
        const gapAfter = dayGap(userDateTo, resStart);

        const isBeforeWarning = gapBefore >= 1 && gapBefore <= SERVICE_BUFFER_DAYS;
        const isAfterWarning = gapAfter >= 1 && gapAfter <= SERVICE_BUFFER_DAYS;

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

  private static getReservationStatus(reservation: ReservationData): 'active' | 'completed' | 'cancelled' {
    const now = new Date();
    const endDate = new Date(reservation.do);
    
    if (endDate < now) {
      return 'completed';
    }
    
    return 'active';
  }
}
