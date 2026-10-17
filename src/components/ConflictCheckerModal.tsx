// src/components/ConflictCheckerModal.tsx: Modal do sprawdzania konfliktów w kalendarzu sprzętu
// Otwierany po kliknięciu logo, pozwala wybrać okres i sprawdzić konflikty

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { EquipmentTimeline } from './EquipmentTimeline';
import { ReservationApiClient } from '../services/reservationApiClient';
import { detectConflicts } from '../utils/conflictDetector';
import type { ConflictAnalysisResult } from '../types/conflict.types';
import { DatePickerButton } from './DatePickerButton';
import { SERVICE_BUFFER_DAYS } from '../utils/availability';
import { dateToISO } from '../utils/dateParts';
import { createLogger } from '../utils/logger';

const logger = createLogger('ConflictCheckerModal');

interface ConflictCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictCheckerModal: React.FC<ConflictCheckerModalProps> = ({
  isOpen,
  onClose
}) => {
  // Stan formularza
  const [dateFrom, setDateFrom] = useState<string>(() => {
    // Domyślnie: dzisiaj (lokalny dzień kalendarzowy, nie UTC)
    return dateToISO(new Date());
  });
  
  const [dateTo, setDateTo] = useState<string>(() => {
    // Domyślnie: za 30 dni
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return dateToISO(future);
  });
  
  // Stan analizy
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ConflictAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // src/components/ConflictCheckerModal.tsx: Stan aktywnej zakładki (timeline lub lista)
  const [activeView, setActiveView] = useState<'timeline' | 'list'>('timeline');
  
  /**
   * Obsługa sprawdzania konfliktów
   */
  const handleCheckConflicts = async () => {
    // Walidacja dat
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      setError('Nieprawidłowe daty');
      return;
    }
    
    if (fromDate > toDate) {
      setError('Data rozpoczęcia musi być wcześniejsza niż data zakończenia');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      logger.debug('ConflictCheckerModal: Pobieram dane dla okresu...');
      
      // Pobierz dane rezerwacji i wypożyczeń dla okresu
      const data = await ReservationApiClient.loadAvailabilityForPeriod(fromDate, toDate);
      
      logger.debug(`ConflictCheckerModal: Pobrano ${data.length} pozycji`);
      
      // Wykryj konflikty
      const result = detectConflicts(data, fromDate, toDate);
      
      logger.debug(`ConflictCheckerModal: Znaleziono ${result.lacznaLiczbaKonfliktow} konfliktów`);
      
      setAnalysisResult(result);
    } catch (err) {
      console.error('ConflictCheckerModal: Błąd podczas sprawdzania konfliktów:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas sprawdzania konfliktów');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Reset formularza i wyników
   */
  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sprawdzanie konfliktów w kalendarzu sprzętu"
      description={`Sprawdź czy sprzęty mają wystarczającą przerwę między rezerwacjami (Bufor serwisowy: ${SERVICE_BUFFER_DAYS} dni)`}
      className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto bg-brand-dark/50 backdrop-blur-sm border-white/10"
      footer={
        <div className="flex gap-2">
          {analysisResult && (
            <Button variant="outline" onClick={handleReset}>
              Nowa analiza
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Formularz wyboru dat */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePickerButton
            label="Data od"
            icon="📅"
            value={dateFrom}
            onChange={(date) => {
              setDateFrom(date);
              handleReset();
            }}
            disabled={isLoading}
            maxDate={dateTo || undefined}
          />
          
          <DatePickerButton
            label="Data do"
            icon="📅"
            value={dateTo}
            onChange={(date) => {
              setDateTo(date);
              handleReset();
            }}
            disabled={isLoading}
            minDate={dateFrom || undefined}
            quickFrom={dateFrom || undefined}
          />
        </div>
        
        {/* Przyciski sprawdzania */}
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleCheckConflicts}
            disabled={isLoading || !dateFrom || !dateTo}
            className="min-w-[200px]"
          >
            {isLoading ? 'Sprawdzanie...' : 'Sprawdź konflikty'}
          </Button>
        </div>
        
        {/* Błąd */}
        {error && (
          <div className="p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-[20px] text-red-300 text-sm shadow-lg shadow-black/20">
            {error}
          </div>
        )}
        
        {/* Wyniki analizy */}
        {analysisResult && (
          <div className="space-y-4">
            {/* Statystyki */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-brand-dark/40 backdrop-blur-sm rounded-[20px] border border-white/10 shadow-lg shadow-black/20">
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Sprzęty z konfliktami</div>
                <div className="text-2xl font-bold text-white">
                  {analysisResult.sprzetyZKonfliktami.length} / {analysisResult.lacznaLiczbaSprzetow}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Łączna liczba konfliktów</div>
                <div className="text-2xl font-bold text-red-400">
                  {analysisResult.lacznaLiczbaKonfliktow}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground text-white/70">Okres analizy</div>
                <div className="text-sm text-white/90">
                  {analysisResult.okresOd.toLocaleDateString('pl-PL')} - {analysisResult.okresDo.toLocaleDateString('pl-PL')}
                </div>
              </div>
            </div>
            
            {/* Zakładki - Timeline i Lista konfliktów */}
            {analysisResult.sprzetyZKonfliktami.length > 0 && (
              <div>
                {/* src/components/ConflictCheckerModal.tsx: Pasek zakładek */}
                <div className="flex gap-2 border-b border-white/10 mb-4">
                  <button
                    onClick={() => setActiveView('timeline')}
                    className={`px-6 py-3 font-semibold text-sm transition-all rounded-t-lg ${
                      activeView === 'timeline'
                        ? 'bg-brand-dark/60 text-white border-b-2 border-blue-400 shadow-lg'
                        : 'bg-transparent text-white/60 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    📊 Wizualizacja timeline
                  </button>
                  <button
                    onClick={() => setActiveView('list')}
                    className={`px-6 py-3 font-semibold text-sm transition-all rounded-t-lg ${
                      activeView === 'list'
                        ? 'bg-brand-dark/60 text-white border-b-2 border-blue-400 shadow-lg'
                        : 'bg-transparent text-white/60 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    📋 Szczegółowa lista
                  </button>
                </div>
                
                {/* src/components/ConflictCheckerModal.tsx: Zawartość zakładek */}
                {activeView === 'timeline' ? (
                  <div>
                    <EquipmentTimeline
                      conflictInfo={analysisResult.sprzetyZKonfliktami}
                      dateFrom={analysisResult.okresOd}
                      dateTo={analysisResult.okresDo}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analysisResult.sprzetyZKonfliktami.map((info) => (
                      <div
                        key={info.kod}
                        className="p-4 bg-brand-dark/40 backdrop-blur-sm rounded-[20px] border border-white/10 shadow-lg shadow-black/20"
                      >
                        <div className="font-semibold text-lg mb-2 text-white">
                          {info.sprzet} ({info.kod})
                        </div>
                        <div className="space-y-2">
                          {info.konflikty.map((conflict, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg"
                            >
                              <div className="text-sm text-red-300 mb-1">
                                Konflikt #{idx + 1} - Przerwa: {conflict.przerwaDni} dzień{conflict.przerwaDni !== 1 ? 'i' : ''}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <div className="font-medium text-white">Rezerwacja 1:</div>
                                  <div className="text-white/90">{conflict.rezerwacja1.klient}</div>
                                  <div className="text-white/70">
                                    {conflict.rezerwacja1.od.toLocaleDateString('pl-PL')} - {conflict.rezerwacja1.do.toLocaleDateString('pl-PL')}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-white">Rezerwacja 2:</div>
                                  <div className="text-white/90">{conflict.rezerwacja2.klient}</div>
                                  <div className="text-white/70">
                                    {conflict.rezerwacja2.od.toLocaleDateString('pl-PL')} - {conflict.rezerwacja2.do.toLocaleDateString('pl-PL')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Komunikat o braku konfliktów */}
            {analysisResult.sprzetyZKonfliktami.length === 0 && (
              <div className="p-8 text-center bg-brand-dark/40 backdrop-blur-sm rounded-[20px] border border-white/10 shadow-lg shadow-black/20">
                <p className="text-lg font-semibold mb-2 text-green-400">✅ Brak konfliktów!</p>
                <p className="text-white/70">
                  Wszystkie sprzęty mają przerwę dłuższą niż bufor serwisowy ({SERVICE_BUFFER_DAYS} dni) między rezerwacjami.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

