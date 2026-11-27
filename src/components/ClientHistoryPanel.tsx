/**
 * Panel boczny z pełną historią wypożyczeń klienta (wszystkie umowy wraz ze sprzętem).
 * Nie zasłania widoku Przeglądaj - pozwala sprawdzać dostępność i historię jednocześnie.
 */

import React, { useEffect, useState } from 'react';
import { HistoryService, SOURCE_LABELS } from '../services/historyService';
import type { ClientGroup, HistoryDateRange, HistoryEquipmentData, HistorySource } from '../services/historyService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ClientHistoryPanel');

interface ClientHistoryPanelProps {
  client: ClientGroup;
  onClose: () => void;
}

interface RentalWithEquipment {
  rental: HistoryDateRange;
  equipment: HistoryEquipmentData[];
}

export const ClientHistoryPanel: React.FC<ClientHistoryPanelProps> = ({ client, onClose }) => {
  const [rentals, setRentals] = useState<RentalWithEquipment[]>([]);
  const [unavailableSources, setUnavailableSources] = useState<HistorySource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      setRentals([]);
      try {
        const { dates, unavailableSources: unavailable } = await HistoryService.getClientDates(client);
        // Sprzęt wszystkich umów równolegle; getClientEquipment przy błędzie zwraca pustą listę
        const withEquipment = await Promise.all(
          dates.map(async (rental) => ({ rental, equipment: await HistoryService.getClientEquipment(rental) }))
        );
        if (cancelled) return;
        setRentals(withEquipment);
        setUnavailableSources(unavailable);
        if (unavailable.length === client.sources.length) {
          setError('Żadne źródło historii nie jest dostępne. Sprawdź połączenie z bazami danych.');
        }
      } catch (err) {
        logger.error('Błąd pobierania historii klienta:', err);
        if (!cancelled) setError('Błąd pobierania historii klienta. Sprawdź połączenie z bazą danych.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] z-40 bg-[#0f2744] border-l-2 border-[#2C699F] shadow-2xl flex flex-col">
      <div className="flex items-start justify-between gap-2 p-4 border-b border-white/10">
        <div className="min-w-0">
          <h2 className="text-white font-bold text-lg truncate">📜 {client.pelna_nazwa}</h2>
          {client.telefon && <div className="text-[#A6C2EF] text-sm">📞 {client.telefon}</div>}
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-[#194576] hover:bg-[#2C699F] text-white rounded-lg font-bold transition-all"
          title="Zamknij historię"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <div className="bg-red-600 text-white p-3 rounded-lg">{error}</div>}

        {!error && unavailableSources.length > 0 && (
          <div className="bg-yellow-600/30 border border-yellow-500/50 text-yellow-100 p-3 rounded-lg text-sm">
            Brak odpowiedzi ze źródła: {unavailableSources.map((s) => SOURCE_LABELS[s]).join(', ')}. Historia może być niepełna.
          </div>
        )}

        {isLoading && <div className="text-white text-center py-4">Pobieranie historii...</div>}

        {!isLoading && !error && rentals.length === 0 && (
          <div className="text-[#A6C2EF] text-center py-4">Brak wypożyczeń dla tego klienta</div>
        )}

        {rentals.map(({ rental, equipment }, index) => (
          <section
            key={`${rental.source}-${rental.client_id}-${rental.dokument_id ?? ''}-${rental.od}-${rental.do}-${index}`}
            className="bg-[#194576]/60 rounded-lg border border-white/10 p-3"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-white font-semibold text-sm">
                {rental.numer ? `${rental.numer}: ` : ''}
                {rental.od} – {rental.do}
                {rental.sezon ? ` (${rental.sezon})` : ''}
              </div>
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-[#A6C2EF] whitespace-nowrap">
                {SOURCE_LABELS[rental.source]}
              </span>
            </div>

            {rental.uwagi && <div className="text-[#A6C2EF] text-xs mb-2 whitespace-pre-wrap">📝 {rental.uwagi}</div>}

            {equipment.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2C699F] text-white">
                    <th className="py-1 pr-2 font-semibold">Kod</th>
                    <th className="py-1 pr-2 font-semibold">Sprzęt</th>
                    <th className="py-1 pr-2 font-semibold">Dł.</th>
                    <th className="py-1 pr-2 font-semibold">Dni</th>
                    <th className="py-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item, itemIndex) => (
                    <tr key={`${item.kod}-${itemIndex}`} className="border-b border-white/10 text-white">
                      <td className="py-1 pr-2">{item.kod || '-'}</td>
                      <td className="py-1 pr-2">{item.sprzet || '-'}</td>
                      <td className="py-1 pr-2 whitespace-nowrap">{item.dlugosc ? `${item.dlugosc} cm` : '-'}</td>
                      <td className="py-1 pr-2">{item.liczba_dni || '-'}</td>
                      <td className="py-1">{item.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[#A6C2EF] text-xs">Brak danych o sprzęcie</div>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
};
