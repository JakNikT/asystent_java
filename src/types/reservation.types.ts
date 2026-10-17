// src/types/reservation.types.ts: Typy rezerwacji, wypożyczeń i dostępności sprzętu

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
  status?: number;      // 0 = aktywna rezerwacja, != 0 = wydana/nieaktywna (z FireSnow)
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

// Typy systemu 3-kolorowego dostępności
export type AvailabilityStatus = 'available' | 'warning' | 'reserved';

export interface AvailabilityInfo {
  status: AvailabilityStatus;
  color: 'green' | 'yellow' | 'red';
  emoji: '🟢' | '🟡' | '🔴';
  message: string;
  reservations: ReservationInfo[];
}
