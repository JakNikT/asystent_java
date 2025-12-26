// src/components/ConflictCheckerModal.tsx: Modal do sprawdzania konfliktów w kalendarzu sprzętu
// Otwierany po kliknięciu logo, pozwala wybrać okres i sprawdzić konflikty

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { EquipmentTimeline } from './EquipmentTimeline';
import { ReservationApiClient } from '../services/reservationApiClient';
import { detectConflicts } from '../utils/conflictDetector';
import type { ConflictAnalysisResult } from '../types/conflict.types';
import type { ReservationData } from '../services/reservationService';

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
    // Domyślnie: dzisiaj
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [dateTo, setDateTo] = useState<string>(() => {
    // Domyślnie: za 30 dni
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return future.toISOString().split('T')[0];
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
      console.log('ConflictCheckerModal: Pobieram dane dla okresu...');
      
      // Pobierz dane rezerwacji i wypożyczeń dla okresu
      const data = await ReservationApiClient.loadAvailabilityForPeriod(fromDate, toDate);
      
      console.log(`ConflictCheckerModal: Pobrano ${data.length} pozycji`);
      
      // Wykryj konflikty
      const result = detectConflicts(data, fromDate, toDate);
      
      console.log(`ConflictCheckerModal: Znaleziono ${result.lacznaLiczbaKonfliktow} konfliktów`);
      
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
  
  /**
   * Generuje przykładowe dane testowe z konfliktami
   */
  const generateTestData = (): ReservationData[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Przykładowe rezerwacje z konfliktami
    const testData: ReservationData[] = [];
    
    // Sprzęt 1: N123 - ma konflikt (0 dni przerwy)
    const kod1 = 'N123';
    const sprzet1 = 'Rossignol Experience 88 170cm';
    
    // Rezerwacja 1: 10-15 grudnia
    const res1Start = new Date(today);
    res1Start.setDate(res1Start.getDate() + 10);
    const res1End = new Date(res1Start);
    res1End.setDate(res1End.getDate() + 5);
    
    testData.push({
      kod: kod1,
      sprzet: sprzet1,
      klient: 'Jan Kowalski',
      od: res1Start.toISOString().split('T')[0],
      do: res1End.toISOString().split('T')[0],
      numer: 'R 001/12/2024',
      cena: '150',
      zaplacono: '150',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    // Rezerwacja 2: 15-20 grudnia (0 dni przerwy - KONFLIKT!)
    const res2Start = new Date(res1End); // Tego samego dnia co koniec poprzedniej
    const res2End = new Date(res2Start);
    res2End.setDate(res2End.getDate() + 5);
    
    testData.push({
      kod: kod1,
      sprzet: sprzet1,
      klient: 'Anna Nowak',
      od: res2Start.toISOString().split('T')[0],
      do: res2End.toISOString().split('T')[0],
      numer: 'R 002/12/2024',
      cena: '180',
      zaplacono: '180',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    // Sprzęt 2: B456 - ma konflikt (1 dzień przerwy)
    const kod2 = 'B456';
    const sprzet2 = 'Salomon X Pro 100 27.5';
    
    // Rezerwacja 3: 5-10 grudnia
    const res3Start = new Date(today);
    res3Start.setDate(res3Start.getDate() + 5);
    const res3End = new Date(res3Start);
    res3End.setDate(res3End.getDate() + 5);
    
    testData.push({
      kod: kod2,
      sprzet: sprzet2,
      klient: 'Piotr Wiśniewski',
      od: res3Start.toISOString().split('T')[0],
      do: res3End.toISOString().split('T')[0],
      numer: 'R 003/12/2024',
      cena: '120',
      zaplacono: '120',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    // Rezerwacja 4: 11-16 grudnia (1 dzień przerwy - KONFLIKT!)
    const res4Start = new Date(res3End);
    res4Start.setDate(res4Start.getDate() + 1); // Tylko 1 dzień przerwy
    const res4End = new Date(res4Start);
    res4End.setDate(res4End.getDate() + 5);
    
    testData.push({
      kod: kod2,
      sprzet: sprzet2,
      klient: 'Maria Zielińska',
      od: res4Start.toISOString().split('T')[0],
      do: res4End.toISOString().split('T')[0],
      numer: 'R 004/12/2024',
      cena: '130',
      zaplacono: '130',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    // Sprzęt 3: N789 - bez konfliktu (3 dni przerwy - OK)
    const kod3 = 'N789';
    const sprzet3 = 'Atomic Vantage 90 165cm';
    
    // Rezerwacja 5: 1-5 grudnia
    const res5Start = new Date(today);
    res5Start.setDate(res5Start.getDate() + 1);
    const res5End = new Date(res5Start);
    res5End.setDate(res5End.getDate() + 4);
    
    testData.push({
      kod: kod3,
      sprzet: sprzet3,
      klient: 'Tomasz Krawczyk',
      od: res5Start.toISOString().split('T')[0],
      do: res5End.toISOString().split('T')[0],
      numer: 'R 005/12/2024',
      cena: '140',
      zaplacono: '140',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    // Rezerwacja 6: 8-12 grudnia (3 dni przerwy - OK)
    const res6Start = new Date(res5End);
    res6Start.setDate(res6Start.getDate() + 3); // 3 dni przerwy
    const res6End = new Date(res6Start);
    res6End.setDate(res6End.getDate() + 4);
    
    testData.push({
      kod: kod3,
      sprzet: sprzet3,
      klient: 'Katarzyna Lewandowska',
      od: res6Start.toISOString().split('T')[0],
      do: res6End.toISOString().split('T')[0],
      numer: 'R 006/12/2024',
      cena: '150',
      zaplacono: '150',
      typumowy: 'STANDARD',
      source: 'reservation'
    });
    
    return testData;
  };
  
  /**
   * Obsługa przycisku testowego - wyświetla przykładowe dane
   */
  const handleTestData = () => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      setError('Nieprawidłowe daty');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    // Symuluj krótkie opóźnienie dla lepszego UX
    setTimeout(() => {
      try {
        console.log('ConflictCheckerModal: Generuję przykładowe dane testowe...');
        
        // Wygeneruj przykładowe dane
        const testData = generateTestData();
        
        console.log(`ConflictCheckerModal: Wygenerowano ${testData.length} przykładowych rezerwacji`);
        
        // Wykryj konflikty
        const result = detectConflicts(testData, fromDate, toDate);
        
        console.log(`ConflictCheckerModal: Znaleziono ${result.lacznaLiczbaKonfliktow} konfliktów w danych testowych`);
        
        setAnalysisResult(result);
      } catch (err) {
        console.error('ConflictCheckerModal: Błąd podczas generowania danych testowych:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas generowania danych testowych');
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms opóźnienie dla lepszego UX
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sprawdzanie konfliktów w kalendarzu sprzętu"
      description="Sprawdź czy sprzęty mają wystarczającą przerwę (min. 2 dni) między rezerwacjami"
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
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Data od</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                handleReset();
              }}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateTo">Data do</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                handleReset();
              }}
              disabled={isLoading}
            />
          </div>
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
          <Button
            onClick={handleTestData}
            disabled={isLoading || !dateFrom || !dateTo}
            variant="secondary"
            className="min-w-[150px]"
          >
            {isLoading ? 'Ładowanie...' : 'Test'}
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
                  Wszystkie sprzęty mają wystarczającą przerwę (≥ 2 dni) między rezerwacjami.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

