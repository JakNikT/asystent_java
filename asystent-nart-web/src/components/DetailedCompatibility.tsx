/**
 * Komponent wyświetlający szczegółowe informacje o dopasowaniu narty
 * console.log(src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji o dopasowaniu)
 */

import React, { useState } from 'react';
import type { SkiMatch, SearchCriteria } from '../types/ski.types';

interface DetailedCompatibilityProps {
  match: SkiMatch;
  userCriteria: SearchCriteria;
}

export const DetailedCompatibility: React.FC<DetailedCompatibilityProps> = ({ match, userCriteria }) => {
  console.log('src/components/DetailedCompatibility.tsx: Wyświetlanie szczegółowych informacji:', match);
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Proste kwadraciki dostępności (bez async)
  const generateAvailabilitySquares = () => {
    const ilosc = parseInt(String(match.ski.ILOSC) || '2');
    const squares = [];
    
    for (let i = 1; i <= ilosc; i++) {
      squares.push(
        <span 
          key={i} 
          className="inline-block w-5 h-5 bg-green-500 text-white text-xs font-bold rounded flex items-center justify-center"
          title={`Sztuka ${i} - dostępna`}
        >
          {i}
        </span>
      );
    }
    return squares;
  };

  const availabilitySquares = generateAvailabilitySquares();
  
  /**
   * Oblicza procent dopasowania dla konkretnego kryterium
   * WAŻNE: Nie stosujemy tutaj mnożnika kategorii - to jest obsługiwane w skiMatchingServiceV2.ts
   * Każdy parametr pokazuje swoje rzeczywiste dopasowanie niezależnie od kategorii
   */
  const getCriteriaScore = (criterion: string, status: string): number => {
    // Oblicz rzeczywisty procent dopasowania bez mnożników kategorii
    let score = 0;
    
    if (status.includes('✅ zielony')) {
      // Dla zielonych - 100% tylko dla idealnego dopasowania, 90-99% dla pozostałych
      switch (criterion) {
        case 'wzrost':
          score = calculateRangeScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX);
          break;
        case 'waga':
          score = calculateRangeScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX);
          break;
        case 'poziom':
          // Poziom jest dyskretny - zawsze 100% dla zielonych
          score = 100;
          break;
        case 'plec':
          // Płeć jest dyskretna - zawsze 100% dla zielonych
          score = 100;
          break;
        case 'przeznaczenie':
          // Przeznaczenie jest dyskretne - zawsze 100% dla zielonych
          score = 100;
          break;
        default:
          score = 100;
      }
    } else if (status.includes('🟡 żółty')) {
      // Dla żółtych oblicz procent na podstawie rzeczywistej odległości od zakresu
      switch (criterion) {
        case 'wzrost':
          score = calculateDistanceScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX);
          break;
        case 'waga':
          score = calculateDistanceScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX);
          break;
        case 'poziom':
          score = 70; // Poziom niżej (żółty)
          break;
        case 'plec':
          // Sprawdź czy poziom narty ma format M/D lub U (uniwersalny)
          if (match.ski.POZIOM.includes('/') || match.ski.POZIOM.includes('U')) {
            score = 100; // Poziom uniwersalny lub M/D pasuje do obu płci
          } else {
            score = 50; // Inna płeć ale akceptowalna (żółta)
          }
          break;
        default:
          score = 70;
      }
    } else if (status.includes('🔴 czerwony')) {
      // Dla czerwonych niskie procenty
      switch (criterion) {
        case 'wzrost':
          score = calculateToleranceScore(userCriteria.wzrost, match.ski.WZROST_MIN, match.ski.WZROST_MAX, 10);
          break;
        case 'waga':
          score = calculateToleranceScore(userCriteria.waga, match.ski.WAGA_MIN, match.ski.WAGA_MAX, 10);
          break;
        case 'poziom':
          score = 40; // 2 poziomy niżej (czerwony)
          break;
        case 'plec':
          // Sprawdź czy poziom narty ma format M/D lub U (uniwersalny)
          if (match.ski.POZIOM.includes('/') || match.ski.POZIOM.includes('U')) {
            score = 100; // Poziom uniwersalny lub M/D pasuje do obu płci
          } else {
            score = 20; // Niezgodna płeć (czerwony)
          }
          break;
        default:
          score = 30;
      }
    }
    
    return Math.round(score);
  };


  // USUNIĘTO: stara logika switch - zastąpiona nową logiką tablicową

  /**
   * Oblicza procent na podstawie funkcji gaussowskiej - im bliżej środka zakresu, tym lepszy wynik
   * NOWA LOGIKA: 100% tylko dla idealnego środka, 90-99% dla pozostałych zielonych
   */
  const calculateRangeScore = (userValue: number, min: number, max: number): number => {
    const center = (min + max) / 2;
    const range = max - min;
    
    // Jeśli zakres jest bardzo mały (≤2), zawsze 100%
    if (range <= 2) {
      return 100;
    }
    
    // Oblicz odległość od środka jako procent zakresu
    const distanceFromCenter = Math.abs(userValue - center);
    const distancePercent = (distanceFromCenter / (range / 2)) * 100; // 0-100%
    
    // Mapuj odległość na procenty: 0% odległości = 100%, 100% odległości = 90%
    const score = 100 - (distancePercent * 0.1); // 100% - 10% = 90% minimum
    
    return Math.round(Math.max(90, Math.min(100, score)));
  };

  /**
   * Oblicza procent na podstawie tolerancji dla czerwonych statusów (6-10 cm/kg poza zakresem)
   * Czerwone statusy powinny pokazywać niskie procenty: 20-50%
   */
  const calculateToleranceScore = (userValue: number, min: number, max: number, _tolerance: number): number => {
    // Oblicz odległość od zakresu (nie od środka!)
    let distanceFromRange = 0;
    
    if (userValue < min) {
      distanceFromRange = min - userValue; // Za mały
    } else if (userValue > max) {
      distanceFromRange = userValue - max; // Za duży
    } else {
      // W zakresie - użyj funkcji gaussowskiej
      return calculateRangeScore(userValue, min, max);
    }
    
    // Czerwony status = 6-10 cm/kg poza zakresem
    // Dla 6 cm: 50%, dla 10 cm: 20%
    // Im dalej od zakresu, tym niższy procent
    const score = Math.max(20, 50 - ((distanceFromRange - 5) / 5) * 30);
    return Math.round(score);
  };

  /**
   * Oblicza procent na podstawie rzeczywistej odległości od zakresu
   */
  const calculateDistanceScore = (userValue: number, min: number, max: number): number => {
    // Oblicz odległość od zakresu
    let distanceFromRange = 0;
    
    if (userValue < min) {
      distanceFromRange = min - userValue; // Za mały
    } else if (userValue > max) {
      distanceFromRange = userValue - max; // Za duży
    } else {
      // W zakresie - użyj funkcji gaussowskiej
      return calculateRangeScore(userValue, min, max);
    }
    
    // Im dalej od zakresu, tym niższy procent
    // Dla tolerancji 5: 1cm = 10% spadek, 2cm = 20% spadek, itd.
    const score = Math.max(25, 100 - distanceFromRange * 10);
    return Math.round(score);
  };



  /**
   * Sprawdza czy poziom narty pasuje do użytkownika (z obsługą U)
   */
  // const isLevelCompatible = (_userLevel: number, _userGender: string, _skiLevel: string): boolean => {
  //   // Jeśli poziom narty zawiera "U", pasuje do obu płci
  //   if (_skiLevel.includes('U')) return true;
  //   
  //   // Sprawdź czy płeć się zgadza
  //   const skiGender = _skiLevel.replace(/[^\d]/g, '').length > 0 ? 
  //     _skiLevel.replace(/[^\d]/g, '').slice(-1) : _skiLevel.slice(-1);
  //   
  //   if (skiGender === 'U') return true;
  //   if (skiGender === _userGender) return true;
  //   
  //   return false;
  // };

  /**
   * Określa kolor na podstawie statusu dopasowania (nie procentów)
   */
  const getScoreColor = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return 'text-green-400'; // W zakresie - zawsze zielony
    } else if (status.includes('🟡 żółty')) {
      return 'text-yellow-400'; // Poza zakresem ale akceptowalne
    } else if (status.includes('🔴 czerwony')) {
      return 'text-red-400'; // Znacznie poza zakresem
    }
    return 'text-gray-400'; // Domyślny
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania
   */
  const getScoreIcon = (status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅'; // W zakresie
    } else if (status.includes('🟡 żółty')) {
      return '⚠️'; // Poza zakresem ale akceptowalne
    } else if (status.includes('🔴 czerwony')) {
      return '❌'; // Znacznie poza zakresem
    }
    return '❓'; // Domyślny
  };

  /**
   * Określa ikonę na podstawie statusu dopasowania (dla przycisku)
   */
  const getShortStatus = (_criterion: string, status: string): string => {
    if (status.includes('✅ zielony')) {
      return '✅';
    } else if (status.includes('🟡 żółty')) {
      return '⚠️';
    } else if (status.includes('🔴 czerwony')) {
      return '❌';
    }
    return '❓';
  };

  /**
   * Formatuje wyświetlanie kryterium zgodnie z dokumentacją
   * Format: 🟢 P:4(4)→OK | 🟢 Pł:M(M)→OK
   * Dla wagi i wzrostu: konkretne odchylenie zamiast "→OK"
   */
  const formatCriterionDisplay = (criterion: any): string => {
    const icon = getScoreIcon(criterion.status);
    
    // Dla wagi, wzrostu i poziomu - pokaż konkretne odchylenie
    if (criterion.key === 'waga' || criterion.key === 'wzrost' || criterion.key === 'poziom') {
      if (criterion.status.includes('✅ zielony')) {
        const prefix = criterion.key === 'waga' ? 'W' : criterion.key === 'wzrost' ? 'Wz' : 'P';
        return `${icon} ${prefix}:${criterion.userValue}(${criterion.skiValue})→OK`;
      } else {
        // Wyciągnij odchylenie ze statusu (nowy format z strzałkami)
        const match = criterion.status.match(/(\d+)([↑↓])/);
        if (match) {
          const odchylenie = match[1];
          const kierunek = match[2];
          const prefix = criterion.key === 'waga' ? 'W' : criterion.key === 'wzrost' ? 'Wz' : 'P';
          return `${icon} ${prefix}:${criterion.userValue}(${criterion.skiValue})→${odchylenie}${kierunek}`;
        }
        // Fallback dla starych komunikatów bez strzałek
        const oldMatch = criterion.status.match(/o (\d+)/);
        if (oldMatch) {
          const odchylenie = oldMatch[1];
          const kierunek = criterion.status.includes('za duża') || criterion.status.includes('za duży') || criterion.status.includes('za wysoki') ? '↑' : '↓';
          const prefix = criterion.key === 'waga' ? 'W' : criterion.key === 'wzrost' ? 'Wz' : 'P';
          return `${icon} ${prefix}:${criterion.userValue}(${criterion.skiValue})→${odchylenie}${kierunek}`;
        }
        // Jeśli nie ma odchylenia w statusie, pokaż "NIE"
        const prefix = criterion.key === 'waga' ? 'W' : criterion.key === 'wzrost' ? 'Wz' : 'P';
        return `${icon} ${prefix}:${criterion.userValue}(${criterion.skiValue})→NIE`;
      }
    }
    
    // Dla pozostałych kryteriów - standardowy format
    const statusText = criterion.status.includes('✅ zielony') ? 'OK' : 
                      criterion.status.includes('🟡 żółty') ? 'OK' : 'NIE';
    
    switch (criterion.key) {
      case 'poziom':
        return `${icon} P:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
      case 'plec':
        return `${icon} Pł:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
      default:
        return `${icon} ${criterion.label}:${criterion.userValue}(${criterion.skiValue})→${statusText}`;
    }
  };

  /**
   * Zwraca ogólną kompatybilność z match.compatibility
   * NOWY SYSTEM: match.compatibility zawiera wartość zmapowaną na przedział kategorii:
   * - Idealne: 90-100%
   * - Alternatywy/Inna płeć: 70-89%
   * - Poziom za nisko: 50-69%
   * - Na siłę: 30-49%
   * 
   * Wartość jest obliczana w skiMatchingServiceV2.ts poprzez:
   * 1. Obliczenie bazowego wyniku 0-100 (wagi kryteriów + precyzja)
   * 2. Mapowanie na przedział kategorii (mapToCategory)
   */
  const getOverallCompatibility = (): number => {
    // Użyj match.compatibility obliczonego i zmapowanego w skiMatchingServiceV2.ts
    return match.compatibility || 0;
  };

  /**
   * Zwraca etykietę kategorii w polskiej wersji
   */
  const getCategoryLabel = (kategoria?: string): string => {
    switch (kategoria) {
      case 'idealne':
        return 'Idealne';
      case 'alternatywy':
        return 'Alternatywy';
      case 'poziom_za_nisko':
        return 'Poziom za nisko';
      case 'inna_plec':
        return 'Inna płeć';
      case 'na_sile':
        return 'Na siłę';
      default:
        return 'Nieznana';
    }
  };

  const criteria = [
    { 
      key: 'poziom', 
      label: 'Poziom', 
      status: match.dopasowanie.poziom,
      skiValue: match.ski.POZIOM,
      userValue: `${userCriteria.poziom}${userCriteria.plec}`
    },
    { 
      key: 'plec', 
      label: 'Płeć', 
      status: match.dopasowanie.plec,
      skiValue: match.ski.PLEC,
      userValue: userCriteria.plec
    },
    { 
      key: 'waga', 
      label: 'Waga', 
      status: match.dopasowanie.waga,
      skiValue: `${match.ski.WAGA_MIN}-${match.ski.WAGA_MAX}kg`,
      userValue: `${userCriteria.waga}kg`
    },
    { 
      key: 'wzrost', 
      label: 'Wzrost', 
      status: match.dopasowanie.wzrost,
      skiValue: `${match.ski.WZROST_MIN}-${match.ski.WZROST_MAX}cm`,
      userValue: `${userCriteria.wzrost}cm`
    },
  ];

  // Pobierz ogólną kompatybilność obliczoną przez serwis
  const averageCompatibility = getOverallCompatibility();

  return (
    <div className="mt-2">
      {/* Przycisk rozwijania z parametrami */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 bg-black/20 rounded-lg border border-white/10 hover:bg-black/30 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          {/* Parametry dopasowania */}
          <div className="flex flex-wrap gap-1">
            {criteria.map((criterion) => {
              const icon = getShortStatus(criterion.key, criterion.status);
              return (
                <span
                  key={criterion.key}
                  className="px-1 py-0.5 rounded text-xs font-medium bg-white/10 text-white"
                  title={criterion.status}
                >
                  {icon}{criterion.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Kwadraciki dostępności po prawej stronie - w dwóch kolumnach */}
          <div className="flex flex-wrap w-16 gap-x-3 gap-y-2" title="Dostępność sztuk">
            {availabilitySquares}
          </div>
          <span className={`text-lg font-bold ${
            averageCompatibility >= 90 ? 'text-green-400' :
            averageCompatibility >= 70 ? 'text-yellow-400' :
            averageCompatibility >= 50 ? 'text-orange-400' : 'text-red-400'
          }`}>
            {averageCompatibility}%
          </span>
          <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Rozwijane szczegóły */}
      {isExpanded && (
        <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/10 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            {criteria.map((criterion) => {
              const score = getCriteriaScore(criterion.key, criterion.status);
              const colorClass = getScoreColor(criterion.status);
              
              return (
                <div key={criterion.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{formatCriterionDisplay(criterion)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-16 bg-gray-700 rounded-full h-2 border border-gray-600">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          criterion.status.includes('✅ zielony') ? 'bg-green-400 shadow-green-400/50' : 
                          criterion.status.includes('🟡 żółty') ? 'bg-yellow-400 shadow-yellow-400/50' : 
                          criterion.status.includes('🔴 czerwony') ? 'bg-red-400 shadow-red-400/50' : 'bg-gray-400'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold ${colorClass}`}>
                      {score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <div className="flex justify-between items-center text-xs text-white/70">
                      <span>Kategoria: {getCategoryLabel(match.kategoria)}</span>
                      <div className="flex items-center">
                        <span className="mr-2">Dostępność:</span>
                        <div className="flex flex-wrap w-16 gap-x-3 gap-y-2">
                          {availabilitySquares}
                        </div>
                      </div>
                    </div>
                  </div>
        </div>
      )}
    </div>
  );
};
