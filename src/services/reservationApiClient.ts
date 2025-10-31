/**
 * Klient API dla komunikacji z serwerem rezerwacji
 * Zastępuje bezpośredni odczyt CSV przez HTTP API
 */

import type { ReservationData, ReservationInfo, AvailabilityInfo } from './reservationService';

const API_BASE_URL = '/api';

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
      console.log('ReservationApiClient: Używam danych z cache');
      return this.cache;
    }

    try {
      console.log('ReservationApiClient: Pobieram rezerwacje z serwera...');
      const response = await fetch(`${API_BASE_URL}/reservations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reservations = await response.json();
      this.cache = reservations;
      this.lastFetch = now;
      
      console.log(`ReservationApiClient: Pobrano ${reservations.length} rezerwacji`);
      return reservations;
    } catch (error) {
      console.error('ReservationApiClient: Błąd pobierania rezerwacji:', error);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cache.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      console.log('ReservationApiClient: Używam cache mimo błędu');
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
      console.log('ReservationApiClient: Używam danych z cache (wypożyczenia)');
      return this.cacheRentals;
    }

    try {
      console.log('ReservationApiClient: Pobieram wypożyczenia z serwera...');
      const response = await fetch(`${API_BASE_URL}/wypozyczenia/aktualne`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rentals = await response.json();
      this.cacheRentals = rentals.map((r: ReservationData) => ({ ...r, source: 'rental' as const }));
      this.lastFetchRentals = now;
      
      console.log(`ReservationApiClient: Pobrano ${rentals.length} wypożyczeń`);
      return this.cacheRentals;
    } catch (error) {
      console.error('ReservationApiClient: Błąd pobierania wypożyczeń:', error);
      
      // Jeśli cache jest pusty, zwróć pustą tablicę
      if (this.cacheRentals.length === 0) {
        return [];
      }
      
      // W przeciwnym razie użyj cache (może być nieaktualny)
      console.log('ReservationApiClient: Używam cache mimo błędu (wypożyczenia)');
      return this.cacheRentals;
    }
  }

  /**
   * Pobiera wszystkie dane (rezerwacje + wypożyczenia)
   */
  static async loadAll(): Promise<ReservationData[]> {
    try {
      console.log('ReservationApiClient: Pobieram wszystkie dane (rezerwacje + wypożyczenia)...');
      
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
      console.log(`ReservationApiClient: Pobrano łącznie ${allData.length} pozycji (${reservationsWithSource.length} rezerwacji + ${rentals.length} wypożyczeń)`);
      
      return allData;
    } catch (error) {
      console.error('ReservationApiClient: Błąd pobierania wszystkich danych:', error);
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
    
    console.log(`ReservationApiClient: Pobieram dostępność dla okresu ${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`);
    
    const response = await fetch(`${API_BASE_URL}/dostepnosc/okres?from=${fromTimestamp}&to=${toTimestamp}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
      typumowy: 'STANDARD',
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
      typumowy: 'STANDARD',
      source: 'rental' as const
    }));
    
    const allData = [...reservations, ...rentals];
    console.log(`ReservationApiClient: Pobrano ${allData.length} pozycji (${reservations.length} rezerwacji + ${rentals.length} wypożyczeń)`);
    
    return allData;
  } catch (error) {
    console.error('ReservationApiClient: Błąd pobierania dostępności dla okresu:', error);
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
      console.log('ReservationApiClient: Pobieram przeszłe wypożyczenia z serwera...');
      const response = await fetch(`${API_BASE_URL}/wypozyczenia/przeszle`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const pastRentals = await response.json();
      console.log(`ReservationApiClient: Pobrano ${pastRentals.length} przeszłych wypożyczeń`);
      
      // Dodaj pole source='rental' do każdego wypożyczenia
      return pastRentals.map((r: ReservationData) => ({ ...r, source: 'rental' as const }));
    } catch (error) {
      console.error('ReservationApiClient: Błąd pobierania przeszłych wypożyczeń:', error);
      return [];
    }
  }

  /**
   * Pobiera przeszłe rezerwacje (data rozpoczęcia <= dzisiaj)
   */
  static async loadPastReservations(): Promise<ReservationData[]> {
    try {
      console.log('ReservationApiClient: Filtuję przeszłe rezerwacje...');
      const allReservations = await this.loadReservations();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset do początku dnia
      
      const pastReservations = allReservations.filter(reservation => {
        const startDate = new Date(reservation.od);
        return startDate <= today;
      });
      
      console.log(`ReservationApiClient: Znaleziono ${pastReservations.length} przeszłych rezerwacji`);
      
      // Dodaj pole source='reservation'
      return pastReservations.map(r => ({ 
        ...r, 
        source: (r.source || 'reservation') as 'reservation' | 'rental'
      }));
    } catch (error) {
      console.error('ReservationApiClient: Błąd filtrowania przeszłych rezerwacji:', error);
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
    console.log('🔍 Sprawdzam rezerwacje i wypożyczenia dla okresu użytkownika (zoptymalizowane)');
    console.log(`ReservationApiClient.getSkiAvailabilityStatus: Pobrano ${allData.length} pozycji (tylko istotne dla okresu)`);
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
      console.log('ReservationApiClient: Tworzenie nowej rezerwacji:', reservationData);
      
      const response = await fetch(`${API_BASE_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache aby wymusić odświeżenie danych
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja utworzona pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd tworzenia rezerwacji:', error);
      return false;
    }
  }

  /**
   * Aktualizuje istniejącą rezerwację
   */
  static async updateReservation(id: string, updates: Partial<ReservationData>): Promise<boolean> {
    try {
      console.log('ReservationApiClient: Aktualizacja rezerwacji:', id, updates);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja zaktualizowana pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd aktualizacji rezerwacji:', error);
      return false;
    }
  }

  /**
   * Usuwa rezerwację
   */
  static async deleteReservation(id: string): Promise<boolean> {
    try {
      console.log('ReservationApiClient: Usuwanie rezerwacji:', id);
      
      const response = await fetch(`${API_BASE_URL}/reservations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Wyczyść cache
      this.cache = [];
      this.lastFetch = 0;
      
      console.log('ReservationApiClient: Rezerwacja usunięta pomyślnie');
      return true;
    } catch (error) {
      console.error('ReservationApiClient: Błąd usuwania rezerwacji:', error);
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
